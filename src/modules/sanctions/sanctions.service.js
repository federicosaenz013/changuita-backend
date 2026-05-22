const db = require('../../config/database');

// Verificar y aplicar sanciones automáticas
const checkAndApplySanctions = async (professionalId) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Contar cancelaciones del profesional en 30 días
  const cancelaciones = await db.query(
    `SELECT COUNT(*) FROM bookings 
     WHERE professional_id = $1 
       AND status = 'cancelled'
       AND cancelled_by = 'professional'
       AND updated_at > $2`,
    [professionalId, thirtyDaysAgo]
  );
  const numCancelaciones = parseInt(cancelaciones.rows[0].count);

  // Verificar rating
  const perfil = await db.query(
    `SELECT pp.rating, pp.reviews_count 
     FROM professional_profiles pp 
     WHERE pp.user_id = $1`,
    [professionalId]
  );
  const { rating, reviews_count } = perfil.rows[0] || {};

  // Verificar si ya tiene sanción activa
  const sancionActiva = await db.query(
    `SELECT id FROM sanctions 
     WHERE professional_id = $1 AND status = 'active'`,
    [professionalId]
  );
  if (sancionActiva.rows.length > 0) return;

  // Aplicar sanción por rating bajo
  if (parseFloat(rating) < 2.7 && parseInt(reviews_count) >= 10) {
    await applySanction(professionalId, 'rating', 'Rating inferior a 2.7 con 10 o más reseñas', null);
    return;
  }

  // Aplicar suspensión por cancelaciones
  if (numCancelaciones >= 8) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await applySanction(professionalId, 'suspension', '8 o más cancelaciones en 30 días', expires);
    return;
  }

  // Aplicar advertencia
  if (numCancelaciones >= 5) {
    await applySanction(professionalId, 'warning', '5 o más cancelaciones en 30 días', null);
  }
};

const applySanction = async (professionalId, type, reason, expiresAt) => {
  await db.query(
    `INSERT INTO sanctions (professional_id, type, reason, status, expires_at)
     VALUES ($1, $2, $3, 'active', $4)`,
    [professionalId, type, reason, expiresAt]
  );

  if (type === 'suspension' || type === 'rating') {
    await db.query(
      `UPDATE professional_profiles SET sanctioned = true, sanction_expires_at = $1
       WHERE user_id = $2`,
      [expiresAt, professionalId]
    );
    // Ocultar de búsquedas
    await db.query(
      `UPDATE professional_profiles SET is_available = false WHERE user_id = $1`,
      [professionalId]
    );
  }
};

const getSanctions = async (professionalId) => {
  const result = await db.query(
    `SELECT * FROM sanctions WHERE professional_id = $1 ORDER BY created_at DESC`,
    [professionalId]
  );
  return result.rows;
};

const checkExpiredSanctions = async () => {
  const result = await db.query(
    `UPDATE sanctions SET status = 'resolved', resolved_at = NOW()
     WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()
     RETURNING professional_id`
  );
  for (const row of result.rows) {
    await db.query(
      `UPDATE professional_profiles SET sanctioned = false, sanction_expires_at = null, is_available = true
       WHERE user_id = $1`,
      [row.professional_id]
    );
  }
};

const payFine = async (professionalId, paymentId) => {
  await db.query(
    `UPDATE sanctions SET status = 'resolved', fine_paid = true, fine_payment_id = $1, resolved_at = NOW()
     WHERE professional_id = $2 AND status = 'active' AND type = 'rating'`,
    [paymentId, professionalId]
  );
  await db.query(
    `UPDATE professional_profiles SET sanctioned = false, sanction_expires_at = null, is_available = true
     WHERE user_id = $1`,
    [professionalId]
  );
};

module.exports = { checkAndApplySanctions, getSanctions, checkExpiredSanctions, payFine };