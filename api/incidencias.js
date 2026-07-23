import { obtenerIncidenciasReales } from './utils/robot-dgt.js';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import geoMap from './utils/geo-map.js';
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
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const db = getDb();
    const rawData = await obtenerIncidenciasReales();
    
    // Obtener planificadas para el cross-reference
    const plannedSnapshot = await db.collection('planned_restrictions').get();
    const planificadas = [];
    plannedSnapshot.forEach(doc => planificadas.push(doc.data()));

    // Cruzar datos
    const enhancedIncidencias = rawData.map(inc => {
      // Validar si está planificada primero
      const isPlanificada = planificadas.some(plan => {
        // 1. Coincide carretera
        if (plan.carretera !== inc.carretera) return false;
        
        // 2. Coincide provincia (Validación geográfica)
        const cleanMuni = (plan.municipio_inicio || '').split('(')[0].trim().toLowerCase();
        const mappedProvincia = geoMap[cleanMuni];
        const incProv = (inc.provincia || '').toLowerCase();
        const incCiudad = (inc.ciudad || '').toLowerCase();
        
        if (mappedProvincia) {
          return incProv.includes(mappedProvincia) || mappedProvincia.includes(incProv);
        } else {
          // Si no está mapeada la provincia, no podemos asumir true.
          // Comprobamos si la ciudad coincide, y si no, evitamos el falso positivo.
          if (!cleanMuni || cleanMuni === 'n/a') return false;
          return incCiudad.includes(cleanMuni) || cleanMuni.includes(incCiudad);
        }
      });

      // Validar si es para pesados (usando flag original, descripción, o si es planificada)
      const desc = (inc.descripcion || '').toLowerCase();
      const tipo = (inc.tipo || '').toLowerCase();
      let isPesados = inc.isPesadosOriginal || desc.includes('pesados') || desc.includes('camion') || 
                        desc.includes('camión') || desc.includes('mercanc') || desc.includes('adr');
      
      if (isPlanificada) isPesados = true;

      return {
        ...inc,
        isPesados,
        isPlanificada
      };
    });

    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    return response.status(200).json(enhancedIncidencias);
  } catch (error) {
    console.error('Error fetching incidencias:', error);
    return response.status(500).json({ error: 'Error interno obteniendo incidencias' });
  }
}
