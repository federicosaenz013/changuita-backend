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
    await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_amount_confirmed BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_amount NUMERIC`);

    // Suscripciones
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan            VARCHAR(20) NOT NULL DEFAULT 'free',
        status          VARCHAR(20) NOT NULL DEFAULT 'active',
        started_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at      TIMESTAMP,
        mp_payment_id   VARCHAR(100),
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Sanciones
    await db.query(`
      CREATE TABLE IF NOT EXISTS sanctions (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type            VARCHAR(20) NOT NULL,
        reason          TEXT NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'active',
        expires_at      TIMESTAMP,
        resolved_at     TIMESTAMP,
        resolved_by     UUID REFERENCES users(id),
        fine_paid       BOOLEAN DEFAULT false,
        fine_payment_id VARCHAR(100),
        created_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Plan en professional_profiles
    await db.query(`ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free'`);
    await db.query(`ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS sanctioned BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS sanction_expires_at TIMESTAMP`);

    console.log('✅ Migraciones OK');
  } catch (e) {
    console.log('Migración payment_method:', e.message);
  }
});

module.exports = server;