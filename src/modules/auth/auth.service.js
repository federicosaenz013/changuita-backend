const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const db     = require('../../config/database');
const { sendVerificationEmail } = require('../email/email.service');

const EMAIL_VERIFICATION_ENABLED = true;

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

const register = async ({ name, email, phone, password, role, plan }) => {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
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
    const planElegido = ['basico', 'medio', 'full'].includes(plan) ? plan : 'free';
    await db.query(
      'INSERT INTO professional_profiles (user_id, plan) VALUES ($1, $2)',
      [user.id, planElegido]
    );
    try {
      const { assignTrial } = require('../subscriptions/subscriptions.service');
      await assignTrial(user.id, planElegido);
    } catch (e) {
      console.log('Error asignando trial:', e.message);
    }
  }

  try {
    const { sendWelcomeEmail } = require('../email/email.service');
    await sendWelcomeEmail(email, name, role);
  } catch (e) {
    console.log('Error enviando mail de bienvenida:', e.message);
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshToken]
  );

  if (EMAIL_VERIFICATION_ENABLED) {
    return { user, accessToken: null, refreshToken: null, requiresVerification: true };
  }
  return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const result = await db.query(
    'SELECT id, name, email, role, password_hash, email_verified FROM users WHERE email = $1 AND is_active = true',
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

if (!user.email_verified) {
    const error = new Error('Verificá tu email antes de iniciar sesión. Revisá tu bandeja de entrada.');
    error.status = 403;
    throw error;
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshToken]
  );

  delete user.password_hash;
  if (EMAIL_VERIFICATION_ENABLED) {
    return { user, accessToken: null, refreshToken: null, requiresVerification: true };
  }
  return { user, accessToken, refreshToken };
};

const logout = async (refreshToken) => {
  await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
};

const googleLogin = async ({ accessToken, idToken }) => {
  let googleUser;

  if (idToken) {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client('268626977584-t3ha5kjd6qsapebgp6lup2ujqp4198ak.apps.googleusercontent.com');
    const ticket = await client.verifyIdToken({
      idToken,
      audience: '268626977584-t3ha5kjd6qsapebgp6lup2ujqp4198ak.apps.googleusercontent.com'
    });
    const payload = ticket.getPayload();
    googleUser = { id: payload.sub, email: payload.email, name: payload.name };
  } else {
    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`);
    googleUser = await googleRes.json();
  }

  if (!googleUser.id || !googleUser.email) {
    const error = new Error('Token de Google inválido');
    error.status = 401;
    throw error;
  }

  let result = await db.query(
    'SELECT id, name, email, role FROM users WHERE email = $1 AND is_active = true',
    [googleUser.email]
  );

  let user;
  if (result.rows.length > 0) {
    user = result.rows[0];
  } else {
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

const forgotPassword = async (email) => {
  const result = await db.query(
    'SELECT id, name FROM users WHERE email = $1 AND is_active = true',
    [email]
  );
  if (result.rows.length === 0) return;

  const user = result.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await db.query(
    `UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3`,
    [token, expires, user.id]
  );

  await sendVerificationEmail(email, user.name, token, 'reset');
};

const resetPassword = async (token, newPassword) => {
  const result = await db.query(
    `SELECT id FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()`,
    [token]
  );
  if (result.rows.length === 0) {
    const error = new Error('Token inválido o expirado');
    error.status = 400;
    throw error;
  }
  const password_hash = await bcrypt.hash(newPassword, 12);
  await db.query(
    `UPDATE users SET password_hash = $1, verification_token = null, verification_token_expires = null WHERE id = $2`,
    [password_hash, result.rows[0].id]
  );
};

module.exports = { register, login, logout, googleLogin, forgotPassword, resetPassword };