import * as xlsx from 'xlsx';

export function parseDgtExcel(buffer) {
  // Leemos el archivo en memoria
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0]; // Usualmente solo hay una hoja
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertimos a array de arrays (filas y columnas)
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  
  const plannedRestrictions = [];
  let isPesadosSection = false;
  let currentDate = null;
  let lastCtra = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();

    // 1. Detectar inicio de la sección de Pesados
    if (firstCell.includes('Vehículos Pesados') && firstCell.includes('Maquinaria agrícola')) {
      console.log('ENTRÓ A PESADOS!', firstCell);
      isPesadosSection = true;
      continue;
    }
    
    if (i < 5) console.log('Fila', i, firstCell, row);

    if (isPesadosSection) {
      if (firstCell.match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/i)) {
        currentDate = firstCell; // Guardamos el día actual
      } else if (firstCell === 'Ctra.') {
        // Es la cabecera
      } else {
        const cleanRow = row.filter(cell => cell !== null && cell !== '');
        
        // Buscamos si hay una celda de duración (Ej: 10:00 - 15:00 o 14,00-24,00)
        // Buscamos si hay una celda de duración (Ej: 10:00 - 15:00 o 14,00-24,00)
        const duracionCellIndex = cleanRow.findIndex(c => typeof c === 'string' && c.includes('-') && /\d{2}[,:]\d{2}/.test(c));

        if (duracionCellIndex !== -1) {
           const duracionCell = cleanRow[duracionCellIndex];
           let ctra = null;
           let inicioMuni = null;
           let pkInicio = null;
           let pkFin = null;

           // Si la primera columna no está vacía y parece carretera
           if (firstCell && firstCell.match(/^[A-Z0-9-\/]+$/)) {
               ctra = firstCell;
               lastCtra = ctra;
               // En el excel real, la columna 1 es el P.K. de inicio, 2 es población, 3 P.K. fin, 4 pob. fin
               pkInicio = !isNaN(Number(cleanRow[1])) ? cleanRow[1] : null;
               inicioMuni = typeof cleanRow[1] === 'string' && isNaN(Number(cleanRow[1])) ? cleanRow[1] : cleanRow[2];
               pkFin = !isNaN(Number(cleanRow[3])) ? cleanRow[3] : null;
           } else if (!firstCell && lastCtra) {
               // Si la carretera está en blanco (merge de Excel) hereda la anterior
               ctra = lastCtra;
               pkInicio = !isNaN(Number(cleanRow[0])) ? cleanRow[0] : null;
               inicioMuni = typeof cleanRow[0] === 'string' && isNaN(Number(cleanRow[0])) ? cleanRow[0] : cleanRow[1];
               pkFin = !isNaN(Number(cleanRow[2])) ? cleanRow[2] : null;
           }

           const sentido = cleanRow[cleanRow.length - 1]; // Usualmente el último

           if (ctra) {
               plannedRestrictions.push({
                 fecha_texto: currentDate,
                 carretera: ctra,
                 municipio_inicio: inicioMuni || 'Desconocido',
                 pk_inicio: pkInicio,
                 pk_fin: pkFin,
                 duracion: duracionCell,
                 sentido: sentido
               });
           }
        }
      }
    }
  }

  return plannedRestrictions;
}
