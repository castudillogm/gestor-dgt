import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

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
  // Configurar CORS y Caché (no cachear en Edge para tener datos siempre frescos)
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    const db = getDb();
    // Consultar las restricciones planificadas
    const snapshot = await db.collection('planned_restrictions')
                             .orderBy('created_at', 'desc')
                             .limit(100) // Límite razonable
                             .get();

    if (snapshot.empty) {
      return response.status(200).json([]);
    }

    const data = [];
    snapshot.forEach(doc => {
       const item = doc.data();
       // Limpiar fechas si existen
       if (item.created_at) {
          item.created_at = item.created_at.toDate ? item.created_at.toDate() : item.created_at;
       }
       data.push({ id: doc.id, ...item });
    });

    return response.status(200).json(data);
  } catch (error) {
    console.error('Error fetching planned restrictions:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
