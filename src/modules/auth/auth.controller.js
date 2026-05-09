const authService = require('./auth.service');
const db = require('../../config/database');

const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }

    const result = await authService.register({ name, email, phone, password, role });

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      user:         result.user,
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const result = await authService.login({ email, password });

    res.json({
      message:      'Login exitoso',
      user:         result.user,
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Token inválido');

    const result = await db.query(
      `UPDATE users SET email_verified = true, verification_token = null, verification_token_expires = null
       WHERE verification_token = $1 AND verification_token_expires > NOW()
       RETURNING name, email`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send('Token inválido o expirado');
    }

    res.send(`
      <html><body style="font-family: Arial; text-align: center; padding: 60px;">
        <h2 style="color: #3898EC;">✅ ¡Email verificado!</h2>
        <p>Tu cuenta de Changuita está activa. Ya podés iniciar sesión desde la app.</p>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send('Error al verificar el email');
  }
};

module.exports = { register, login, logout, me, verifyEmail };