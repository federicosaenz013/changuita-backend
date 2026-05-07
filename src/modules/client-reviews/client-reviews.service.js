const db = require('../../config/database');

const create = async (professionalId, bookingId, clientId, rating, comment) => {
  const existing = await db.query(
    'SELECT id FROM client_reviews WHERE booking_id = $1',
    [bookingId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const result = await db.query(
    `INSERT INTO client_reviews (booking_id, professional_id, client_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [bookingId, professionalId, clientId, rating, comment || null]
  );
  return result.rows[0];
};

const getByClient = async (clientId) => {
  const result = await db.query(
    `SELECT
      cr.id,
      cr.rating,
      cr.comment,
      cr.created_at,
      u.name AS professional_name,
      s.title AS service_title
     FROM client_reviews cr
     JOIN users u ON cr.professional_id = u.id
     JOIN bookings b ON cr.booking_id = b.id
     JOIN services s ON b.service_id = s.id
     WHERE cr.client_id = $1
     ORDER BY cr.created_at DESC`,
    [clientId]
  );
  return result.rows;
};

module.exports = { create, getByClient };