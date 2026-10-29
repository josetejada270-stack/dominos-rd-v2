const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const cfg = require('./config');
const { q } = require('./db');
const { Partida } = require('./engine');
const { notificarRetiro, notificarDeposito } = require('./notificaciones');

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)|application\/pdf/.test(file.mimetype);
    cb(ok ? null : new Error('Formato no válido'), ok);
  },
});
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sin token' });
  try { req.user = jwt.verify(token, cfg.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }
}

function adminAuth(req, res, next) {
  const t = req.headers['x-admin-token'];
  try {
    const p = jwt.verify(t, cfg.JWT_SECRET);
    if (p.role !== 'admin') throw 0;
    next();
  } catch { return res.status(403).json({ error: 'No autorizado' }); }
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const config = await q.getConfig();
    if (config.registros_activos === '0') return res.status(403).json({ error: 'Los registros están desactivados temporalmente.' });
    const { nombre, email, password, telefono } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan datos' });
    const existe = await q.getUserByEmail(email);
    if (existe) return res.status(400).json({ error: 'Email ya registrado' });
    const hash = bcrypt.hashSync(password, 10);
    const info = await q.crearUsuario(nombre, email, telefono || null, hash);
    const token = jwt.sign({ id: info.lastInsertRowid, email }, cfg.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, usuario: { id: info.lastInsertRowid, nombre, email, saldo: 0 } });
  } catch (e) { res.status(500).json({ error: 'Error del servidor' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await q.getUserByEmail(email);
    if (!u || !bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (u.estado === 'BLOQUEADO') return res.status(403).json({ error: 'Tu cuenta ha sido bloqueada temporalmente. Contacta al soporte.' });
    
    const token = jwt.sign({ id: u.id, email: u.email }, cfg.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, usuario: { id: u.id, nombre: u.nombre, email: u.email, saldo: u.saldo } });
  } catch (e) { res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/me', auth, async (req, res) => {
  try {
    const u = await q.getUserById(req.user.id);
    if (u.estado === 'BLOQUEADO') return res.status(403).json({ error: 'Cuenta bloqueada' });
    res.json({ usuario: { id: u.id, nombre: u.nombre, email: u.email, telefono: u.telefono, saldo: u.saldo, partidas_jugadas: u.partidas_jugadas || 0 } });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.get('/api/config/public', async (req, res) => {
  try {
    const config = await q.getConfig();
    res.json({
      cuentaAdmin: { banco: config.banco, cuenta: config.cuenta, titular: config.titular, tipo: config.tipo },
      comisionCasa: parseFloat(config.comision),
      minApuesta: parseFloat(config.min_apuesta),
      maxApuesta: parseFloat(config.max_apuesta),
      maxJugadoresSala: parseInt(config.max_jugadores_sala) || 4,
      mensajeBienvenida: config.mensaje_bienvenida || '¡Bienvenido!'
    });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/wallet/deposit', auth, upload.single('comprobante'), async (req, res) => {
  try {
    const config = await q.getConfig();
    if (config.depositos_activos === '0') return res.status(403).json({ error: 'Los depósitos están desactivados temporalmente.' });
    
    const monto = parseFloat(req.body.monto);
    if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' });
    const url = req.file ? `/uploads/${req.file.filename}` : null;
    const info = await q.crearTrans(req.user.id, 'DEPOSITO', monto, req.body.referencia || null, url, null);
    try {
      const usuarioNotif = await q.getUserById(req.user.id);
      notificarDeposito(usuarioNotif, monto, req.body.referencia || 'Sin referencia', info.lastInsertRowid);
    } catch (notifError) { console.warn('⚠️ Error notificando depósito:', notifError.message); }
    res.json({ ok: true, id: info.lastInsertRowid, estado: 'PENDIENTE' });
  } catch (e) { console.error(e); if (!res.headersSent) res.status(500).json({ error: 'Error del servidor' }); }
});

app.post('/api/wallet/withdraw', auth, async (req, res) => {
  try {
    const { monto, banco, cuenta, titular } = req.body;
    const m = parseFloat(monto);
    if (!m || m <= 0) return res.status(400).json({ error: 'Monto inválido' });
    if (!banco || !cuenta || !titular) return res.status(400).json({ error: 'Faltan datos bancarios' });
    const u = await q.getUserById(req.user.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (u.saldo < m) return res.status(400).json({ error: 'Saldo insuficiente' });
    const ok = await q.subSaldo(m, req.user.id);
    if (!ok) return res.status(400).json({ error: 'Saldo insuficiente' });
    const datos = JSON.stringify({ banco, cuenta, titular });
    const info = await q.crearTrans(req.user.id, 'RETIRO', m, null, null, datos);
    try { notificarRetiro(u, m, banco, cuenta, titular, info.lastInsertRowid); } catch (notifError) { console.warn('⚠️ Error notificando retiro:', notifError.message); }
    res.json({ ok: true, id: info.lastInsertRowid, estado: 'PENDIENTE', saldo: u.saldo - m });
  } catch (e) { console.error(e); if (!res.headersSent) res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/wallet/transactions', auth, async (req, res) => {
  try { res.json(await q.getTransUsuario(req.user.id)); } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// --- RUTAS DE ADMINISTRADOR ---
app.post('/api/admin/login', (req, res) => {
  if (req.body.password !== cfg.ADMIN_PASSWORD) return res.status(403).json({ error: 'Contraseña incorrecta' });
  const token = jwt.sign({ role: 'admin' }, cfg.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

app.get('/api/admin/pendientes', adminAuth, async (req, res) => { try { res.json(await q.getTransPendientes()); } catch(e){res.status(500).json({error:'Error'});} });
app.get('/api/admin/usuarios', adminAuth, async (req, res) => { try { res.json(await q.getUsuarios()); } catch(e){res.status(500).json({error:'Error'});} });

// NUEVO: Historial de transacciones con filtro de fechas
app.get('/api/admin/transacciones/historial', adminAuth, async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    const trans = await q.getTodasTransacciones(inicio, fin);
    res.json(trans);
  } catch (e) { res.status(500).json({ error: 'Error al obtener historial' }); }
});

// NUEVO: Bloquear/Desbloquear usuario
app.post('/api/admin/usuario/:id/bloquear', adminAuth, async (req, res) => {
  try {
    const nuevoEstado = await q.toggleUsuarioEstado(req.params.id);
    res.json({ ok: true, estado: nuevoEstado });
  } catch (e) { res.status(500).json({ error: 'Error al cambiar estado' }); }
});

app.get('/api/admin/usuario/:id/detalles', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const usuario = await q.getUserById(userId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const partidas = await q.getPartidasByUsuario(userId);
    const transacciones = await q.getTransaccionesByUsuario(userId);
    res.json({ usuario, partidas, transacciones });
  } catch (e) { res.status(500).json({ error: 'Error al obtener detalles' }); }
});

app.post('/api/admin/aprobar/:id', adminAuth, async (req, res) => {
  try {
    const t = await q.getTransById(req.params.id);
    if (!t || t.estado !== 'PENDIENTE') return res.status(400).json({ error: 'No aplicable' });
    if (t.tipo === 'DEPOSITO') await q.addSaldo(t.monto, t.usuario_id);
    await q.setTransEstado('APROBADO', req.body.notas || null, t.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/admin/rechazar/:id', adminAuth, async (req, res) => {
  try {
    const t = await q.getTransById(req.params.id);
    if (!t || t.estado !== 'PENDIENTE') return res.status(400).json({ error: 'No aplicable' });
    if (t.tipo === 'RETIRO') await q.addSaldo(t.monto, t.usuario_id);
    await q.setTransEstado('RECHAZADO', req.body.notas || null, t.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.get('/api/admin/config', adminAuth, async (req, res) => { try { res.json(await q.getConfig()); } catch (e) { res.status(500).json({ error: 'Error' }); } });

app.post('/api/admin/config', adminAuth, async (req, res) => {
  try {
    const { clave, valor } = req.body;
    await q.setConfig(clave, valor);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/admin/usuario/:id/saldo', adminAuth, async (req, res) => {
  try {
    await q.setSaldoUsuario(req.params.id, parseFloat(req.body.saldo));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/admin/usuario/:id/eliminar', adminAuth, async (req, res) => {
  try {
    await q.deleteUsuario(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});
// --------------------------------

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, transports: ['websocket', 'polling'], pingTimeout: 60000, pingInterval: 25000 });
const salas = new Map();

function aplicarPenalidadPorAbandono(sala, jugadorQueSalió) {
  console.log(`[PENALIDAD] ${jugadorQueSalió.nombre} se desconectó. Pierde su apuesta.`);
  sala.jugadores.forEach(async (j) => {
    if (j.userId !== jugadorQueSalió.userId) {
      await q.addSaldo(sala.apuesta, j.userId);
    }
  });
  io.to(sala.id).emit('juego:sala_cerrada', { motivo: `⚠️ Partida cancelada: ${jugadorQueSalió.nombre} se desconectó y perdió su apuesta.` });
  salas.delete(sala.id);
}

function broadcastEstado(sala) {
  io.to(sala.id).emit('juego:estado', {
    tablero: sala.partida.tablero, turno: sala.partida.turno, pozo: sala.partida.mazo.length,
    jugadores: sala.jugadores.map((j, i) => ({ nombre: j.nombre, fichas: sala.partida.manos[i].length })),
    terminada: sala.partida.terminada, ganador: sala.partida.ganador,
  });
}

io.use((socket, next) => {
  try {
    const p = jwt.verify(socket.handshake.auth.token, cfg.JWT_SECRET);
    socket.data.userId = p.id;
    q.getUserById(p.id).then(u => { 
      if (u.estado === 'BLOQUEADO') return next(new Error('bloqueado'));
      socket.data.nombre = u.nombre; next(); 
    }).catch(() => next(new Error('no_auth')));
  } catch { next(new Error('no_auth')); }
});

io.on('connection', (socket) => {
  socket.on('salon:listar', (cb) => {
    const lista = [...salas.values()].filter(s => s.estado === 'esperando').map(s => ({ id: s.id, apuesta: s.apuesta, jugadores: s.jugadores.length, max: 4 }));
    if (typeof cb === 'function') cb(lista);
  });

  socket.on('salon:crear', async ({ apuesta }, cb) => {
    try {
      const ap = parseFloat(apuesta);
      const config = await q.getConfig();
      const maxJug = parseInt(config.max_jugadores_sala) || 4;
      if (!ap || ap < cfg.MIN_APUESTA || ap > cfg.MAX_APUESTA) return cb && cb({ error: `Apuesta entre ${cfg.MIN_APUESTA} y ${cfg.MAX_APUESTA}` });
      const ok = await q.subSaldo(ap, socket.data.userId);
      if (!ok) return cb && cb({ error: 'Saldo insuficiente' });
      const id = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const sala = { id, apuesta: ap, estado: 'esperando', jugadores: [{ socketId: socket.id, userId: socket.data.userId, nombre: socket.data.nombre, indice: 0 }], partida: null, maxJug };
      salas.set(id, sala);
      socket.join(id);
      cb && cb({ salaId: id });
      io.to(id).emit('salon:estado', { jugadores: sala.jugadores.map(j => j.nombre), apuesta: ap, estado: 'esperando' });
    } catch(e) { cb && cb({error: 'Error'}); }
  });

  socket.on('salon:unirse', async ({ salaId }, cb) => {
    try {
      const sala = salas.get(salaId);
      if (!sala || sala.estado !== 'esperando') return cb && cb({ error: 'Sala no disponible' });
      if (sala.jugadores.length >= (sala.maxJug || 4)) return cb && cb({ error: 'Sala llena' });
      if (sala.jugadores.some(j => j.userId === socket.data.userId)) return cb && cb({ error: 'Ya estás en la sala' });
      const ok = await q.subSaldo(sala.apuesta, socket.data.userId);
      if (!ok) return cb && cb({ error: 'Saldo insuficiente' });
      const indice = sala.jugadores.length;
      sala.jugadores.push({ socketId: socket.id, userId: socket.data.userId, nombre: socket.data.nombre, indice });
      socket.join(salaId);
      cb && cb({ salaId, indice });
      io.to(salaId).emit('salon:estado', { jugadores: sala.jugadores.map(j => j.nombre), apuesta: sala.apuesta, estado: 'esperando' });
      if (sala.jugadores.length >= 2) iniciarPartida(sala);
    } catch(e) { cb && cb({error: 'Error'}); }
  });

  function iniciarPartida(sala) {
    try {
      sala.partida = new Partida(sala.jugadores, sala.apuesta);
      sala.estado = 'jugando';
      sala.jugadores.forEach(j => {
        const mano = sala.partida.manos ? sala.partida.manos[j.indice] : [];
        io.to(j.socketId).emit('juego:iniciado', { salaId: sala.id, miIndice: j.indice, misFichas: mano, apuesta: sala.apuesta });
      });
      broadcastEstado(sala);
    } catch (err) { console.error(`Error al iniciar partida:`, err); }
  }

  socket.on('juego:jugar', ({ salaId, fichaId, lado }) => {
    const sala = salas.get(salaId); if (!sala || !sala.partida) return;
    const j = sala.jugadores.find(x => x.socketId === socket.id || x.userId === socket.data.userId); if (!j) return;
    j.socketId = socket.id; 
    const res = sala.partida.jugar(j.indice, fichaId, lado);
    if (res.error) return socket.emit('juego:error', { msg: res.error });
    io.to(salaId).emit('juego:ficha', { indice: j.indice, ficha: res.ficha, lado: res.lado });
    broadcastEstado(sala);
    if (sala.partida.terminada) finalizar(sala);
  });

  socket.on('juego:robar', ({ salaId }) => {
    const sala = salas.get(salaId); if (!sala || !sala.partida) return;
    const j = sala.jugadores.find(x => x.socketId === socket.id); if (!j) return;
    const res = sala.partida.robar(j.indice);
    if (res.error) return socket.emit('juego:error', { msg: res.error });
    socket.emit('juego:robo', { ficha: res.ficha });
    broadcastEstado(sala);
  });

  socket.on('juego:pasar', ({ salaId }) => {
    const sala = salas.get(salaId); if (!sala || !sala.partida) return;
    const j = sala.jugadores.find(x => x.socketId === socket.id || x.userId === socket.data.userId); if (!j) return;
    j.socketId = socket.id; 
    const res = sala.partida.pasar(j.indice);
    if (res.esTrampa) {
      sala.partida.terminada = true;
      sala.partida.ganador = (j.indice + 1) % sala.jugadores.length;
      io.to(salaId).emit('juego:trampa', { nombre: j.nombre, msg: `🚨 ¡${j.nombre.toUpperCase()} PASÓ CON FICHA! PIERDE LA PARTIDA.` });
      setTimeout(() => finalizar(sala), 1500); 
      return;
    }
    if (res.error) return socket.emit('juego:error', { msg: res.error });
    broadcastEstado(sala);
  });
  // 💬 SISTEMA DE CHAT EN SALA
  socket.on('chat:enviar', ({ salaId, texto }) => {
    const sala = salas.get(salaId);
    if (!sala) return;
    
    const jugador = sala.jugadores.find(j => j.socketId === socket.id || j.userId === socket.data.userId);
    if (!jugador) return;

    io.to(salaId).emit('chat:msg', {
      nombre: jugador.nombre,
      texto: texto.trim(),
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', async () => {
  socket.on('disconnect', async () => {
    for (const sala of salas.values()) {
      const idx = sala.jugadores.findIndex(j => j.socketId === socket.id);
      if (idx === -1) continue; 
      const jugadorDesconectado = sala.jugadores[idx];
      if (sala.estado === 'esperando') {
        await q.addSaldo(sala.apuesta, jugadorDesconectado.userId);
        sala.jugadores.splice(idx, 1);
        if (sala.jugadores.length === 0) salas.delete(sala.id);
        else io.to(sala.id).emit('salon:estado', { jugadores: sala.jugadores.map(j => j.nombre), apuesta: sala.apuesta, estado: 'esperando' });
      } else if (sala.estado === 'jugando') {
        aplicarPenalidadPorAbandono(sala, jugadorDesconectado);
      }
      break; 
    }
  });
});

function finalizar(sala) {
  const p = sala.partida;
  const pozo = sala.apuesta * sala.jugadores.length;
  const comision = +(pozo * cfg.COMISION_CASA).toFixed(2);
  const pagoBase = +(pozo - comision).toFixed(2);
  let puntosRestantes = 0;
  p.manos.forEach((mano, i) => { if (i !== p.ganador) mano.forEach(f => puntosRestantes += (f.v1 + f.v2)); });
  const totalPagar = pagoBase + puntosRestantes;
  const ganador = sala.jugadores[p.ganador];
  
  q.addSaldo(totalPagar, ganador.userId);
  q.crearPartida(sala.id, sala.apuesta, pozo, comision, ganador.userId, totalPagar, JSON.stringify(sala.jugadores.map(j => j.userId)));
  sala.jugadores.forEach(async (jugador) => { try { await q.incrementarPartidasJugadas(jugador.userId); } catch (err) { console.error(err); } });
  io.to(sala.id).emit('juego:fin', { ganadorIndice: p.ganador, ganadorNombre: ganador.nombre, pozo, comision, pagoBase, puntosRestantes, totalGanado: totalPagar });
  salas.delete(sala.id);
}

server.listen(cfg.PORT, () => console.log(`✅ Backend en http://localhost:${cfg.PORT}  |  Panel admin: http://localhost:${cfg.PORT}/admin.html`));
