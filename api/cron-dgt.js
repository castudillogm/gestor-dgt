import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendBatchAlertEmail } from './utils/mailer.js';
import { obtenerIncidenciasReales } from './utils/robot-dgt.js';
import geoMap from './utils/geo-map.js';
import dotenv from 'dotenv';

dotenv.config();

// Aumentar el límite de tiempo en Vercel
export const maxDuration = 60;

// Inicializar Firebase Admin
function getDb() {
  if (getApps().length === 0) {
    try {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    } catch (error) {
      console.error('Firebase initialization error', error);
    }
  }
  return getFirestore();
}

export default async function handler(request, response) {
  const authHeader = request.headers.authorization;
  const querySecret = request.query?.secret;
  
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}` && querySecret !== process.env.CRON_SECRET) {
    return response.status(401).json({ error: 'No autorizado' });
  }

  try {
    const db = getDb();
    console.log('Iniciando sincronización BATCH con el Robot de Consulta DGT...');
    
    // 1. Ejecutar el robot
    const dgtData = await obtenerIncidenciasReales();
    
    if (dgtData === null) {
      console.log('Aviso: La API de la DGT falló o dio timeout.');
      return response.status(200).json({ success: true, message: 'La API de la DGT está caída o lenta.' });
    }

    if (dgtData.length === 0) {
      return response.status(200).json({ success: true, message: 'Sin incidencias activas en España' });
    }

    // 2. Precargar las incidencias ya procesadas en UNA SOLA consulta (evitar Timeout)
    const processedSnapshot = await db.collection('processed_incidents').get();
    const processedIds = new Set();
    processedSnapshot.forEach(doc => processedIds.add(doc.id));

    // Precargar las planificadas para el cross-reference
    const plannedSnapshot = await db.collection('planned_restrictions').get();
    const planificadas = [];
    plannedSnapshot.forEach(doc => planificadas.push(doc.data()));

    // 3. Filtrar cuáles son realmente NUEVAS y relevantes (Pesados o Planificadas)
    const nuevasRelevantes = [];
    const todosLosNuevosIds = [];

    for (const incidencia of dgtData) {
      if (!processedIds.has(incidencia.id_incidencia)) {
        todosLosNuevosIds.push(incidencia);
        
        // Determinar si es relevante
        const isPlanificada = planificadas.some(plan => {
          if (plan.carretera !== incidencia.carretera) return false;
          const cleanMuni = (plan.municipio_inicio || '').split('(')[0].trim().toLowerCase();
          const mappedProvincia = geoMap[cleanMuni];
          const incProv = (incidencia.provincia || '').toLowerCase();
          const incCiudad = (incidencia.ciudad || '').toLowerCase();
          
          if (mappedProvincia) {
            return incProv.includes(mappedProvincia) || mappedProvincia.includes(incProv);
          } else {
            if (!cleanMuni || cleanMuni === 'n/a') return false;
            return incCiudad.includes(cleanMuni) || cleanMuni.includes(incCiudad);
          }
        });

        const desc = (incidencia.descripcion || '').toLowerCase();
        const tipo = (incidencia.tipo || '').toLowerCase();
        let isPesados = incidencia.isPesadosOriginal || desc.includes('pesados') || desc.includes('camion') || 
                          desc.includes('camión') || desc.includes('mercanc') || desc.includes('adr');
        
        if (isPlanificada) isPesados = true;

        if (isPesados || isPlanificada) {
           incidencia.isPesados = isPesados;
           incidencia.isPlanificada = isPlanificada;
           nuevasRelevantes.push(incidencia);
        }
      }
    }

    console.log(`Resumen: ${todosLosNuevosIds.length} incidencias nuevas totales. ${nuevasRelevantes.length} son relevantes (Pesados/Planificadas).`);

    let correosEnviados = 0;

    // 4. Guardar TODAS las incidencias nuevas en Firestore usando BATCH (lotes de 500)
    // HACER ESTO ANTES DE ENVIAR CORREOS para que si Vercel da timeout, no se repitan los correos en el próximo ciclo.
    if (todosLosNuevosIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < todosLosNuevosIds.length; i += 400) {
        chunks.push(todosLosNuevosIds.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach(inc => {
          const ref = db.collection('processed_incidents').doc(inc.id_incidencia);
          batch.set(ref, {
            procesada_en: FieldValue.serverTimestamp(),
            provincia: inc.provincia
          });
        });
        await batch.commit();
      }
      console.log(`Se guardaron ${todosLosNuevosIds.length} incidencias nuevas en Firestore.`);
    }

    // 5. Si hay nuevas relevantes, agrupar por usuario y enviar BATCH emails
    if (nuevasRelevantes.length > 0) {
      const usersSnapshot = await db.collection('users_subscriptions').get();
      const promesasCorreos = [];

      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        const provinciasSubscritas = userData.provincias || [];
        
        // Filtrar las incidencias relevantes para ESTE usuario
        const incidenciasParaUsuario = nuevasRelevantes.filter(inc => {
          const provLow = (inc.provincia || '').toLowerCase();
          return provinciasSubscritas.includes('todas') || provinciasSubscritas.includes(provLow);
        });

        // Si hay al menos una, enviar 1 SOLO CORREO con todas
        if (incidenciasParaUsuario.length > 0) {
           promesasCorreos.push(sendBatchAlertEmail(userData.email, incidenciasParaUsuario));
        }
      });

      if (promesasCorreos.length > 0) {
         await Promise.all(promesasCorreos);
         correosEnviados = promesasCorreos.length;
         console.log(`Se han enviado ${correosEnviados} correos agrupados (batch).`);
      }
    }

    // 6. Limpiar incidencias que ya no existen (resueltas)
    const activeIds = new Set(dgtData.map(inc => inc.id_incidencia));
    const deleteBatch = db.batch();
    let deletedCount = 0;
    
    processedSnapshot.docs.forEach(doc => {
      if (!activeIds.has(doc.id) && deletedCount < 400) { // Límite de batch
        deleteBatch.delete(doc.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await deleteBatch.commit();
      console.log(`Se limpiaron ${deletedCount} incidencias resueltas de la base de datos.`);
    }

    return response.status(200).json({ 
      success: true, 
      message: 'Sincronización BATCH completada', 
      correos_enviados: correosEnviados,
      nuevas_procesadas: todosLosNuevosIds.length
    });

  } catch (error) {
    console.error('Error en cron-job batch:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
