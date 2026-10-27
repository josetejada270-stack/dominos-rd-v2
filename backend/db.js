const { Pool } = require('pg');
require('dotenv').config();

// Conectar a Supabase (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tablas al iniciar
const initDB = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefono TEXT,
      password_hash TEXT NOT NULL,
      saldo REAL NOT NULL DEFAULT 0,
      partidas_jugadas INTEGER DEFAULT 0,
      estado TEXT DEFAULT 'ACTIVO',
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS transacciones (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      tipo TEXT NOT NULL,
      monto REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE',
      referencia TEXT,
      comprobante_url TEXT,
      datos_retiro TEXT,
      notas_admin TEXT,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS partidas (
      id SERIAL PRIMARY KEY,
      sala_id TEXT NOT NULL,
      apuesta REAL NOT NULL,
      pozo REAL NOT NULL,
      comision REAL NOT NULL,
      ganador_id INTEGER,
      ganancia REAL DEFAULT 0,
      jugadores_ids TEXT,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    )`);
    const configs = [
      ['banco', 'BAN RESERVAS'], ['cuenta', '9607148352'], ['titular', 'Jose Rafael'],
      ['tipo', 'Ahorro'], ['comision', '0.05'], ['min_apuesta', '50'], ['max_apuesta', '5000'],
      ['max_jugadores_sala', '4'], ['mensaje_bienvenida', '¡Bienvenido a Dominó RD!']
    ];
    for (const [clave, valor] of configs) {
      await pool.query(`INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO NOTHING`, [clave, valor]);
    }
    console.log('✅ Base de datos en la nube conectada y tablas listas.');
  } catch (err) {
    console.error('❌ Error al conectar con Supabase:', err.message);
  }
};
initDB();

const q = {
  crearUsuario: async (nombre, email, telefono, hash) => {
    const res = await pool.query(`INSERT INTO usuarios (nombre, email, telefono, password_hash) VALUES ($1, $2, $3, $4) RETURNING id`, [nombre, email, telefono, hash]);
    return { lastInsertRowid: res.rows[0].id };
  },
  getUserByEmail: async (email) => {
    const res = await pool.query(`SELECT * FROM usuarios WHERE email = $1`, [email]);
    return res.rows[0] || null;
  },
  getUserById: async (id) => {
    const res = await pool.query(`SELECT * FROM usuarios WHERE id = $1`, [id]);
    return res.rows[0] || null;
  },
  addSaldo: async (monto, id) => {
    await pool.query(`UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2`, [monto, id]);
  },
  subSaldo: async (monto, id) => {
    const res = await pool.query(`UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2 AND saldo >= $1`, [monto, id]);
    return res.rowCount > 0;
  },
  crearTrans: async (usuario_id, tipo, monto, referencia, url, datos) => {
    const res = await pool.query(`INSERT INTO transacciones (usuario_id, tipo, monto, referencia, comprobante_url, datos_retiro) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [usuario_id, tipo, monto, referencia, url, datos]);
    return { lastInsertRowid: res.rows[0].id };
  },
  getTransUsuario: async (usuario_id) => {
    const res = await pool.query(`SELECT * FROM transacciones WHERE usuario_id = $1 ORDER BY id DESC`, [usuario_id]);
    return res.rows;
  },
  getTransPendientes: async () => {
    const res = await pool.query(`SELECT t.*, u.nombre, u.email FROM transacciones t JOIN usuarios u ON u.id = t.usuario_id WHERE t.estado = 'PENDIENTE' ORDER BY t.id DESC`);
    return res.rows;
  },
  getTransById: async (id) => {
    const res = await pool.query(`SELECT * FROM transacciones WHERE id = $1`, [id]);
    return res.rows[0] || null;
  },
  setTransEstado: async (estado, notas, id) => {
    await pool.query(`UPDATE transacciones SET estado = $1, notas_admin = $2 WHERE id = $3`, [estado, notas, id]);
  },
  getUsuarios: async () => {
    const res = await pool.query(`SELECT id, nombre, email, telefono, saldo, partidas_jugadas, estado, creado_en FROM usuarios ORDER BY id DESC`);
    return res.rows;
  },
  crearPartida: async (sala_id, apuesta, pozo, comision, ganador_id, ganancia, jugadores_json) => {
    const res = await pool.query(`INSERT INTO partidas (sala_id, apuesta, pozo, comision, ganador_id, ganancia, jugadores_ids) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [sala_id, apuesta, pozo, comision, ganador_id, ganancia, jugadores_json]);
    return { lastInsertRowid: res.rows[0].id };
  },
  incrementarPartidasJugadas: async (id) => {
    await pool.query(`UPDATE usuarios SET partidas_jugadas = partidas_jugadas + 1 WHERE id = $1`, [id]);
  },
  getConfig: async () => {
    const res = await pool.query(`SELECT * FROM configuracion`);
    const config = {};
    res.rows.forEach(r => { config[r.clave] = r.valor; });
    return config;
  },
  setConfig: async (clave, valor) => {
    await pool.query(`INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = $2`, [clave, valor]);
  },
  setSaldoUsuario: async (id, saldo) => {
    await pool.query(`UPDATE usuarios SET saldo = $1 WHERE id = $2`, [saldo, id]);
  },
  deleteUsuario: async (id) => {
    await pool.query(`DELETE FROM usuarios WHERE id = $1`, [id]);
  },
  toggleUsuarioEstado: async (id) => {
    const res = await pool.query(`SELECT estado FROM usuarios WHERE id = $1`, [id]);
    const nuevoEstado = res.rows[0].estado === 'ACTIVO' ? 'BLOQUEADO' : 'ACTIVO';
    await pool.query(`UPDATE usuarios SET estado = $1 WHERE id = $2`, [nuevoEstado, id]);
    return nuevoEstado;
  },
  getTodasTransacciones: async (fechaInicio, fechaFin) => {
    let query = `SELECT t.*, u.nombre, u.email FROM transacciones t JOIN usuarios u ON u.id = t.usuario_id WHERE 1=1`;
    const params = [];
    if (fechaInicio) { query += ` AND DATE(t.creado_en) >= DATE($${params.length + 1})`; params.push(fechaInicio); }
    if (fechaFin) { query += ` AND DATE(t.creado_en) <= DATE($${params.length + 1})`; params.push(fechaFin); }
    query += ` ORDER BY t.id DESC LIMIT 200`;
    const res = await pool.query(query, params);
    return res.rows;
  },
  getPartidasByUsuario: async (usuario_id) => {
    const res = await pool.query(`SELECT * FROM partidas ORDER BY id DESC`);
    return res.rows.filter(p => {
      try { return JSON.parse(p.jugadores_ids).includes(usuario_id); } 
      catch { return false; }
    }).map(p => {
      const esGanador = p.ganador_id === usuario_id;
      return {
        id: p.id, fecha: p.creado_en, apuesta: p.apuesta,
        resultado: esGanador ? 'VICTORIA' : 'DERROTA',
        monto: esGanador ? `+${p.ganancia}` : `-${p.apuesta}`,
        sala: p.sala_id
      };
    });
  },
  getTransaccionesByUsuario: async (usuario_id) => {
    const res = await pool.query(`SELECT * FROM transacciones WHERE usuario_id = $1 ORDER BY id DESC`, [usuario_id]);
    return res.rows;
  }
};

module.exports = { pool, q };