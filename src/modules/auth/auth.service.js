const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../../config/database');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

const register = async ({ name, email, phone, password, role }) => {
  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    const error = new Error('Ya existe una cuenta con ese email');
    error.status = 409;
    throw error;
  }

  const password_hash = await bcrypt.hash(password, 12);

  const result = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, created_at`,
    [name, email, phone, password_hash, role || 'client']
  );

  const user = result.rows[0];

  if (role === 'professional') {
    await db.query(
      'INSERT INTO professional_profiles (user_id) VALUES ($1)',
      [user.id]
    );
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshToken]
  );

  return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const result = await db.query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1 AND is_active = true',
    [email]
  );

  if (result.rows.length === 0) {
    const error = new Error('Email o contraseña incorrectos');
    error.status = 401;
    throw error;
  }

  const user = result.rows[0];

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    const error = new Error('Email o contraseña incorrectos');
    error.status = 401;
    throw error;
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshToken]
  );

  delete user.password_hash;

  return { user, accessToken, refreshToken };
};

const logout = async (refreshToken) => {
  await db.query(
    'DELETE FROM refresh_tokens WHERE token = $1',
    [refreshToken]
  );
};

module.exports = { register, login, logout };