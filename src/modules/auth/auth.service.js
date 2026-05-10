const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const db     = require('../../config/database');
const { sendVerificationEmail } = require('../email/email.service');

const EMAIL_VERIFICATION_ENABLED = false; // activar cuando el dominio esté verificado en Resend

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

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const result = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, role, email_verified, verification_token, verification_token_expires)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, email, role, created_at`,
    [name, email, phone, password_hash, role || 'client',
     !EMAIL_VERIFICATION_ENABLED, verificationToken, verificationExpires]
  );

  const user = result.rows[0];

  if (EMAIL_VERIFICATION_ENABLED) {
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (e) {
      console.error('Error enviando email de verificación:', e.message);
    }
  }

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

const googleLogin = async ({ accessToken }) => {
  // Verificar el token con Google y obtener datos del usuario
  const googleRes = await fetch(
    `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`
  );
  const googleUser = await googleRes.json();

  if (!googleUser.id || !googleUser.email) {
    const error = new Error('Token de Google inválido');
    error.status = 401;
    throw error;
  }

  // Buscar si ya existe el usuario
  let result = await db.query(
    'SELECT id, name, email, role FROM users WHERE email = $1 AND is_active = true',
    [googleUser.email]
  );

  let user;

  if (result.rows.length > 0) {
    user = result.rows[0];
  } else {
    // Crear usuario nuevo
    const newUser = await db.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, 'client', true)
       RETURNING id, name, email, role`,
      [googleUser.name, googleUser.email, await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12)]
    );
    user = newUser.rows[0];
  }

  const { accessToken: token, refreshToken } = generateTokens(user.id, user.role);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshToken]
  );

  return { user, accessToken: token, refreshToken };
};

module.exports = { register, login, logout, googleLogin };