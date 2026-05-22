const db = require('../../config/database');
const { sendNotification } = require('./notifications.service');

const saveToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.id;
    if (!token) return res.status(400).json({ error: 'Token requerido' });
    await db.query(
      `INSERT INTO push_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()`,
      [userId, token, platform || 'expo']
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando token' });
  }
};

const testNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query('SELECT token FROM push_tokens WHERE user_id = $1 LIMIT 1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No hay token' });
    await sendNotification(result.rows[0].token, '🔔 Changuita', '¡Las notificaciones funcionan!', {});
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error enviando notificación' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = result.rows.filter(n => !n.is_read).length;
    res.json({ notifications: result.rows, unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { saveToken, testNotification, getNotifications, markAllRead, getUnreadCount };