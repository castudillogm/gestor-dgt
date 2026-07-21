import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as cheerio from 'cheerio';
import { parseDgtExcel } from './utils/excel-parser.js';
import { sendPlanningEmail } from './utils/mailer.js';
import geoMap from './utils/geo-map.js';
import dotenv from 'dotenv';

dotenv.config();

export const maxDuration = 60;

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
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}` && request.query.force !== 'true') {
    return response.status(401).json({ error: 'No autorizado' });
  }

  try {
    const db = getDb();
    console.log('Iniciando cron de planificación semanal...');

    // 1. Obtener la página de restricciones de la DGT
    const dgtUrl = 'https://www.dgt.es/conoce-el-estado-del-trafico/restricciones-a-la-circulacion/';
    const resHTML = await fetch(dgtUrl);
    const html = await resHTML.text();
    
    // 2. Extraer el link al archivo Excel
    const $ = cheerio.load(html);
    let excelUrl = null;
    
    $('a').each((i, link) => {
      const href = $(link).attr('href');
      if (href && (href.endsWith('.xlsx') || href.endsWith('.xls'))) {
         // Verificamos si es un link relativo o absoluto
         if (href.startsWith('http')) {
             excelUrl = href;
         } else {
             excelUrl = `https://www.dgt.es${href}`;
         }
      }
    });

    // Fallback if the URL isn't right on the first page, just hardcode our demo file for this test
    if (!excelUrl) {
      console.log('No se encontró ningún archivo Excel, usando archivo fallback.');
      excelUrl = 'https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/estado-del-trafico/restricciones/2026/Restricciones_Julio-y-Agosto.xlsx';
    }

    console.log(`Descargando Excel desde: ${excelUrl}`);
    
    let buffer;
    try {
        const fetchUrl = `${excelUrl}?t=${Date.now()}`;
        const excelRes = await fetch(fetchUrl);
        if (!excelRes.ok) {
            throw new Error('Fallo al descargar el Excel');
        }
        const arrayBuffer = await excelRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
    } catch(err) {
        // Fallback for demo purposes if the URL fails
        console.log('Fallo la descarga remota. En producción intentar de nuevo.', err);
        return response.status(500).json({ error: 'Error red' });
    }

    // 4. Parsear el Excel
    let restricciones = parseDgtExcel(buffer);

    console.log(`Se extrajeron ${restricciones.length} restricciones planificadas.`);

    if (restricciones.length > 0) {
       // Guardar en Firestore para usar en cron-dgt.js
       const batch = db.batch();
       const colRef = db.collection('planned_restrictions');
       
       // Borrar planificaciones anteriores
       const oldDocs = await colRef.get();
       const deleteBatch = db.batch();
       oldDocs.docs.forEach((doc) => {
           deleteBatch.delete(doc.ref);
       });
       await deleteBatch.commit();
       console.log('Planificaciones antiguas eliminadas.');

       for (const r of restricciones) {
           const docRef = colRef.doc();
           batch.set(docRef, { ...r, created_at: new Date() });
       }
       await batch.commit();
       console.log('Restricciones guardadas en Firestore.');
       
       // Lógica de envío de correos "Planificación Semanal" a los usuarios suscritos
       const usersSnapshot = await db.collection('users_subscriptions').get();
       
       if (!usersSnapshot.empty) {
         console.log(`Evaluando alertas de planificación para ${usersSnapshot.size} usuarios suscritos.`);
         const promesasCorreos = [];
         usersSnapshot.forEach(userDoc => {
           const userData = userDoc.data();
           const { provincias = [], ciudades = '' } = userData;
           const isTodas = provincias.includes('todas');
           
           let userRestricciones = restricciones;
           if (!isTodas) {
               // Filtrar por coincidencias en el municipio/población O mapeando municipio -> provincia
               userRestricciones = restricciones.filter(r => {
                   const muni = (r.municipio_inicio || '').toLowerCase();
                   
                   // Limpiamos el texto extra del excel (por ej. si dice "Las Rozas (Madrid)")
                   const cleanMuni = muni.split('(')[0].trim();
                   
                   // 1. Buscamos la provincia en el diccionario a partir del municipio
                   const mappedProvincia = geoMap[cleanMuni] || '';

                   // 2. Verificamos si alguna provincia del usuario coincide con el mappedProvincia o con el texto bruto del municipio
                   const hasProvincia = provincias.some(p => {
                       const pLow = p.toLowerCase();
                       return muni.includes(pLow) || mappedProvincia === pLow;
                   });
                   
                   // 3. Verificamos si la ciudad especificada está en el municipio
                   const hasCiudad = ciudades && ciudades.split(',').some(c => muni.includes(c.trim().toLowerCase()));
                   
                   return hasProvincia || hasCiudad;
               });
           }

           // Solo enviamos si hay al menos una restricción que le afecte (o si eligió Todas)
           if (userRestricciones.length > 0) {
               promesasCorreos.push(sendPlanningEmail(userData.email, userRestricciones));
           }
         });
         
         await Promise.all(promesasCorreos);
         console.log(`Se enviaron correos de planificación a ${promesasCorreos.length} usuarios afectados.`);
       } else {
         console.log('No hay usuarios suscritos para enviar la planificación.');
       }
    }

    return response.status(200).json({ 
      success: true, 
      message: 'Planificación completada',
      count: restricciones.length
    });

  } catch (error) {
    console.error('Error en cron-planificacion:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
