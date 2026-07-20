import { obtenerIncidenciasReales } from './utils/robot-dgt.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const data = await obtenerIncidenciasReales();
    return response.status(200).json(data);
  } catch (error) {
    console.error('Error fetching incidencias:', error);
    return response.status(500).json({ error: 'Error interno obteniendo incidencias' });
  }
}
