const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
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
    const [users, bookings, pendingDni, sanctions, professionals, ingresos, reports, clients] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM users`),
      db.query(`SELECT COUNT(*) FROM bookings`),
      db.query(`SELECT u.id, u.name, u.email, u.profile_photo, pp.dni_photo, pp.verification_status FROM professional_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.dni_photo IS NOT NULL ORDER BY CASE pp.verification_status WHEN 'pending' THEN 1 WHEN 'verified' THEN 2 ELSE 3 END`),
      db.query(`SELECT s.*, u.name FROM sanctions s JOIN users u ON s.professional_id = u.id WHERE s.status = 'active'`),
      db.query(`SELECT u.id, u.name, u.email, u.profile_photo, u.phone, u.created_at, u.dni, u.is_active, u.email_verified, pp.plan, pp.verification_status, pp.sanctioned, pp.description, pp.location_text, pp.rating, pp.reviews_count, pp.dni_photo, (SELECT COUNT(*) FROM bookings b WHERE b.professional_id = u.id AND b.status = 'completed') as trabajos FROM users u JOIN professional_profiles pp ON pp.user_id = u.id WHERE u.role = 'professional' ORDER BY CASE pp.plan WHEN 'full' THEN 1 WHEN 'medio' THEN 2 WHEN 'basico' THEN 3 ELSE 4 END`),
      db.query(`SELECT plan, COUNT(*) as cantidad FROM professional_profiles WHERE plan != 'free' GROUP BY plan`),
      db.query(`SELECT r.*, u1.name as reporter_name, u2.name as reported_name FROM reports r JOIN users u1 ON u1.id = r.reporter_id JOIN users u2 ON u2.id = r.reported_user_id WHERE r.status = 'pending' ORDER BY r.created_at DESC LIMIT 20`).catch(() => ({ rows: [] })),
      db.query(`SELECT u.id, u.name, u.email, u.profile_photo, u.phone, u.created_at, (SELECT COUNT(*) FROM bookings b WHERE b.client_id = u.id) as reservas FROM users u WHERE u.role = 'client' ORDER BY u.created_at DESC LIMIT 50`),
    ]);

    const precios = { basico: 3000, medio: 5000, full: 7000 };
    let ingresoMensual = 0;
    ingresos.rows.forEach(r => {
      ingresoMensual += (precios[r.plan] || 0) * parseInt(r.cantidad);
    });

    const filtro = req.query.filtro;
    const dnisFiltrados = filtro ? pendingDni.rows.filter(p => p.verification_status === filtro) : pendingDni.rows;

    const section = (id, title, content) => `
      <div style="background:white;border-radius:12px;margin-bottom:24px;border:1px solid #e2e8f0;overflow:hidden;">
        <div onclick="toggle('${id}')" style="padding:20px 24px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;user-select:none;">
          <h2 style="margin:0;font-size:18px;color:#1e293b;">${title}</h2>
          <span id="${id}-arrow" style="font-size:18px;color:#64748b;">▼</span>
        </div>
        <div id="${id}" style="padding:0 24px 24px;">
          ${content}
        </div>
      </div>
    `;

    const dniRows = dnisFiltrados.map(p => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">${p.name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">${p.email}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <a href="${p.dni_photo}" target="_blank"><img src="${p.dni_photo}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;" /></a>
          ${p.profile_photo ? `<br><a href="${p.profile_photo}" target="_blank"><img src="${p.profile_photo}" style="width:60px;height:60px;object-fit:cover;border-radius:50%;margin-top:6px;border:2px solid #e2e8f0;" /></a>` : '<br><span style="font-size:11px;color:#94a3b8;">Sin foto</span>'}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <span style="background:${p.verification_status === 'verified' ? '#dcfce7' : p.verification_status === 'rejected' ? '#fee2e2' : '#fef3c7'};padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;">${p.verification_status}</span>
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

    const profRows = professionals.rows.map(p => `
      <tr onclick="toggle('prof-${p.id}')" style="cursor:pointer;">
        <td style="padding:10px;border-bottom:1px solid #eee;">
          ${p.profile_photo ? `<img src="${p.profile_photo}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;vertical-align:middle;margin-right:8px;">` : ''}
          ${p.name}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;font-size:12px;color:#64748b;">${p.email}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <span style="background:${p.plan === 'full' ? '#fef3c7' : p.plan === 'medio' ? '#e9d5ff' : p.plan === 'basico' ? '#dbeafe' : '#f1f5f9'};padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;text-transform:capitalize;">${p.plan}</span>
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${p.trabajos}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          ${p.sanctioned ? '<span style="color:#ef4444;font-weight:600;font-size:12px;">⚠️ Sancionado</span>' : '<span style="color:#22c55e;font-size:12px;">✓ Activo</span>'}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;">▼</td>
      </tr>
      <tr id="prof-${p.id}" style="display:none;background:#f8fafc;">
        <td colspan="6" style="padding:16px;border-bottom:1px solid #eee;">
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div>
              ${p.profile_photo ? `<img src="${p.profile_photo}" style="width:80px;height:80px;border-radius:16px;object-fit:cover;">` : '<div style="width:80px;height:80px;background:#e2e8f0;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;">👤</div>'}
              ${p.dni_photo ? `<br><a href="${p.dni_photo}" target="_blank"><img src="${p.dni_photo}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;margin-top:6px;"></a>` : ''}
            </div>
            <div style="flex:1;">
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Email:</strong> ${p.email}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Teléfono:</strong> ${p.phone || 'No disponible'}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Zona:</strong> ${p.location_text || 'No especificada'}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Rating:</strong> ${p.rating || 0} ⭐ (${p.reviews_count || 0} reseñas)</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Descripción:</strong> ${p.description || 'Sin descripción'}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Miembro desde:</strong> ${new Date(p.created_at).toLocaleDateString('es-AR')}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Verificación:</strong> ${p.verification_status}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>N° DNI:</strong> ${p.dni || 'No cargado'}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Email verificado:</strong> ${p.email_verified ? '✅ Sí' : '❌ No'}</p>
              ${!p.email_verified ? `<a href="/admin/verify-email?id=${p.id}&password=${ADMIN_PASSWORD}" style="display:inline-block;background:#3898EC;color:white;padding:5px 12px;border-radius:6px;text-decoration:none;font-size:12px;margin-top:4px;">Verificar email</a>` : ''}
            </div>
            <div>
              <form method="POST" action="/admin/notify-user" style="display:flex;flex-direction:column;gap:8px;min-width:220px;">
                <input type="hidden" name="password" value="${ADMIN_PASSWORD}" />
                <input type="hidden" name="user_id" value="${p.id}" />
                <input name="title" placeholder="Título notificación" required style="padding:8px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;" />
                <textarea name="body" placeholder="Mensaje" required style="padding:8px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;height:60px;resize:none;"></textarea>
                <button type="submit" style="background:#3898EC;color:white;padding:8px;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">Enviar notificación</button>
              </form>
              ${p.is_active
                ? `<a href="/admin/toggle-active?id=${p.id}&action=suspend&password=${ADMIN_PASSWORD}" onclick="return confirm('¿Suspender la cuenta de ${p.name}?')" style="display:block;text-align:center;background:#ef4444;color:white;padding:8px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;margin-top:8px;">Suspender cuenta</a>`
                : `<a href="/admin/toggle-active?id=${p.id}&action=activate&password=${ADMIN_PASSWORD}" style="display:block;text-align:center;background:#22c55e;color:white;padding:8px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;margin-top:8px;">Reactivar cuenta</a>`
              }
            </div>
          </div>
        </td>
      </tr>
    `).join('');

    const clientRows = clients.rows.map(c => `
      <tr onclick="toggle('client-${c.id}')" style="cursor:pointer;">
        <td style="padding:10px;border-bottom:1px solid #eee;">
          ${c.profile_photo ? `<img src="${c.profile_photo}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;vertical-align:middle;margin-right:8px;">` : ''}
          ${c.name}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;font-size:12px;color:#64748b;">${c.email}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${c.reservas}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;font-size:12px;color:#64748b;">${new Date(c.created_at).toLocaleDateString('es-AR')}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">▼</td>
      </tr>
      <tr id="client-${c.id}" style="display:none;background:#f8fafc;">
        <td colspan="5" style="padding:16px;border-bottom:1px solid #eee;">
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div>
              ${c.profile_photo ? `<img src="${c.profile_photo}" style="width:80px;height:80px;border-radius:16px;object-fit:cover;">` : '<div style="width:80px;height:80px;background:#e2e8f0;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;">👤</div>'}
            </div>
            <div style="flex:1;">
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Email:</strong> ${c.email}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Teléfono:</strong> ${c.phone || 'No disponible'}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Reservas:</strong> ${c.reservas}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong>Miembro desde:</strong> ${new Date(c.created_at).toLocaleDateString('es-AR')}</p>
            </div>
            <div>
              <form method="POST" action="/admin/notify-user" style="display:flex;flex-direction:column;gap:8px;min-width:220px;">
                <input type="hidden" name="password" value="${ADMIN_PASSWORD}" />
                <input type="hidden" name="user_id" value="${c.id}" />
                <input name="title" placeholder="Título notificación" required style="padding:8px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;" />
                <textarea name="body" placeholder="Mensaje" required style="padding:8px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;height:60px;resize:none;"></textarea>
                <button type="submit" style="background:#3898EC;color:white;padding:8px;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">Enviar notificación</button>
              </form>
            </div>
          </div>
        </td>
      </tr>
    `).join('');

    const reportRows = reports.rows.map(r => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;font-size:13px;">${r.reporter_name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;font-size:13px;font-weight:600;">${r.reported_name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;font-size:13px;">${r.reason}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;font-size:12px;color:#64748b;">${r.details || '-'}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <a href="/admin/resolve-report?id=${r.id}&action=dismiss&password=${ADMIN_PASSWORD}" style="background:#94a3b8;color:white;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:12px;margin-right:4px;">Ignorar</a>
          <a href="/admin/resolve-report?id=${r.id}&action=warn&password=${ADMIN_PASSWORD}" style="background:#f59e0b;color:white;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:12px;">Advertir</a>
        </td>
      </tr>
    `).join('');

    res.send(`
      <html>
      <head>
        <title>Admin Changuita</title>
        <script>
          function toggle(id) {
            const el = document.getElementById(id);
            const arrow = document.getElementById(id + '-arrow');
            if (el) {
              el.style.display = el.style.display === 'none' ? '' : 'none';
            }
            if (arrow) {
              arrow.textContent = arrow.textContent === '▼' ? '▲' : '▼';
            }
          }
          // Cerrar todas las secciones al cargar
          window.onload = function() {
            ['sec-profesionales','sec-clientes','sec-dnis','sec-sanciones','sec-notif','sec-reportes'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.style.display = 'none';
            });
          }
        </script>
      </head>
      <body style="font-family:Arial;margin:0;background:#f8fafc;">
        <div style="background:#3898EC;padding:20px 32px;color:white;display:flex;justify-content:space-between;align-items:center;">
          <h1 style="margin:0;font-size:22px;">🔧 Panel Admin Changuita</h1>
          <a href="/admin" style="color:rgba(255,255,255,0.8);text-decoration:none;font-size:13px;">Cerrar sesión</a>
        </div>
        <div style="padding:32px;max-width:1200px;margin:0 auto;">

          <!-- Métricas -->
          <div style="display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap;">
            <div style="background:white;border-radius:12px;padding:20px;flex:1;min-width:180px;border:1px solid #e2e8f0;">
              <div style="font-size:32px;font-weight:700;color:#3898EC;">${users.rows[0].count}</div>
              <div style="color:#64748b;font-size:14px;">Usuarios totales</div>
            </div>
            <div style="background:white;border-radius:12px;padding:20px;flex:1;min-width:180px;border:1px solid #e2e8f0;">
              <div style="font-size:32px;font-weight:700;color:#22c55e;">${bookings.rows[0].count}</div>
              <div style="color:#64748b;font-size:14px;">Reservas totales</div>
            </div>
            <div style="background:white;border-radius:12px;padding:20px;flex:1;min-width:180px;border:1px solid #e2e8f0;">
              <div style="font-size:32px;font-weight:700;color:#f59e0b;">${pendingDni.rows.filter(p => p.verification_status === 'pending').length}</div>
              <div style="color:#64748b;font-size:14px;">DNIs pendientes</div>
            </div>
            <div style="background:white;border-radius:12px;padding:20px;flex:1;min-width:180px;border:1px solid #e2e8f0;">
              <div style="font-size:32px;font-weight:700;color:#ef4444;">${sanctions.rows.length}</div>
              <div style="color:#64748b;font-size:14px;">Sanciones activas</div>
            </div>
            <div style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:12px;padding:20px;flex:1;min-width:180px;color:white;">
              <div style="font-size:32px;font-weight:700;">$${ingresoMensual.toLocaleString('es-AR')}</div>
              <div style="font-size:14px;opacity:0.9;">Ingresos mensuales estimados (ARS)</div>
            </div>
          </div>

          ${section('sec-profesionales', `👷 Profesionales (${professionals.rows.length})`, `
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#f8fafc;">
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Nombre</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Email</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Plan</th>
                <th style="padding:10px;text-align:center;font-size:13px;color:#64748b;">Trabajos</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Estado</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;"></th>
              </tr></thead>
              <tbody>${profRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#94a3b8;">No hay profesionales</td></tr>'}</tbody>
            </table>
          `)}

          ${section('sec-clientes', `👤 Clientes (${clients.rows.length})`, `
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#f8fafc;">
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Nombre</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Email</th>
                <th style="padding:10px;text-align:center;font-size:13px;color:#64748b;">Reservas</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Miembro desde</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;"></th>
              </tr></thead>
              <tbody>${clientRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;">No hay clientes</td></tr>'}</tbody>
            </table>
          `)}

          ${section('sec-dnis', `📋 Verificación de DNIs`, `
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
              <a href="/admin/dashboard?password=${ADMIN_PASSWORD}&filtro=pending" style="padding:6px 14px;border-radius:999px;background:${req.query.filtro==='pending'?'#f59e0b':'#f8fafc'};color:${req.query.filtro==='pending'?'white':'#64748b'};text-decoration:none;font-size:13px;font-weight:600;border:1px solid #e2e8f0;">⏳ Pendientes (${pendingDni.rows.filter(p=>p.verification_status==='pending').length})</a>
              <a href="/admin/dashboard?password=${ADMIN_PASSWORD}&filtro=verified" style="padding:6px 14px;border-radius:999px;background:${req.query.filtro==='verified'?'#22c55e':'#f8fafc'};color:${req.query.filtro==='verified'?'white':'#64748b'};text-decoration:none;font-size:13px;font-weight:600;border:1px solid #e2e8f0;">✅ Verificados (${pendingDni.rows.filter(p=>p.verification_status==='verified').length})</a>
              <a href="/admin/dashboard?password=${ADMIN_PASSWORD}&filtro=rejected" style="padding:6px 14px;border-radius:999px;background:${req.query.filtro==='rejected'?'#ef4444':'#f8fafc'};color:${req.query.filtro==='rejected'?'white':'#64748b'};text-decoration:none;font-size:13px;font-weight:600;border:1px solid #e2e8f0;">❌ Rechazados (${pendingDni.rows.filter(p=>p.verification_status==='rejected').length})</a>
              <a href="/admin/dashboard?password=${ADMIN_PASSWORD}" style="padding:6px 14px;border-radius:999px;background:${!req.query.filtro?'#3898EC':'#f8fafc'};color:${!req.query.filtro?'white':'#64748b'};text-decoration:none;font-size:13px;font-weight:600;border:1px solid #e2e8f0;">Todos</a>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#f8fafc;">
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Nombre</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Email</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Fotos</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Estado</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Acción</th>
              </tr></thead>
              <tbody>${dniRows.length ? dniRows : '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;">No hay DNIs en esta categoría</td></tr>'}</tbody>
            </table>
          `)}

          ${section('sec-sanciones', `⚠️ Sanciones activas (${sanctions.rows.length})`, `
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#f8fafc;">
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Profesional</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Tipo</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Motivo</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Acción</th>
              </tr></thead>
              <tbody>${sanctionRows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;">No hay sanciones activas</td></tr>'}</tbody>
            </table>
          `)}

          ${section('sec-notif', `📢 Enviar notificación masiva`, `
            <form method="POST" action="/admin/notify-all" style="display:flex;flex-direction:column;gap:12px;max-width:500px;">
              <input type="hidden" name="password" value="${ADMIN_PASSWORD}" />
              <input name="title" placeholder="Título" required style="padding:10px;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;" />
              <textarea name="body" placeholder="Mensaje" required style="padding:10px;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;height:80px;resize:none;"></textarea>
              <select name="role" style="padding:10px;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;">
                <option value="">Todos los usuarios</option>
                <option value="professional">Solo profesionales</option>
                <option value="client">Solo clientes</option>
              </select>
              <button type="submit" style="background:#3898EC;color:white;padding:12px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Enviar notificación</button>
            </form>
          `)}

          ${reports.rows.length > 0 ? section('sec-reportes', `🚩 Reportes pendientes (${reports.rows.length})`, `
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#f8fafc;">
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Reportado por</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Reportado</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Motivo</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Detalles</th>
                <th style="padding:10px;text-align:left;font-size:13px;color:#64748b;">Acción</th>
              </tr></thead>
              <tbody>${reportRows}</tbody>
            </table>
          `) : ''}

        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/notify-user', async (req, res) => {
  const { password, user_id, title, body } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'No autorizado' });
  const { createNotification } = require('./modules/notifications/notifications.helper');
  try {
    await createNotification(user_id, title, body, 'broadcast');
    res.redirect(`/admin/dashboard?password=${ADMIN_PASSWORD}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/verify', async (req, res) => {
  const { id, action, password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.redirect('/admin');
  const db = require('./config/database');
  try {
    await db.query(`UPDATE professional_profiles SET verification_status = $1 WHERE user_id = $2`, [action, id]);
    try {
      const { createNotification } = require('./modules/notifications/notifications.helper');
      await createNotification(id, '✅ Identidad verificada', '¡Tu DNI fue aprobado! Ya podés usar todas las funciones de Changuita.', 'system');
    } catch {}
    if (action === 'verified') {
      const pushRes = await db.query('SELECT token FROM push_tokens WHERE user_id = $1', [id]);
      if (pushRes.rows[0]?.token) {
        try {
          const { Expo } = require('expo-server-sdk');
          const expo = new Expo();
          await expo.sendPushNotificationsAsync([{
            to: pushRes.rows[0].token,
            sound: 'default',
            title: '✅ Identidad verificada',
            body: '¡Tu DNI fue aprobado! Ya podés usar todas las funciones de Changuita.',
            data: { screen: 'ProfessionalDashboard' },
          }]);
        } catch (e) { console.log('Error push DNI verificado:', e.message); }
      }
    }
    if (action === 'rejected') {
      await db.query(`UPDATE users SET is_active = false WHERE id = $1`, [id]);
      const userRes = await db.query(`SELECT name, email FROM users WHERE id = $1`, [id]);
      if (userRes.rows.length > 0) {
        const { sendVerificationEmail } = require('./modules/email/email.service');
        const { name, email } = userRes.rows[0];
        try {
          await sendVerificationEmail(email, name, null, 'rejected');
        } catch (e) { console.log('Error enviando mail de rechazo:', e.message); }
      }
    }
    res.redirect(`/admin/dashboard?password=${ADMIN_PASSWORD}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/verify-email', async (req, res) => {
  const { id, password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.redirect('/admin');
  const db = require('./config/database');
  try {
    await db.query(
      `UPDATE users SET email_verified = true, verification_token = null, verification_token_expires = null WHERE id = $1`,
      [id]
    );
    res.redirect(`/admin/dashboard?password=${ADMIN_PASSWORD}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/toggle-active', async (req, res) => {
  const { id, action, password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.redirect('/admin');
  const db = require('./config/database');
  try {
    const nuevoEstado = action === 'activate';
    await db.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [nuevoEstado, id]);
    try {
      const { createNotification } = require('./modules/notifications/notifications.helper');
      if (nuevoEstado) {
        await createNotification(id, 'Cuenta reactivada', 'Tu cuenta de Changuita fue reactivada. Ya podés volver a usar la app.', 'system');
      }
    } catch {}
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

app.get('/admin/resolve-report', async (req, res) => {
  const { id, action, password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.redirect('/admin');
  const db = require('./config/database');
  try {
    await db.query(`UPDATE reports SET status = $1 WHERE id = $2`, [action === 'warn' ? 'warned' : 'dismissed', id]);
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

app.get('/setup/get-push-token', async (req, res) => {
  const db = require('./config/database');
  const { user_id } = req.query;
  const result = await db.query('SELECT token FROM push_tokens WHERE user_id = $1', [user_id]);
  res.json({ token: result.rows[0]?.token });
});

app.get('/setup/notify-incomplete-profiles', async (req, res) => {
  const db = require('./config/database');
  try {
    const result = await db.query(`
      SELECT u.id, u.name, pt.token
      FROM users u
      JOIN professional_profiles pp ON pp.user_id = u.id
      JOIN push_tokens pt ON pt.user_id = u.id
      WHERE u.role = 'professional'
        AND u.created_at > NOW() - INTERVAL '7 days'
        AND (pp.description IS NULL OR pp.description = ''
             OR pp.latitude IS NULL OR pp.dni_photo IS NULL
             OR pp.profile_photo IS NULL)
    `);
    const { Expo } = require('expo-server-sdk');
    const expo = new Expo();
    const messages = [];
    for (const u of result.rows) {
      if (!Expo.isExpoPushToken(u.token)) continue;
      messages.push({
        to: u.token,
        sound: 'default',
        title: 'Completá tu perfil 📋',
        body: `${u.name}, te falta completar tu perfil para empezar a recibir clientes.`,
        data: { screen: 'EditProfessionalProfile' },
      });
    }
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try { await expo.sendPushNotificationsAsync(chunk); } catch {}
    }
    res.json({ ok: true, enviados: messages.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/setup/check-expiring', async (req, res) => {
  const db = require('./config/database');
  try {
    const result = await db.query(`
      SELECT u.email, u.name, s.plan, s.expires_at
      FROM subscriptions s
      JOIN users u ON u.id = s.professional_id
      WHERE s.status IN ('active','trial')
        AND s.expires_at IS NOT NULL
        AND s.expires_at::date = (NOW() + INTERVAL '7 days')::date
    `);
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const u of result.rows) {
      try {
        await resend.emails.send({
          from: 'Changuita <no-reply@appchanguita.com.ar>',
          to: u.email,
          subject: '⏰ Tu plan de Changuita vence en 7 días',
          html: `<div style="font-family:Arial;max-width:500px;margin:0 auto;padding:20px;"><h2 style="color:#3898EC;">Hola ${u.name}</h2><p>Tu plan <strong>${u.plan}</strong> vence en 7 días.</p><p>Renová desde la app para no perder los beneficios.</p><p style="color:#94a3b8;font-size:13px;">El equipo de Changuita</p></div>`,
        });
      } catch (e) { console.log('Error mail vencimiento:', e.message); }
    }
    res.json({ ok: true, enviados: result.rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/setup/downgrade-expired', async (req, res) => {
  const db = require('./config/database');
  try {
    const expired = await db.query(`
      SELECT u.email, u.name, s.professional_id
      FROM subscriptions s
      JOIN users u ON u.id = s.professional_id
      WHERE s.status IN ('active','trial')
        AND s.expires_at IS NOT NULL
        AND s.expires_at < NOW()
    `);
    await db.query(`UPDATE subscriptions SET status = 'expired' WHERE status IN ('active','trial') AND expires_at IS NOT NULL AND expires_at < NOW()`);
    for (const row of expired.rows) {
      await db.query(`UPDATE professional_profiles SET plan = 'free' WHERE user_id = $1`, [row.professional_id]);
    }
    const { sendPlanExpiredEmail } = require('./modules/email/email.service');
    for (const u of expired.rows) {
      try { await sendPlanExpiredEmail(u.email, u.name); } catch {}
    }
    res.json({ ok: true, bajados: expired.rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
  const db = require('./config/database');
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { reported_user_id, reason, details } = req.body;
    if (!reported_user_id || !reason) return res.status(400).json({ error: 'Faltan datos' });
    await db.query(
      `INSERT INTO reports (reporter_id, reported_user_id, reason, details, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [decoded.userId, reported_user_id, reason, details || null]
    );
    res.json({ ok: true, message: 'Reporte enviado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/setup/migrate-reports', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        reporter_id UUID REFERENCES users(id),
        reported_user_id UUID REFERENCES users(id),
        reason VARCHAR(100) NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/setup/migrate-verification-status', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`ALTER TABLE professional_profiles ALTER COLUMN verification_status TYPE VARCHAR(20)`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/admin/notify-all', async (req, res) => {
  const { password, title, body, role } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'No autorizado' });
  const db = require('./config/database');
  const { createNotification } = require('./modules/notifications/notifications.helper');
  try {
    let query = `SELECT id FROM users WHERE is_active = true`;
    if (role === 'professional') query += ` AND role = 'professional'`;
    if (role === 'client') query += ` AND role = 'client'`;
    const users = await db.query(query);
    for (const u of users.rows) {
      await createNotification(u.id, title, body, 'broadcast');
    }
    res.json({ ok: true, enviados: users.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/setup/migrate-notifications', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'system',
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/setup/migrate-cancelled-by', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20)`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/setup/verify-existing-users', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`UPDATE users SET email_verified = true WHERE email_verified = false OR email_verified IS NULL`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/setup/migrate-dni-phone', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dni VARCHAR(20)`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dni_verified BOOLEAN DEFAULT false`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_dni_unique ON users (dni) WHERE dni IS NOT NULL`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/setup/fix-ratings', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query(`
      UPDATE professional_profiles pp
      SET
        rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE r.professional_id = pp.user_id), 0),
        reviews_count = COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.professional_id = pp.user_id), 0),
        updated_at = NOW()
    `);
    res.json({ ok: true, message: 'Ratings actualizados correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use(require('./middleware/errorHandler'));

module.exports = app;