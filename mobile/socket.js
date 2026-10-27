import { io } from 'socket.io-client';
import { BACKEND_URL, getToken } from './api';

let sock = null;

export async function getSocket() {
  if (sock) return sock;
  
  const token = await getToken();
  
  // Forzamos el uso de WebSockets puros. Esto elimina el retraso inicial del "polling"
  sock = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket'], 
    reconnection: true,
    forceNew: true,
    reconnectionAttempts: 5,
  });
  
  return sock;
}

export function closeSocket() {
  if (sock) {
    sock.disconnect();
    sock = null;
  }
}