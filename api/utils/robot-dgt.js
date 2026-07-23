import { parseStringPromise } from 'xml2js';

// Mapeo básico de tipos de incidencias DATEX2 a nuestro sistema
const mapTipo = (xsiType) => {
  if (!xsiType) return 'OTROS';
  const typeStr = xsiType.replace('sit:', '');
  if (typeStr.includes('Maintenance') || typeStr.includes('Roadworks') || typeStr.includes('Management')) return 'OBRAS';
  if (typeStr.includes('Accident')) return 'ACCIDENTE';
  if (typeStr.includes('Weather') || typeStr.includes('Environment')) return 'CORTE_CLIMATICO';
  if (typeStr.includes('Obstruction')) return 'OBSTACULO';
  if (typeStr.includes('AbnormalTraffic') || typeStr.includes('TrafficElement')) return 'RETENCION';
  return 'OTROS';
};

// Función de seguridad para acceder a propiedades anidadas de xml2js
const getNested = (obj, pathArray) => {
  let current = obj;
  for (const key of pathArray) {
    if (current && current[key] && current[key][0]) {
      current = current[key][0];
    } else {
      return null;
    }
  }
  return current;
};

export async function obtenerIncidenciasReales() {
  try {
    console.log('🤖 Robot: Buscando incidencias reales en fuentes Open Data (DGT Nacional - DATEX2)...');
    
    // El NAP DGT usa DATEX2 v3
    const url = 'https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml';
    
    const response = await fetch(url, { 
      headers: { 'Accept': 'application/xml' },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Parsear XML a JSON
    const result = await parseStringPromise(xmlText);
    
    const payload = result['d2:payload'] || result.payload;
    if (!payload || !payload['sit:situation']) {
       console.log('🤖 Robot: El payload de la DGT está vacío o sin incidencias.');
       return [];
    }

    const situations = payload['sit:situation'];
    const sitArray = Array.isArray(situations) ? situations : [situations];
    
    // Transformamos los datos al formato genérico de nuestro sistema
    const incidenciasEstandar = sitArray.map(sit => {
      try {
        const rec = sit['sit:situationRecord'] && sit['sit:situationRecord'][0];
        if (!rec) return null;

        const id_incidencia = `TRF-${rec['$']?.id || Date.now()}`;
        const tipoOriginal = rec['$']?.['xsi:type'];
        const tipo = mapTipo(tipoOriginal);
        
        const locRef = rec['sit:locationReference']?.[0];
        const linearLoc = locRef && (locRef['loc:tpegLinearLocation']?.[0] || locRef['loc:alertCLinear']?.[0]);
        const pointLoc = locRef && locRef['loc:pointByCoordinates']?.[0];

        // Carretera
        const carretera = getNested(locRef, ['loc:supplementaryPositionalDescription', 'loc:roadInformation', 'loc:roadName']) || 
                          getNested(locRef, ['loc:supplementaryPositionalDescription', 'loc:locationDescriptor']) || 
                          "Vía Desconocida";
        
        // Extraer Provincia y Ciudad si es posible (suele estar en los nodos To/From)
        const toExt = linearLoc && getNested(linearLoc, ['loc:to', 'loc:_tpegNonJunctionPointExtension', 'loc:extendedTpegNonJunctionPoint']);
        const fromExt = linearLoc && getNested(linearLoc, ['loc:from', 'loc:_tpegNonJunctionPointExtension', 'loc:extendedTpegNonJunctionPoint']);
        const prov = (toExt && toExt['lse:province']?.[0]) || (fromExt && fromExt['lse:province']?.[0]) || "N/A";
        const ciudad = (toExt && toExt['lse:municipality']?.[0]) || (fromExt && fromExt['lse:municipality']?.[0]) || "N/A";
        
        // Puntos kilométricos
        const km_fin = toExt && toExt['lse:kilometerPoint'] ? parseFloat(toExt['lse:kilometerPoint'][0]) : 0;
        const km_inicio = fromExt && fromExt['lse:kilometerPoint'] ? parseFloat(fromExt['lse:kilometerPoint'][0]) : km_fin;
        
        // Sentido
        const dirExt = linearLoc && getNested(linearLoc, ['loc:_tpegLinearLocationExtension', 'loc:extendedTpegLinearLocation']);
        let sentido = dirExt && dirExt['lse:tpegDirectionRoad'] ? dirExt['lse:tpegDirectionRoad'][0] : "Ambos";
        if (sentido === 'both') sentido = 'Ambos';
        if (sentido === 'increasing') sentido = 'Creciente';
        if (sentido === 'decreasing') sentido = 'Decreciente';

        // Fechas
        const validity = rec['sit:validity']?.[0];
        const startTime = getNested(validity, ['com:validityTimeSpecification', 'com:overallStartTime']) || rec['sit:situationRecordCreationTime']?.[0] || new Date().toISOString();
        const endTime = getNested(validity, ['com:validityTimeSpecification', 'com:overallEndTime']) || new Date(Date.now() + 86400000).toISOString();

        // Descripción (A veces viene en generalPublicComment)
        let descripcion = `${tipo} en ${carretera}.`;
        const comment = rec['sit:generalPublicComment']?.[0];
        if (comment && comment['com:comment']) {
           descripcion = typeof comment['com:comment'][0] === 'string' ? comment['com:comment'][0] : (comment['com:comment'][0]['com:values']?.[0]?.['com:value']?.[0]?._ || descripcion);
        } else if (rec['sit:cause']) {
           const causeType = getNested(rec, ['sit:cause', 'sit:causeType']);
           if (causeType) descripcion = `Causa: ${causeType} en ${carretera}.`;
        }

        // Extraer si afecta a vehículos pesados explícitamente desde las características del vehículo
        let isPesadosOriginal = false;
        const vehChars = rec['sit:forVehiclesWithCharacteristicsOf'];
        if (vehChars) {
           const charArray = Array.isArray(vehChars) ? vehChars : [vehChars];
           charArray.forEach(c => {
             let vType = c['com:vehicleType']?.[0];
             if (typeof vType === 'object' && vType._) vType = vType._;
             if (typeof vType === 'string') {
               vType = vType.toLowerCase();
               if (vType.includes('heavy') || vType.includes('goods') || vType.includes('articulated') || vType.includes('dangerous')) {
                  isPesadosOriginal = true;
               }
             }
           });
        }

        return {
          id_incidencia,
          tipo,
          carretera,
          provincia: prov,
          ciudad,
          tramo: { 
            km_inicio, 
            km_fin, 
            sentido
          },
          periodo: { 
            inicio: startTime, 
            fin: endTime 
          },
          descripcion,
          isPesadosOriginal
        };
      } catch (e) {
        console.error("Error parseando incidencia individual", e);
        return null;
      }
    }).filter(i => i !== null);

    console.log(`🤖 Robot: Se han extraído ${incidenciasEstandar.length} incidencias reales exitosamente.`);
    return incidenciasEstandar;

  } catch (error) {
    console.error('🤖 Robot Error:', error.message);
    return null; // En caso de error, devolvemos null para diferenciarlo de un array vacío
  }
}
