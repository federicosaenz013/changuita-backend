const db = require('../../config/database');
const { sendNotification } = require('./notifications.service');

// Guardar o actualizar token de notificación
const saveToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    await db.query(
      `INSERT INTO push_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()`,
      [userId, token, platform || 'expo']
    );

    res.json({ ok: true, message: 'Token guardado' });
  } catch (error) {
    console.error('Error guardando token:', error.message);
    res.status(500).json({ error: 'Error guardando token' });
  }
};

// Enviar notificación de prueba
const testNotification = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      'SELECT token FROM push_tokens WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay token registrado para este usuario' });
    }

    const token = result.rows[0].token;
    await sendNotification(token, '🔔 Changuita', '¡Las notificaciones funcionan!', {});

    res.json({ ok: true, message: 'Notificación enviada' });
  } catch (error) {
    console.error('Error enviando notificación de prueba:', error.message);
    res.status(500).json({ error: 'Error enviando notificación' });
  }
};

module.exports = { saveToken, testNotification };