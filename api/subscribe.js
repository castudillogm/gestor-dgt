import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

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
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email, provincia } = request.body;

    if (!email || !provincia) {
      return response.status(400).json({ error: 'Email y provincia son obligatorios' });
    }

    const db = getDb();
    
    // Crear un ID único o usar el email como ID
    const userRef = db.collection('users_subscriptions').doc(email.toLowerCase());
    
    await userRef.set({
      email: email.toLowerCase(),
      provincia: provincia.toLowerCase(),
      created_at: FieldValue.serverTimestamp()
    }, { merge: true }); // Si ya existe, actualiza la provincia sin perder datos

    return response.status(200).json({ success: true, message: 'Suscrito correctamente' });
  } catch (error) {
    console.error('Error suscribiendo usuario:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
