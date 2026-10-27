require('dotenv').config();

// Cuenta bancaria real (la que veran los jugadores al recargar)
const CUENTA_ADMIN = {
  banco: 'BAN RESERVAS',
  cuenta: '9607148352',
  titular: 'Jose Rafael',
  tipo: 'Ahorro',
};

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'secret_dev',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  COMISION_CASA: parseFloat(process.env.COMISION_CASA || '0.05'),
  MIN_APUESTA: parseFloat(process.env.MIN_APUESTA || '50'),
  MAX_APUESTA: parseFloat(process.env.MAX_APUESTA || '5000'),
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  CUENTA_ADMIN,
};