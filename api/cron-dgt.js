import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendAlertEmail } from './utils/mailer.js';
import { obtenerIncidenciasReales } from './utils/robot-dgt.js';
import dotenv from 'dotenv';

dotenv.config();

// Aumentar el límite de tiempo en Vercel (Puppeteer tarda en arrancar)
export const maxDuration = 60;

// Inicializar Firebase Admin (Patrón Singleton para entornos Serverless)
function getDb() {
  if (getApps().length === 0) {
    try {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
      // Limpiar comillas si Vercel las guardó por error
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
  // Opcional: Proteger el endpoint con un Secret Token (útil si usamos cron-job.org)
  const authHeader = request.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).json({ error: 'No autorizado' });
  }

  try {
    const db = getDb();
    console.log('Iniciando sincronización con el Robot de Consulta...');
    
    // 1. Ejecutar el robot para extraer incidencias reales
    const dgtData = await obtenerIncidenciasReales();
    
    if (!dgtData || dgtData.length === 0) {
      console.log('No se encontraron incidencias activas en esta ejecución.');
      return response.status(200).json({ success: true, message: 'Sin incidencias nuevas' });
    }

    let correosEnviados = 0;

    // 2. Procesar cada incidencia entrante
    for (const incidencia of dgtData) {
      // Verificar si ya la procesamos (evitar SPAM)
      const incRef = db.collection('processed_incidents').doc(incidencia.id_incidencia);
      const doc = await incRef.get();

      if (!doc.exists) {
        // La incidencia es NUEVA
        console.log(`Nueva incidencia detectada: ${incidencia.id_incidencia}`);
        
        // 3. Verificar si esta incidencia estaba planificada en el Excel
        const plannedSnapshot = await db.collection('planned_restrictions')
          .where('carretera', '==', incidencia.carretera)
          .get();
        const isPlanificada = !plannedSnapshot.empty;

        if (isPlanificada) {
          console.log(`¡MATCH PREDICTIVO! La incidencia ${incidencia.id_incidencia} estaba planificada.`);
        }

        // 4. Buscar usuarios interesados en esta provincia o en "Toda España"
        // 'provincias' ahora es un array en Firebase
        const usersSnapshot = await db.collection('users_subscriptions')
          .where('provincias', 'array-contains-any', [incidencia.provincia.toLowerCase(), 'todas'])
          .get();

        if (!usersSnapshot.empty) {
          // 5. Enviar correos a los afectados
          const promesasCorreos = [];
          usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            promesasCorreos.push(sendAlertEmail(userData.email, incidencia, isPlanificada));
          });

          await Promise.all(promesasCorreos);
          correosEnviados += promesasCorreos.length;
        }

        // 5. Marcar la incidencia como procesada en Firestore
        await incRef.set({
          procesada_en: FieldValue.serverTimestamp(),
          provincia: incidencia.provincia
        });
      }
    }

    // 6. Limpiar incidencias que ya han sido resueltas
    const processedSnapshot = await db.collection('processed_incidents').get();
    const activeIds = dgtData.map(inc => inc.id_incidencia);
    const deleteBatch = db.batch();
    let deletedCount = 0;
    
    processedSnapshot.docs.forEach(doc => {
      if (!activeIds.includes(doc.id)) {
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
      message: 'Sincronización completada', 
      correos_enviados: correosEnviados 
    });

  } catch (error) {
    console.error('Error en cron-job:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
