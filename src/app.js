const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas solicitudes, intentá de nuevo en 15 minutos.',
});
app.use('/api/', limiter);

app.use('/api/auth',          require('./modules/auth/auth.routes'));
app.use('/api/users',         require('./modules/users/users.routes'));
app.use('/api/professionals', require('./modules/professionals/professionals.routes'));
app.use('/api/services',      require('./modules/services/services.routes'));
app.use('/api/bookings',      require('./modules/bookings/bookings.routes'));
app.use('/api/payments',      require('./modules/payments/payments.routes'));
app.use('/api/reviews',       require('./modules/reviews/reviews.routes'));
app.use('/api/messages',      require('./modules/messages/messages.routes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/setup/push-tokens', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`
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
    res.json({ ok: true, message: 'Tabla push_tokens creada correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use(require('./middleware/errorHandler'));

module.exports = app;