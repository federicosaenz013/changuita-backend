const db = require('../../config/database');

const PLANES = {
  free:   { nombre: 'Free',    precio_mensual: 0,  precio_anual: 0,     max_servicios: 1,    destacado_mapa: false, badge: false, orden: 4 },
  basico: { nombre: 'Básico',  precio_mensual: 2,  precio_anual: 19.20, max_servicios: 3,    destacado_mapa: false, badge: false, orden: 3 },
  medio:  { nombre: 'Medio',   precio_mensual: 3,  precio_anual: 28.80, max_servicios: 6,    destacado_mapa: true,  badge: false, orden: 2 },
  full:   { nombre: 'Full',    precio_mensual: 5,  precio_anual: 48,    max_servicios: null, destacado_mapa: true,  badge: true,  orden: 1 },
};

const PRIMEROS_200_DIAS = 90;
const TRIAL_DIAS = 30;
const DESCUENTO_ANUAL = 0.20;
const LIMITE_EARLY_ADOPTERS = 200;

const getPlan = async (professionalId) => {
  const result = await db.query(
    `SELECT s.*, pp.plan FROM subscriptions s
     RIGHT JOIN professional_profiles pp ON pp.user_id = $1
     WHERE s.professional_id = $1 AND s.status = 'active'
     ORDER BY s.created_at DESC LIMIT 1`,
    [professionalId]
  );
  const plan = result.rows[0]?.plan || 'free';
  return { plan, info: PLANES[plan] || PLANES.free };
};

const updatePlan = async (professionalId, plan, mpPaymentId, periodo = 'mensual') => {
  const info = PLANES[plan];
  if (!info) throw new Error('Plan inválido');

  const dias = periodo === 'anual' ? 365 : 30;
  const expires = plan === 'free' ? null : new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

  // Cancelar suscripción activa anterior
  await db.query(
    `UPDATE subscriptions SET status = 'cancelled' WHERE professional_id = $1 AND status = 'active'`,
    [professionalId]
  );

  // Crear nueva
  if (plan !== 'free') {
    await db.query(
      `INSERT INTO subscriptions (professional_id, plan, status, expires_at, mp_payment_id)
       VALUES ($1, $2, 'active', $3, $4)`,
      [professionalId, plan, expires, mpPaymentId || null]
    );
  }

  // Actualizar plan en perfil
  await db.query(
    `UPDATE professional_profiles SET plan = $1 WHERE user_id = $2`,
    [plan, professionalId]
  );

  return { plan, info };
};

const checkExpiredSubscriptions = async () => {
  const result = await db.query(
    `UPDATE subscriptions SET status = 'expired'
     WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()
     RETURNING professional_id`
  );
  for (const row of result.rows) {
    await db.query(
      `UPDATE professional_profiles SET plan = 'free' WHERE user_id = $1`,
      [row.professional_id]
    );
  }
};

const assignTrial = async (professionalId) => {
  // Contar profesionales registrados para ver si es early adopter
  const count = await db.query(
    `SELECT COUNT(*) FROM professional_profiles`
  );
  const totalProfesionales = parseInt(count.rows[0].count);
  const diasTrial = totalProfesionales <= LIMITE_EARLY_ADOPTERS ? PRIMEROS_200_DIAS : TRIAL_DIAS;
  const expires = new Date(Date.now() + diasTrial * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO subscriptions (professional_id, plan, status, expires_at)
     VALUES ($1, 'free', 'trial', $2)
     ON CONFLICT DO NOTHING`,
    [professionalId, expires]
  );

  await db.query(
    `UPDATE professional_profiles SET plan = 'free' WHERE user_id = $1`,
    [professionalId]
  );

  return { dias_trial: diasTrial, expires };
};
module.exports = { getPlan, updatePlan, checkExpiredSubscriptions, assignTrial, PLANES };