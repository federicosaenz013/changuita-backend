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
app.use('/api/notifications', require('./modules/notifications/notifications.routes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/setup/fix-ratings', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`
      UPDATE professional_profiles pp
      SET
        rating = COALESCE((
          SELECT ROUND(AVG(r.rating)::numeric, 2)
          FROM reviews r
          WHERE r.professional_id = pp.user_id
        ), 0),
        reviews_count = COALESCE((
          SELECT COUNT(*)
          FROM reviews r
          WHERE r.professional_id = pp.user_id
        ), 0),
        updated_at = NOW()
    `);
    res.json({ ok: true, message: 'Ratings actualizados correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use(require('./middleware/errorHandler'));

module.exports = app;