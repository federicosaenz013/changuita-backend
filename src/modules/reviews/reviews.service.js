const db = require('../../config/database');

const create = async (clientId, data) => {
  const { booking_id, professional_id, rating, comment } = data;

  const bookingCheck = await db.query(
    `SELECT id FROM bookings 
     WHERE id = $1 AND client_id = $2 AND status = 'completed'`,
    [booking_id, clientId]
  );

  if (bookingCheck.rows.length === 0) {
    const error = new Error('La reserva no existe, no está completada o no te pertenece');
    error.status = 403;
    throw error;
  }

  const existing = await db.query(
    'SELECT id FROM reviews WHERE booking_id = $1',
    [booking_id]
  );

  if (existing.rows.length > 0) {
    const error = new Error('Ya dejaste una reseña para esta reserva');
    error.status = 409;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO reviews (booking_id, client_id, professional_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [booking_id, clientId, professional_id, rating, comment || null]
  );

  return result.rows[0];
};

const getByProfessional = async (professionalId) => {
  const result = await db.query(
    `SELECT
      r.id,
      r.rating,
      r.comment,
      r.created_at,
      u.name AS client_name
     FROM reviews r
     JOIN users u ON r.client_id = u.id
     WHERE r.professional_id = $1
     ORDER BY r.created_at DESC`,
    [professionalId]
  );
  return result.rows;
};

module.exports = { create, getByProfessional };