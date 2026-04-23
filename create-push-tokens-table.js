const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://changuita_db_user:vkXtHlGNIiCxSoSFNqDekwaMYuUHFHbE@dpg-cvp1b8aj1k6c73db3v40-a.oregon-postgres.render.com/changuita_db',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

const createTable = async () => {
  let client;
  try {
    console.log('Conectando a la base de datos...');
    client = await pool.connect();
    console.log('✅ Conectado');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        platform VARCHAR(10) DEFAULT 'expo',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, token)
      );
    `);
    console.log('✅ Tabla push_tokens creada correctamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
};

createTable();