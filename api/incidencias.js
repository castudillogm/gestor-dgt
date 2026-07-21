import { obtenerIncidenciasReales } from './utils/robot-dgt.js';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import geoMap from './utils/geo-map.js';
import dotenv from 'dotenv';

dotenv.config();

// Inicializar Firebase si no está
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const rawData = await obtenerIncidenciasReales();
    
    // Obtener planificadas para el cross-reference
    const plannedSnapshot = await db.collection('planned_restrictions').get();
    const planificadas = [];
    plannedSnapshot.forEach(doc => planificadas.push(doc.data()));

    // Cruzar datos
    const enhancedIncidencias = rawData.map(inc => {
      // Validar si es para pesados
      const desc = (inc.descripcion || '').toLowerCase();
      const tipo = (inc.tipo || '').toLowerCase();
      const isPesados = desc.includes('pesados') || desc.includes('camion') || 
                        desc.includes('camión') || desc.includes('mercanc') || desc.includes('adr');
      
      // Validar si está planificada
      const isPlanificada = planificadas.some(plan => {
        // 1. Coincide carretera
        if (plan.carretera !== inc.carretera) return false;
        
        // 2. Coincide provincia (Validación geográfica)
        const cleanMuni = (plan.municipio_inicio || '').split('(')[0].trim().toLowerCase();
        const mappedProvincia = geoMap[cleanMuni] || '';
        const incProv = (inc.provincia || '').toLowerCase();
        
        return incProv.includes(mappedProvincia) || mappedProvincia.includes(incProv);
      });

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
