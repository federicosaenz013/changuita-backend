const db = require('../../config/database');

const normalize = (str) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const getAll = async ({ category, search }) => {
  let query = `
    SELECT
      s.id,
      s.title,
      s.description,
      s.price_type,
      s.price,
      s.estimated_duration,
      s.photos,
      c.name AS category,
      c.slug AS category_slug,
      u.id   AS professional_id,
      u.name AS professional_name,
      u.profile_photo AS professional_photo,
      pp.rating,
      pp.reviews_count,
      pp.location_text
    FROM services s
    JOIN categories c ON s.category_id = c.id
    JOIN professional_profiles pp ON s.professional_id = pp.id
    JOIN users u ON pp.user_id = u.id
    WHERE s.is_active = true AND u.is_active = true
  `;

  const params = [];

  if (category) {
    params.push(category);
    query += ` AND c.slug = $${params.length}`;
  }

  if (search) {
    params.push(`%${normalize(search)}%`);
    query += ` AND (
      lower(unaccent(s.title)) LIKE $${params.length}
      OR lower(unaccent(s.description)) LIKE $${params.length}
    )`;
  }

  if (search && category) {
    query += ` ORDER BY CASE WHEN c.slug = '${category}' THEN 0 ELSE 1 END, pp.rating DESC`;
  } else {
    query += ` ORDER BY pp.rating DESC`;
  }

  const result = await db.query(query, params);
  return result.rows;
};

const getById = async (id) => {
  const result = await db.query(
    `SELECT
      s.id,
      s.title,
      s.description,
      s.price_type,
      s.price,
      s.estimated_duration,
      s.photos,
      c.name AS category,
      c.slug AS category_slug,
      u.id   AS professional_id,
      u.name AS professional_name,
      u.profile_photo AS professional_photo,
      pp.rating,
      pp.reviews_count,
      pp.location_text,
      pp.hourly_rate
    FROM services s
    JOIN categories c ON s.category_id = c.id
    JOIN professional_profiles pp ON s.professional_id = pp.id
    JOIN users u ON pp.user_id = u.id
    WHERE s.id = $1 AND s.is_active = true`,
    [id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Servicio no encontrado');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const create = async (userId, data) => {
  const { title, description, category_id, category_slug, price_type, price, estimated_duration } = data;

  const profResult = await db.query(
    'SELECT id FROM professional_profiles WHERE user_id = $1',
    [userId]
  );

  if (profResult.rows.length === 0) {
    const error = new Error('Necesitás crear tu perfil profesional primero');
    error.status = 400;
    throw error;
  }

  const professionalId = profResult.rows[0].id;

  let finalCategoryId = category_id;
  if (!finalCategoryId && category_slug) {
    const catResult = await db.query(
      'SELECT id FROM categories WHERE slug = $1',
      [category_slug]
    );
    if (catResult.rows.length === 0) {
      const error = new Error('Categoría no encontrada');
      error.status = 400;
      throw error;
    }
    finalCategoryId = catResult.rows[0].id;
  }

  const result = await db.query(
    `INSERT INTO services (professional_id, category_id, title, description, price_type, price, estimated_duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [professionalId, finalCategoryId, title, description, price_type || 'fixed', price, estimated_duration]
  );

  return result.rows[0];
};

const update = async (userId, serviceId, data) => {
  const { title, description, price_type, price, estimated_duration, is_active } = data;

  const result = await db.query(
    `UPDATE services SET
      title              = COALESCE($1, title),
      description        = COALESCE($2, description),
      price_type         = COALESCE($3, price_type),
      price              = COALESCE($4, price),
      estimated_duration = COALESCE($5, estimated_duration),
      is_active          = COALESCE($6, is_active),
      updated_at         = NOW()
    WHERE id = $7
      AND professional_id = (SELECT id FROM professional_profiles WHERE user_id = $8)
    RETURNING *`,
    [title, description, price_type, price, estimated_duration, is_active, serviceId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Servicio no encontrado o sin permiso');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const remove = async (userId, serviceId) => {
  await db.query(
    `UPDATE services SET is_active = false
     WHERE id = $1
       AND professional_id = (SELECT id FROM professional_profiles WHERE user_id = $2)`,
    [serviceId, userId]
  );
};

const getCategories = async () => {
  const result = await db.query(
    'SELECT id, name, slug, icon, description FROM categories WHERE is_active = true ORDER BY name'
  );
  return result.rows;
};

const getMyServices = async (userId) => {
  const result = await db.query(
    `SELECT
      s.id,
      s.title,
      s.description,
      s.price_type,
      s.price,
      s.estimated_duration,
      s.is_active,
      c.name AS category,
      c.slug AS category_slug
    FROM services s
    JOIN categories c ON s.category_id = c.id
    JOIN professional_profiles pp ON s.professional_id = pp.id
    WHERE pp.user_id = $1
    ORDER BY s.created_at DESC`,
    [userId]
  );
  return result.rows;
};

module.exports = { getAll, getById, create, update, remove, getCategories, getMyServices };