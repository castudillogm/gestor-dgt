import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del Transporter para Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Contraseña de aplicación de Google
  },
});

/**
 * Genera el template HTML corporativo de GrupaMar para la alerta
 */
const generateEmailTemplate = (incidencia, isPlanificada = false) => {
  const badgeText = isPlanificada ? 'RESTRICCIÓN PLANIFICADA ACTIVADA' : `ALERTA DGT: ${incidencia.tipo.replace('_', ' ')}`;
  const badgeColor = isPlanificada ? 'rgba(34, 197, 94, 0.1)' : 'rgba(3, 169, 236, 0.1)';
  const badgeTextColor = isPlanificada ? '#16a34a' : '#03A9EC';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #F6F6F6; color: #1a1a2e; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 30px; overflow: hidden; box-shadow: 0 10px 15px rgba(9, 17, 151, 0.05); }
        .header { background-color: #091197; color: #FFFFFF; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { color: #03A9EC; font-style: italic; margin: 5px 0 0 0; }
        .content { padding: 30px 20px; }
        .badge { display: inline-block; padding: 5px 12px; background-color: ${badgeColor}; color: ${badgeTextColor}; border-radius: 15px; font-weight: bold; font-size: 12px; }
        .title { color: #03A9EC; font-size: 20px; margin: 15px 0 10px; }
        .info-box { background-color: #F6F6F6; padding: 15px; border-radius: 15px; margin: 20px 0; }
        .footer { background-color: #F6F6F6; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://gestor-dgt.vercel.app/logo.png" alt="GrupaMar" style="max-height: 45px; margin-bottom: 5px;" />
          <p>Transporte y Logística</p>
        </div>
        <div class="content">
          <span class="badge">${badgeText}</span>
          <h2 class="title">Carretera: ${incidencia.carretera} <span style="color:#1a1a2e; font-size:16px;">| Provincia: ${incidencia.provincia}</span></h2>
          <p>${incidencia.descripcion}</p>
          
          <div class="info-box">
            <p><strong>📍 Tramo Afectado:</strong> Km ${incidencia.tramo.km_inicio} al ${incidencia.tramo.km_fin} (${incidencia.tramo.sentido})</p>
            <p><strong>🕒 Período:</strong> ${new Date(incidencia.periodo.inicio).toLocaleString('es-ES')} - ${new Date(incidencia.periodo.fin).toLocaleString('es-ES')}</p>
          </div>
          <p>Por favor, ajusta tus rutas de transporte acorde a esta incidencia.</p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} GrupaMar Transporte y Logística. Este es un correo automático, por favor no respondas.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Despacha un correo electrónico de alerta
 */
export const sendAlertEmail = async (to, incidencia, isPlanificada = false) => {
  try {
    const mailOptions = {
      from: `"Alertas GrupaMar" <${process.env.SMTP_USER}>`,
      to,
      subject: isPlanificada 
        ? `⚠️ PLANIFICADA ACTIVADA: ${incidencia.carretera} (${incidencia.provincia})`
        : `Alerta de Tráfico GrupaMar: ${incidencia.tipo} en ${incidencia.carretera} (${incidencia.provincia})`,
      html: generateEmailTemplate(incidencia, isPlanificada),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    return false;
  }
};

/**
 * Genera el template HTML para la confirmación de suscripción
 */
const generateWelcomeTemplate = (provincia) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #F6F6F6; color: #1a1a2e; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 30px; overflow: hidden; box-shadow: 0 10px 15px rgba(9, 17, 151, 0.05); }
        .header { background-color: #091197; color: #FFFFFF; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { color: #03A9EC; font-style: italic; margin: 5px 0 0 0; }
        .content { padding: 30px 20px; text-align: center; }
        .title { color: #03A9EC; font-size: 20px; margin: 15px 0 10px; }
        .footer { background-color: #F6F6F6; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://gestor-dgt.vercel.app/logo.png" alt="GrupaMar" style="max-height: 45px; margin-bottom: 5px;" />
          <p>Transporte y Logística</p>
        </div>
        <div class="content">
          <h2 class="title">¡Suscripción Exitosa!</h2>
          <p>Has sido registrado correctamente en el sistema de Alertas Viales de GrupaMar.</p>
          <p>A partir de este momento, recibirás notificaciones automatizadas sobre incidencias de tráfico relevantes para la zona de: <strong>${provincia.toUpperCase()}</strong>.</p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} GrupaMar Transporte y Logística. Este es un correo automático, por favor no respondas.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Envía un correo de confirmación de suscripción
 */
export const sendWelcomeEmail = async (to, provincia) => {
  try {
    const mailOptions = {
      from: `"Alertas GrupaMar" <${process.env.SMTP_USER}>`,
      to,
      subject: `Suscripción Confirmada: Alertas Viales GrupaMar (${provincia.toUpperCase()})`,
      html: generateWelcomeTemplate(provincia),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo de bienvenida enviado: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo de bienvenida:', error);
    return false;
  }
};

/**
 * Envia el reporte semanal predictivo
 */
export const sendPlanningEmail = async (to, restricciones, isUpdated = false) => {
  if (!restricciones || restricciones.length === 0) return false;

  const subjectPrefix = isUpdated ? "[Actualización] " : "";
  const headerBadge = isUpdated 
    ? `<span style="background-color: #ff9800; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; vertical-align: middle; margin-left: 10px;">ACTUALIZACIÓN</span>` 
    : "";

  const today = new Date();
  today.setHours(0,0,0,0);

  const monthMap = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };

  const isFutureOrToday = (fechaTexto) => {
    if (!fechaTexto) return true;
    const lower = fechaTexto.toLowerCase();
    
    const match = lower.match(/(\d{1,2})\s*(?:de)?\s*([a-z]+)/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthIndex = monthMap[match[2]];
      
      if (monthIndex !== undefined) {
        const dateToCompare = new Date(today.getFullYear(), monthIndex, day);
        if (dateToCompare < today && (today.getMonth() - monthIndex > 6)) {
           dateToCompare.setFullYear(today.getFullYear() + 1);
        }
        return dateToCompare >= today;
      }
    }
    return true; 
  };

  const htmlList = restricciones.map(r => {
    const esNueva = isFutureOrToday(r.fecha_texto);
    const color = esNueva ? '#03A9EC' : '#1a1a2e';
    const destName = r.municipio_fin ? ` a ${r.municipio_fin}` : '';
    
    return `
    <li style="margin-bottom: 12px; color: ${color};">
      <strong style="color: ${color};">Día:</strong> ${r.fecha_texto} <br/>
      <strong>Carretera:</strong> ${r.carretera} (Tramo: ${r.municipio_inicio || 'N/A'}${destName}) <br/>
      <strong>Horario:</strong> ${r.duracion || 'Todo el día'} - <strong>Sentido:</strong> ${r.sentido || 'Ambos'}
    </li>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #F6F6F6; color: #1a1a2e; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 30px; overflow: hidden; box-shadow: 0 10px 15px rgba(9, 17, 151, 0.05); }
        .header { background-color: #091197; color: #FFFFFF; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .title { color: #03A9EC; font-size: 20px; margin: 15px 0 10px; display: flex; align-items: center; }
        .info-box { background-color: #F6F6F6; padding: 15px; border-radius: 15px; margin: 20px 0; }
        .footer { background-color: #F6F6F6; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://gestor-dgt.vercel.app/logo.png" alt="GrupaMar" style="max-height: 45px; margin-bottom: 5px;" />
          <p style="color: #03A9EC; font-style: italic; margin: 5px 0 0 0;">Transporte y Logística</p>
        </div>
        <div class="content">
          <h2 class="title">Resumen Semanal Predictivo (DGT) ${headerBadge}</h2>
          <p>Hemos detectado las siguientes restricciones para vehículos pesados programadas por la DGT esta semana que podrían afectar tus rutas habituales:</p>
          <div class="info-box">
            <ul style="padding-left: 15px; margin: 0;">
              ${htmlList}
            </ul>
          </div>
          <p>Si alguna de estas restricciones se activa en tiempo real, recibirás una alerta adicional.</p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} GrupaMar Transporte y Logística. Este es un correo automático.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const mailOptions = {
      from: `"Alertas GrupaMar" <${process.env.SMTP_USER}>`,
      to,
      subject: `${subjectPrefix}Planificación DGT Semanal: ${restricciones.length} restricciones próximas`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo de planificación:', error);
    return false;
  }
};

/**
 * Genera el template HTML corporativo para MÚLTIPLES alertas simultáneas (BATCH)
 */
const generateBatchAlertTemplate = (incidencias) => {
  const listItems = incidencias.map(inc => {
    const badgeText = inc.isPlanificada ? 'PLAN ACTIVADA' : inc.tipo.replace('_', ' ');
    const badgeColor = inc.isPlanificada ? 'rgba(34, 197, 94, 0.1)' : 'rgba(3, 169, 236, 0.1)';
    const badgeTextColor = inc.isPlanificada ? '#16a34a' : '#03A9EC';
    const isPesadosBadge = inc.isPesados ? '<span style="display:inline-block; margin-left:8px; padding:3px 8px; background-color: rgba(9, 17, 151, 0.1); color: #091197; border-radius: 10px; font-weight: bold; font-size: 11px;">PESADOS/ADR</span>' : '';

    return `
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 15px;">
        <div style="margin-bottom: 8px;">
          <span style="display:inline-block; padding:3px 10px; background-color:${badgeColor}; color:${badgeTextColor}; border-radius:12px; font-weight:bold; font-size:12px;">${badgeText}</span>
          ${isPesadosBadge}
        </div>
        <div style="font-size: 16px; font-weight: 600; color: #1a1a2e;">
          Carretera ${inc.carretera} <span style="color: #64748b; font-size: 14px; font-weight: normal;">| ${inc.provincia} ${inc.ciudad ? `(${inc.ciudad})` : ''}</span>
        </div>
        <p style="margin: 5px 0 10px 0; font-size: 14px; color: #334155;">${inc.descripcion}</p>
        <div style="font-size: 13px; color: #64748b;">
          <strong>📍 Tramo:</strong> Km ${inc.tramo?.km_inicio} al ${inc.tramo?.km_fin} (${inc.tramo?.sentido})<br/>
          <strong>🕒 Período:</strong> ${new Date(inc.periodo?.inicio).toLocaleString('es-ES', {dateStyle:'short', timeStyle:'short'})} - ${new Date(inc.periodo?.fin).toLocaleString('es-ES', {dateStyle:'short', timeStyle:'short'})}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #F6F6F6; color: #1a1a2e; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 30px; overflow: hidden; box-shadow: 0 10px 15px rgba(9, 17, 151, 0.05); }
        .header { background-color: #091197; color: #FFFFFF; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { color: #03A9EC; font-style: italic; margin: 5px 0 0 0; }
        .content { padding: 30px 20px; }
        .title { color: #03A9EC; font-size: 20px; margin: 0 0 20px 0; }
        .footer { background-color: #F6F6F6; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://gestor-dgt.vercel.app/logo.png" alt="GrupaMar" style="max-height: 45px; margin-bottom: 5px;" />
          <p>Transporte y Logística</p>
        </div>
        <div class="content">
          <h2 class="title">Nuevas Alertas Activas en Tiempo Real (${incidencias.length})</h2>
          <p style="margin-top:0;">Se han activado las siguientes restricciones en la DGT que podrían afectar tus rutas:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 15px; margin: 20px 0;">
            ${listItems}
          </div>
          
          <p style="font-size: 14px; text-align: center; margin-top: 20px;">
            <a href="https://gestor-dgt.vercel.app" style="color: #091197; text-decoration: none; font-weight: bold;">Ver Mapa Interactivo GrupaMar</a>
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} GrupaMar Transporte y Logística. Este es un correo automático, por favor no respondas.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Despacha un correo en lote (batch) para múltiples alertas nuevas simultáneas
 */
export const sendBatchAlertEmail = async (to, incidenciasNuevas) => {
  if (!incidenciasNuevas || incidenciasNuevas.length === 0) return false;

  try {
    const mailOptions = {
      from: `"Alertas GrupaMar" <${process.env.SMTP_USER}>`,
      to,
      subject: `⚠️ Alerta de Tráfico GrupaMar: ${incidenciasNuevas.length} nuevas restricciones detectadas`,
      html: generateBatchAlertTemplate(incidenciasNuevas),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Batch] Correo de alertas múltiples enviado a ${to}: %s`, info.messageId);
    return true;
  } catch (error) {
    console.error(`[Batch] Error al enviar el correo múltiple a ${to}:`, error);
    return false;
  }
};
