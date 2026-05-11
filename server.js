// deploy: reviews fix
const http       = require('http');
const app        = require('./src/app');
const initSocket = require('./src/socket/socket');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, async () => {
  console.log(`🚀 Changuita API corriendo en puerto ${PORT}`);
  console.log(`📡 Entorno: ${process.env.NODE_ENV}`);
  try {
    const db = require('./src/config/database');
    await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`);
    console.log('✅ Migración payment_method OK');
  } catch (e) {
    console.log('Migración payment_method:', e.message);
  }
});

module.exports = server;