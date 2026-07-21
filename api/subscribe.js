import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendWelcomeEmail } from './utils/mailer.js';
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
    const { email, provincias, ciudades } = request.body;

    if (!email || !provincias || !Array.isArray(provincias)) {
      return response.status(400).json({ error: 'Email y lista de provincias son obligatorios' });
    }

    const db = getDb();
    
    const userRef = db.collection('users_subscriptions').doc(email.toLowerCase());
    
    // Podemos permitir actualizar la suscripción existente con merge: true
    await userRef.set({
      email: email.toLowerCase(),
      provincias: provincias.map(p => p.toLowerCase()),
      ciudades: (ciudades || '').toLowerCase(),
      updated_at: FieldValue.serverTimestamp()
    }, { merge: true });

    // Enviar correo de bienvenida (TODO: update mailer to handle arrays)
    await sendWelcomeEmail(email.toLowerCase(), provincias.join(', '));

    return response.status(200).json({ success: true, message: 'Suscrito correctamente' });
  } catch (error) {
    console.error('Error suscribiendo usuario:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
