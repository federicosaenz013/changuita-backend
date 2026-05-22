const db = require('../../config/database');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const createNotification = async (userId, title, body, type = 'system', data = {}) => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, title, body, type, data) VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, body, type, JSON.stringify(data)]
    );
    const pushRes = await db.query('SELECT token FROM push_tokens WHERE user_id = $1', [userId]);
    if (pushRes.rows[0]?.token && Expo.isExpoPushToken(pushRes.rows[0].token)) {
      await expo.sendPushNotificationsAsync([{
        to: pushRes.rows[0].token,
        sound: 'default',
        title,
        body,
        data,
      }]);
    }
  } catch (e) {
    console.log('Error creando notificacion:', e.message);
  }
};

module.exports = { createNotification };