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

module.exports = { create };