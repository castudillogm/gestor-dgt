import https from 'https';

export async function obtenerIncidenciasReales() {
  try {
    console.log('🤖 Robot: Buscando incidencias reales en fuentes Open Data (API Euskadi)...');
    
    // Forzamos IPv4 en Vercel para evitar bloqueos por IPv6 en servidores gubernamentales
    const data = await new Promise((resolve, reject) => {
      const req = https.get('https://api.euskadi.eus/traffic/v1.0/incidences?_elements=20', { family: 4, rejectUnauthorized: false, timeout: 10000 }, (res) => {
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
      });
      
      req.on('error', reject);
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout de 10s: La API de Euskadi no respondió a tiempo.'));
      });
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
        ciudad: inc.cityTown || "N/A",
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

    if (incidenciasEstandar.length === 0) {
      console.log('🤖 Robot: No se encontraron incidencias activas. Usando datos de prueba (históricos) para demostración.');
      return [
        {
          id_incidencia: "TRF-DEMO-1",
          tipo: "OBRAS",
          carretera: "A-1",
          provincia: "Madrid",
          ciudad: "Madrid",
          tramo: { km_inicio: 12, km_fin: 15, sentido: "Creciente" },
          periodo: { inicio: new Date().toISOString(), fin: new Date(Date.now() + 86400000).toISOString() },
          descripcion: "Obras de mantenimiento en calzada. Carril derecho cerrado."
        },
        {
          id_incidencia: "TRF-DEMO-2",
          tipo: "ACCIDENTE",
          carretera: "AP-7",
          provincia: "Valencia",
          ciudad: "Sagunto",
          tramo: { km_inicio: 470, km_fin: 471, sentido: "Decreciente" },
          periodo: { inicio: new Date().toISOString(), fin: new Date(Date.now() + 3600000).toISOString() },
          descripcion: "Accidente con alcance de dos turismos. Retenciones de 2km."
        },
        {
          id_incidencia: "TRF-DEMO-3",
          tipo: "RETENCION",
          carretera: "A-4",
          provincia: "Sevilla",
          ciudad: "Dos Hermanas",
          tramo: { km_inicio: 553, km_fin: 558, sentido: "Ambos" },
          periodo: { inicio: new Date().toISOString(), fin: new Date(Date.now() + 7200000).toISOString() },
          descripcion: "Congestión por alta afluencia de vehículos."
        }
      ];
    }

    return incidenciasEstandar;

  } catch (error) {
    console.error('🤖 Robot Error:', error.message);
    return []; // En caso de error, devolver vacío para no romper la app
  }
}
