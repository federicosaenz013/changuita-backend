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

const me = async (req, res, next) => {
  try {
    const db = require('../../config/database');
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.profile_photo,
        pp.description, pp.location_text, pp.dni_photo, pp.verification_status,
        pp.latitude, pp.longitude, pp.hourly_rate, pp.availability, pp.plan
       FROM users u
       LEFT JOIN professional_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    res.json({ user, professional_profile: user });
  } catch (err) { next(err); }
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

const googleLogin = async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Token de Google requerido' });
    const result = await authService.googleLogin({ accessToken });
    res.json({
      message:      'Login con Google exitoso',
      user:         result.user,
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    await authService.forgotPassword(email);
    res.json({ ok: true, message: 'Email enviado si la cuenta existe' });
  } catch (err) {
    next(err);
  }
};

const resetPasswordForm = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token inválido');
  res.send(`
    <html>
    <body style="font-family: Arial; max-width: 400px; margin: 60px auto; padding: 20px;">
      <h2 style="color: #3898EC;">Nueva contraseña</h2>
      <form method="POST" action="/api/auth/reset-password">
        <input type="hidden" name="token" value="${token}" />
        <input type="password" name="password" placeholder="Nueva contraseña" required
          style="width:100%; padding:12px; border-radius:8px; border:1px solid #ddd; margin-bottom:12px; font-size:15px;" />
        <input type="password" name="confirm" placeholder="Repetí la contraseña" required
          style="width:100%; padding:12px; border-radius:8px; border:1px solid #ddd; margin-bottom:16px; font-size:15px;" />
        <button type="submit"
          style="background:#FF6B35; color:white; padding:14px 24px; border:none; border-radius:8px; font-size:15px; font-weight:bold; width:100%; cursor:pointer;">
          Cambiar contraseña
        </button>
      </form>
    </body>
    </html>
  `);
};

const resetPassword = async (req, res) => {
  try {
    const { token, password, confirm } = req.body;
    if (!token || !password) return res.status(400).send('Datos inválidos');
    if (password !== confirm) return res.send(`
      <html><body style="font-family:Arial;text-align:center;padding:60px;">
        <h2 style="color:#C62828;">Las contraseñas no coinciden</h2>
        <a href="javascript:history.back()">Volver</a>
      </body></html>
    `);
    await authService.resetPassword(token, password);
    res.send(`
      <html><body style="font-family:Arial;text-align:center;padding:60px;">
        <h2 style="color:#22c55e;">✅ ¡Contraseña actualizada!</h2>
        <p>Ya podés iniciar sesión desde la app con tu nueva contraseña.</p>
      </body></html>
    `);
  } catch (err) {
    res.status(400).send(`
      <html><body style="font-family:Arial;text-align:center;padding:60px;">
        <h2 style="color:#C62828;">Error</h2>
        <p>${err.message}</p>
      </body></html>
    `);
  }
};

module.exports = { register, login, logout, me, verifyEmail, googleLogin, forgotPassword, resetPasswordForm, resetPassword };