const db = require('../../config/database');

const getAll = async ({ category, lat, lng, radius = 10 }) => {
  let query = `
    SELECT
      u.id,
      u.name,
      u.profile_photo,
      pp.description,
      pp.location_text,
      pp.latitude,
      pp.longitude,
      pp.hourly_rate,
      pp.rating,
      pp.reviews_count,
      pp.is_available,
      pp.verification_status
    FROM professional_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE u.is_active = true AND pp.is_available = true
  `;

  const params = [];

  if (category) {
    params.push(category);
    query += ` AND EXISTS (
      SELECT 1 FROM services s
      JOIN categories c ON s.category_id = c.id
      WHERE s.professional_id = pp.id
        AND c.slug = $${params.length}
        AND s.is_active = true
    )`;
  }

  query += ` ORDER BY pp.rating DESC`;

  const result = await db.query(query, params);
  return result.rows;
};

const getById = async (id) => {
  const result = await db.query(
    `SELECT
      u.id,
      u.name,
      u.profile_photo,
      u.created_at AS member_since,
      pp.description,
      pp.location_text,
      pp.latitude,
      pp.longitude,
      pp.hourly_rate,
      pp.rating,
      pp.reviews_count,
      pp.portfolio_images,
      pp.is_available,
      pp.verification_status,
      pp.coverage_radius,
      COALESCE(pp.availability, pp.availability_schedule) AS availability,
      (SELECT COUNT(*) FROM bookings b WHERE b.professional_id = u.id AND b.status = 'completed')::int AS completed_jobs
    FROM professional_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE u.id = $1 AND u.is_active = true`,
    [id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Profesional no encontrado');
    error.status = 404;
    throw error;
  }

  const professional = result.rows[0];

  const services = await db.query(
    `SELECT
      s.id,
      s.title,
      s.description,
      s.price_type,
      s.price,
      s.estimated_duration,
      s.photos,
      c.name AS category,
      c.slug AS category_slug
    FROM services s
    JOIN categories c ON s.category_id = c.id
    JOIN professional_profiles pp ON s.professional_id = pp.id
    WHERE pp.user_id = $1 AND s.is_active = true`,
    [id]
  );

  professional.services = services.rows;

  const reviews = await db.query(
    `SELECT
      r.rating,
      r.comment,
      r.created_at,
      u.name AS client_name,
      u.profile_photo AS client_photo
    FROM reviews r
    JOIN users u ON r.client_id = u.id
    WHERE r.professional_id = $1
    ORDER BY r.created_at DESC
    LIMIT 10`,
    [id]
  );

  professional.reviews = reviews.rows;

  return professional;
};

const updateProfile = async (userId, data) => {
  const {
    description,
    location_text,
    latitude,
    longitude,
    hourly_rate,
    availability,
  } = data;

  const result = await db.query(
    `UPDATE professional_profiles SET
      description    = COALESCE($1, description),
      location_text  = COALESCE($2, location_text),
      latitude       = COALESCE($3, latitude),
      longitude      = COALESCE($4, longitude),
      hourly_rate    = COALESCE($5, hourly_rate),
      availability   = COALESCE($6, availability),
      updated_at     = NOW()
    WHERE user_id = $7
    RETURNING *`,
    [description, location_text, latitude, longitude, hourly_rate,
     availability ? JSON.stringify(availability) : null, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Perfil profesional no encontrado');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

module.exports = { getAll, getById, updateProfile };