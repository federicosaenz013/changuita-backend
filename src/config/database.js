const { Pool } = require('pg');
require('dotenv').config();

console.log('Intentando conectar con:', {
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***' : 'NO HAY PASSWORD',
});

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    return;
  }
  console.log('✅ PostgreSQL conectado correctamente');
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};