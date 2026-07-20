import admin from 'firebase-admin';
import { sendAlertEmail } from './utils/mailer.js';
import dotenv from 'dotenv';

dotenv.config();

// Inicializar Firebase Admin (Patrón Singleton para entornos Serverless)
function getDb() {
  if (!admin.apps.length) {
    try {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
      // Limpiar comillas si Vercel las guardó por error
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    } catch (error) {
      console.error('Firebase initialization error', error);
    }
  }
  return admin.firestore();
}

export default async function handler(request, response) {
  // Opcional: Proteger el endpoint con un Secret Token (útil si usamos cron-job.org)
  const authHeader = request.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return response.status(401).json({ error: 'No autorizado' });
  }

  try {
    const db = getDb();
    console.log('Iniciando sincronización con DGT...');
    
    // 1. Simulación de Fetch a la DGT (DATEX II o API JSON)
    // En producción, aquí se haría un fetch a la URL real de la DGT
    const mockDgtData = [
      {
        id_incidencia: \`DGT-\${Date.now()}\`, // ID Dinámico para forzar el trigger de prueba
        tipo: "CORTE_CLIMATICO",
        carretera: "A-6",
        provincia: "Madrid", // Usamos Madrid para probar el cruce de datos
        tramo: { km_inicio: 45.0, km_fin: 48.5, sentido: "Decreciente" },
        periodo: { inicio: new Date().toISOString(), fin: new Date(Date.now() + 86400000).toISOString() },
        descripcion: "Corte total por nieve severa en la calzada."
      }
    ];

    let correosEnviados = 0;

    // 2. Procesar cada incidencia entrante
    for (const incidencia of mockDgtData) {
      // Verificar si ya la procesamos (evitar SPAM)
      const incRef = db.collection('processed_incidents').doc(incidencia.id_incidencia);
      const doc = await incRef.get();

      if (!doc.exists) {
        // La incidencia es NUEVA
        console.log(\`Nueva incidencia detectada: \${incidencia.id_incidencia}\`);
        
        // 3. Buscar usuarios interesados en esta provincia o en "Toda España"
        const usersSnapshot = await db.collection('users_subscriptions')
          .where('provincia', 'in', [incidencia.provincia.toLowerCase(), 'todas'])
          .get();

        if (!usersSnapshot.empty) {
          // 4. Enviar correos a los afectados
          const promesasCorreos = [];
          usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            promesasCorreos.push(sendAlertEmail(userData.email, incidencia));
          });

          await Promise.all(promesasCorreos);
          correosEnviados += promesasCorreos.length;
        }

        // 5. Marcar la incidencia como procesada en Firestore
        await incRef.set({
          procesada_en: admin.firestore.FieldValue.serverTimestamp(),
          provincia: incidencia.provincia
        });
      }
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
