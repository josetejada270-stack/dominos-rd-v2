const sqlite3 = require('sqlite3').verbose();
// Asegúrate de que esta ruta sea la misma donde está tu base de datos
const db = new sqlite3.Database('./data.db'); 

db.run(`ALTER TABLE users ADD COLUMN games_played INTEGER DEFAULT 0`, (err) => {
  if (err) {
    console.log('Nota: La columna ya existía o hubo un error:', err.message);
  } else {
    console.log('✅ ¡Listo! Columna para contar partidas agregada.');
  }
  db.close();
});