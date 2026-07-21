import https from 'https';

export async function obtenerIncidenciasReales() {
  try {
    console.log('🤖 Robot: Buscando incidencias reales en fuentes Open Data (API Euskadi)...');
    
    // Forzamos IPv4 en Vercel para evitar bloqueos por IPv6 en servidores gubernamentales
    const data = await new Promise((resolve, reject) => {
      https.get('https://api.euskadi.eus/traffic/v1.0/incidences?_elements=20', { family: 4, rejectUnauthorized: false }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) throw new Error(`Error HTTP: ${res.statusCode}`);
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
    
    // Transformamos los datos al formato genérico de nuestro sistema
    const incidenciasEstandar = data.incidences.map(inc => {
      // Normalizar el tipo
      let tipo = "OTROS";
      const tipoOriginal = inc.incidenceType?.toUpperCase() || "";
      if (tipoOriginal.includes("OBRA")) tipo = "OBRAS";
      if (tipoOriginal.includes("METEO") || tipoOriginal.includes("HIELO") || tipoOriginal.includes("NIEVE")) tipo = "CORTE_CLIMATICO";
      if (tipoOriginal.includes("ACCIDENTE")) tipo = "ACCIDENTE";
      
      // Construir ID
      const id_incidencia = `TRF-${inc.incidenceId || Date.now()}`;
      
      return {
        id_incidencia,
        tipo,
        carretera: inc.road || "Vía Desconocida",
        provincia: inc.province || "N/A",
        tramo: { 
          km_inicio: inc.pkStart || 0, 
          km_fin: inc.pkEnd || 0, 
          sentido: inc.direction || "Ambos"
        },
        periodo: { 
          inicio: inc.startDate || new Date().toISOString(), 
          fin: inc.endDate || new Date(Date.now() + 86400000).toISOString() 
        },
        descripcion: `${inc.cause || 'Incidencia de tráfico'} en ${inc.cityTown || inc.province}. Nivel: ${inc.incidenceLevel}.`
      };
    });

    console.log(`🤖 Robot: Se han extraído ${incidenciasEstandar.length} incidencias reales exitosamente.`);
    return incidenciasEstandar;

  } catch (error) {
    console.error('🤖 Robot Error:', error.message);
    return []; // En caso de error, devolver vacío para no romper la app
  }
}
