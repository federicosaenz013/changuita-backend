const db = require('../../config/database');

const getByBooking = async (bookingId, userId) => {
  const booking = await db.query(
    'SELECT id FROM bookings WHERE id = $1 AND (client_id = $2 OR professional_id = $2)',
    [bookingId, userId]
  );

  if (booking.rows.length === 0) {
    const error = new Error('No tenés acceso a esta conversación');
    error.status = 403;
    throw error;
  }

  const result = await db.query(
    `SELECT
      m.id,
      m.content,
      m.is_read,
      m.created_at,
      m.sender_id,
      m.receiver_id,
      u.name AS sender_name,
      u.profile_photo AS sender_photo
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.booking_id = $1
    ORDER BY m.created_at ASC`,
    [bookingId]
  );

  await db.query(
    `UPDATE messages SET is_read = true
     WHERE booking_id = $1 AND receiver_id = $2`,
    [bookingId, userId]
  );

  return result.rows;
};

const getUnreadCount = async (userId) => {
  const result = await db.query(
    `SELECT COUNT(*) AS count
     FROM messages
     WHERE receiver_id = $1 AND is_read = false`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
};

module.exports = { getByBooking, getUnreadCount };