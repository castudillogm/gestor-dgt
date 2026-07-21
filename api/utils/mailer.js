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
const generateEmailTemplate = (incidencia) => {
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
        .badge { display: inline-block; padding: 5px 12px; background-color: rgba(3, 169, 236, 0.1); color: #03A9EC; border-radius: 15px; font-weight: bold; font-size: 12px; }
        .title { color: #03A9EC; font-size: 20px; margin: 15px 0 10px; }
        .info-box { background-color: #F6F6F6; padding: 15px; border-radius: 15px; margin: 20px 0; }
        .footer { background-color: #F6F6F6; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GrupaMar</h1>
          <p>Transporte y Logística</p>
        </div>
        <div class="content">
          <span class="badge">ALERTA DGT: ${incidencia.tipo.replace('_', ' ')}</span>
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
export const sendAlertEmail = async (to, incidencia) => {
  try {
    const mailOptions = {
      from: `"Alertas GrupaMar" <${process.env.SMTP_USER}>`,
      to,
      subject: `Alerta de Tráfico GrupaMar: ${incidencia.tipo} en ${incidencia.carretera} (${incidencia.provincia})`,
      html: generateEmailTemplate(incidencia),
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
          <h1>GrupaMar</h1>
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
