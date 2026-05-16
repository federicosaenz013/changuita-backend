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
app.use(express.urlencoded({ extended: true }));
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
app.use('/api/ai',            require('./modules/ai/ai.routes'));
app.use('/api/client-reviews', require('./modules/client-reviews/client-reviews.routes'));
app.use('/api/sanctions',      require('./modules/sanctions/sanctions.routes'));
app.use('/api/subscriptions',  require('./modules/subscriptions/subscriptions.routes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Panel admin
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changuita2024admin';

app.get('/admin', (req, res) => {
  const { password } = req.query;
  if (password !== ADMIN_PASSWORD) {
    return res.send(`
      <html><body style="font-family:Arial;text-align:center;padding:60px;">
        <h2>Panel Admin Changuita</h2>
        <form action="/admin" method="get">
          <input type="password" name="password" placeholder="Contraseña" style="padding:10px;font-size:16px;border-radius:8px;border:1px solid #ddd;margin-right:8px;" />
          <button type="submit" style="padding:10px 20px;background:#3898EC;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">Entrar</button>
        </form>
      </body></html>
    `);
  }
  res.redirect(`/admin/dashboard?password=${ADMIN_PASSWORD}`);
});

app.get('/admin/dashboard', async (req, res) => {
  const { password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.redirect('/admin');
  const db = require('./config/database');
  try {
    const [users, bookings, pendingDni, sanctions] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM users`),
      db.query(`SELECT COUNT(*) FROM bookings`),
      db.query(`SELECT u.id, u.name, u.email, pp.dni_photo, pp.verification_status FROM professional_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.dni_photo IS NOT NULL ORDER BY pp.verification_status`),
      db.query(`SELECT s.*, u.name FROM sanctions s JOIN users u ON s.professional_id = u.id WHERE s.status = 'active'`),
    ]);

    const dniRows = pendingDni.rows.map(p => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">${p.name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">${p.email}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <a href="${p.dni_photo}" target="_blank"><img src="${p.dni_photo}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;" /></a>
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <span style="background:${p.verification_status === 'verified' ? '#dcfce7' : p.verification_status === 'rejected' ? '#fee2e2' : '#fef3c7'};padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;">
            ${p.verification_status}
          </span>
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <a href="/admin/verify?id=${p.id}&action=verified&password=${ADMIN_PASSWORD}" style="background:#22c55e;color:white;padding:6px 12px;border-radius:6px;text-decoration:none;margin-right:6px;font-size:13px;">Aprobar</a>
          <a href="/admin/verify?id=${p.id}&action=rejected&password=${ADMIN_PASSWORD}" style="background:#ef4444;color:white;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:13px;">Rechazar</a>
        </td>
      </tr>
    `).join('');

    const sanctionRows = sanctions.rows.map(s => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">${s.name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">${s.type}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">${s.reason}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <a href="/admin/unsanction?id=${s.id}&professional_id=${s.professional_id}&password=${ADMIN_PASSWORD}" style="background:#3898EC;color:white;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:13px;">Levantar</a>
        </td>
      </tr>
    `).join('');

    res.send(`
      <html>
      <head><title>Admin Changuita</title></head>
      <body style="font-family:Arial;margin:0;background:#f8fafc;">
        <div style="background:#3898EC;padding:20px 32px;color:white;display:flex;justify-content:space-between;align-items:center;">
          <h1 style="margin:0;font-size:22px;">🔧 Panel Admin Changuita</h1>
          <a href="/admin" style="color:rgba(255,255,255,0.8);text-decoration:none;font-size:13px;">Cerrar sesión</a>
        </div>
        <div style="padding:32px;max-width:1100px;margin:0 auto;">
          
          <!-- Métricas -->
          <div style="display:flex;gap:16px;margin-bottom:32px;">
            <div style="background:white;border-radius:12px;padding:20px;flex:1;border:1px solid #e2e8f0;">
              <div style="font-size:32px;font-weight:700;color:#3898EC;">${users.rows[0].count}</div>
              <div style="color:#64748b;font-size:14px;">Usuarios totales</div>
            </div>
            <div style="background:white;border-radius:12px;padding:20px;flex:1;border:1px solid #e2e8f0;">
              <div style="font-size:32px;font-weight:700;color:#22c55e;">${bookings.rows[0].count}</div>
              <div style="color:#64748b;font-size:14px;">Reservas totales</div>
            </div>
            <div style="background:white;border-radius:12px;padding:20px;flex:1;border:1px solid #e2e8f0;">
              <div style="font-size:32px;font-weight:700;color:#f59e0b;">${pendingDni.rows.filter(p => p.verification_status === 'pending').length}</div>
              <div style="color:#64748b;font-size:14px;">DNIs pendientes</div>
            </div>
            <div style="background:white;border-radius:12px;padding:20px;flex:1;border:1px solid #e2e8f0;">
              <div style="font-size:32px;font-weight:700;color:#ef4444;">${sanctions.rows.length}</div>
              <div style="color:#64748b;font-size:14px;">Sanciones activas</div>
            </div>
          </div>

          <!-- DNIs -->
          <div style="background:white;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid #e2e8f0;">
            <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">📋 Verificación de DNIs</h2>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Nombre</th>
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Email</th>
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">DNI</th>
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Estado</th>
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Acción</th>
                </tr>
              </thead>
              <tbody>${dniRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;">No hay DNIs para verificar</td></tr>'}</tbody>
            </table>
          </div>

          <!-- Sanciones -->
          <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
            <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">⚠️ Sanciones activas</h2>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Profesional</th>
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Tipo</th>
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Motivo</th>
                  <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Acción</th>
                </tr>
              </thead>
              <tbody>${sanctionRows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;">No hay sanciones activas</td></tr>'}</tbody>
            </table>
          </div>

        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/verify', async (req, res) => {
  const { id, action, password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.redirect('/admin');
  const db = require('./config/database');
  try {
    await db.query(
      `UPDATE professional_profiles SET verification_status = $1 WHERE user_id = $2`,
      [action, id]
    );
    if (action === 'rejected') {
      await db.query(`UPDATE users SET is_active = false WHERE id = $1`, [id]);
      const userRes = await db.query(`SELECT name, email FROM users WHERE id = $1`, [id]);
      if (userRes.rows.length > 0) {
        const { sendVerificationEmail } = require('./modules/email/email.service');
        const { name, email } = userRes.rows[0];
        try {
          await sendVerificationEmail(email, name, null, 'rejected');
        } catch (e) {
          console.log('Error enviando mail de rechazo:', e.message);
        }
      }
    }
    res.redirect(`/admin/dashboard?password=${ADMIN_PASSWORD}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/unsanction', async (req, res) => {
  const { id, professional_id, password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.redirect('/admin');
  const db = require('./config/database');
  try {
    await db.query(`UPDATE sanctions SET status = 'resolved', resolved_at = NOW() WHERE id = $1`, [id]);
    await db.query(`UPDATE professional_profiles SET sanctioned = false, sanction_expires_at = null, is_available = true WHERE user_id = $1`, [professional_id]);
    res.redirect(`/admin/dashboard?password=${ADMIN_PASSWORD}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/setup/migrate', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`);
    await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_amount_confirmed BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_amount NUMERIC`);
    res.json({ ok: true, message: 'Migraciones ejecutadas' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
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