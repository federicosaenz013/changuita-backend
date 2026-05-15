const db = require('../../config/database');

const create = async (clientId, data) => {
  const { service_id, professional_id, scheduled_date, scheduled_time, location_text, notes } = data;

  const serviceResult = await db.query(
    'SELECT price FROM services WHERE id = $1 AND is_active = true',
    [service_id]
  );

  if (serviceResult.rows.length === 0) {
    const error = new Error('Servicio no encontrado');
    error.status = 404;
    throw error;
  }

  if (clientId === professional_id) {
    const error = new Error('No podés reservarte a vos mismo');
    error.status = 400;
    throw error;
  }

  const conflict = await db.query(
    `SELECT id FROM bookings
     WHERE professional_id = $1
       AND scheduled_date = $2
       AND scheduled_time = $3
       AND status IN ('pending', 'accepted')`,
    [professional_id, scheduled_date, scheduled_time]
  );

  if (conflict.rows.length > 0) {
    const error = new Error('El profesional ya tiene una reserva en ese horario. Por favor elegí otro.');
    error.status = 409;
    throw error;
  }

  // Verificar límite de reservas para plan Free
  const planRes = await db.query(
    `SELECT pp.plan FROM professional_profiles pp WHERE pp.user_id = $1`,
    [professional_id]
  );
  const plan = planRes.rows[0]?.plan || 'free';
  if (plan === 'free') {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const reservasMes = await db.query(
      `SELECT COUNT(*) FROM bookings 
       WHERE professional_id = $1 
         AND created_at >= $2
         AND status NOT IN ('cancelled', 'rejected')`,
      [professional_id, inicioMes]
    );
    if (parseInt(reservasMes.rows[0].count) >= 5) {
      const error = new Error('Este profesional alcanzó el límite de reservas del mes');
      error.status = 429;
      throw error;
    }
  }

  const total_amount = serviceResult.rows[0].price;

  const result = await db.query(
    `INSERT INTO bookings (client_id, professional_id, service_id, scheduled_date, scheduled_time, location_text, notes, total_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [clientId, professional_id, service_id, scheduled_date, scheduled_time, location_text, notes, total_amount]
  );

  return result.rows[0];
};

const getByUser = async (userId, role) => {
  const result = await db.query(
    `SELECT
      b.id,
      b.client_id,
      b.professional_id,
      b.scheduled_date,
      b.scheduled_time,
      b.status,
      b.total_amount,
      b.location_text,
      b.notes,
      b.created_at,
      b.client_seen,
      b.rejection_reason,
      s.title AS service_title,
      s.price_type,
      u_client.name AS client_name,
      u_client.profile_photo AS client_photo,
      u_prof.name AS professional_name,
      u_prof.profile_photo AS professional_photo,
      CASE WHEN b.client_id = $1 THEN 'client' ELSE 'professional' END AS my_role,
      EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id) AS has_review,
      COALESCE((
        SELECT COUNT(*)::int
        FROM messages m
        WHERE m.booking_id = b.id
          AND m.receiver_id = $1
          AND m.is_read = false
      ), 0) AS unread_count
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN users u_client ON b.client_id = u_client.id
    JOIN users u_prof ON b.professional_id = u_prof.id
    WHERE b.client_id = $1 OR b.professional_id = $1
    ORDER BY b.created_at DESC`,
    [userId]
  );

  return result.rows;
};

const getById = async (bookingId, userId) => {
  const result = await db.query(
    `SELECT
      b.*,
      s.title AS service_title,
      s.description AS service_description,
      s.price_type,
      u_client.name AS client_name,
      u_client.profile_photo AS client_photo,
      u_client.phone AS client_phone,
      u_prof.name AS professional_name,
      u_prof.profile_photo AS professional_photo
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN users u_client ON b.client_id = u_client.id
    JOIN users u_prof ON b.professional_id = u_prof.id
    WHERE b.id = $1 AND (b.client_id = $2 OR b.professional_id = $2)`,
    [bookingId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Reserva no encontrada');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const updateStatus = async (bookingId, userId, status, rejectionReason = null) => {
  const validStatuses = ['accepted', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) {
    const error = new Error('Estado no válido');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `UPDATE bookings SET status = $1, updated_at = NOW(), client_seen = false,
     rejection_reason = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE rejection_reason END
     WHERE id = $2 AND professional_id = $3
     RETURNING *`,
    [status, bookingId, userId, rejectionReason]
  );

  if (result.rows.length === 0) {
    const error = new Error('Reserva no encontrada o sin permiso');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const cancel = async (bookingId, userId) => {
  const result = await db.query(
    `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND (client_id = $2 OR professional_id = $2)
     AND status IN ('pending', 'accepted')
     RETURNING *`,
    [bookingId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Reserva no encontrada o no se puede cancelar');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const markSeenByClient = async (bookingId, userId) => {
  await db.query(
    `UPDATE bookings SET client_seen = true
     WHERE id = $1 AND client_id = $2`,
    [bookingId, userId]
  );
};

module.exports = { create, getByUser, getById, updateStatus, cancel, markSeenByClient };