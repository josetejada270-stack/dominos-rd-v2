const axios = require('axios');
const cfg = require('./config');

async function enviarTelegram(mensaje) {
  try {
    const token = cfg.TELEGRAM_BOT_TOKEN;
    const chatId = cfg.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
      console.log('⚠️ Telegram no configurado (falta token o chat_id)');
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: mensaje,
      parse_mode: 'HTML'
    });
    console.log('✅ Notificación Telegram enviada');
  } catch (error) {
    console.error('❌ Error enviando Telegram:', error.message);
  }
}

function notificarRetiro(usuario, monto, banco, cuenta, titular, id) {
  const mensaje = 
    `💸 <b>NUEVO RETIRO SOLICITADO</b>\n\n` +
    `👤 <b>Usuario:</b> ${usuario.nombre}\n` +
    `📧 <b>Email:</b> ${usuario.email}\n` +
    `💰 <b>Monto:</b> RD$ ${monto.toFixed(2)}\n` +
    `🏦 <b>Banco:</b> ${banco}\n` +
    `🔢 <b>Cuenta:</b> ${cuenta}\n` +
    `👤 <b>Titular:</b> ${titular}\n` +
    `🆔 <b>ID Transacción:</b> ${id}\n\n` +
    `🕒 ${new Date().toLocaleString('es-DO')}\n\n` +
    `👉 Revisa el panel admin para aprobar/rechazar.`;
  
  enviarTelegram(mensaje);
}

function notificarDeposito(usuario, monto, referencia, id) {
  const mensaje = 
    `💰 <b>NUEVA RECARGA SOLICITADA</b>\n\n` +
    `👤 <b>Usuario:</b> ${usuario.nombre}\n` +
    `📧 <b>Email:</b> ${usuario.email}\n` +
    `💵 <b>Monto:</b> RD$ ${monto.toFixed(2)}\n` +
    `🔖 <b>Referencia:</b> ${referencia}\n` +
    `🆔 <b>ID Transacción:</b> ${id}\n\n` +
    `🕒 ${new Date().toLocaleString('es-DO')}\n\n` +
    `👉 Revisa el comprobante en el panel admin.`;
  
  enviarTelegram(mensaje);
}

module.exports = { notificarRetiro, notificarDeposito };