const admin = require('firebase-admin');

// Inicializar Firebase Admin solo una vez
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const sendNotification = async (token, title, body, data = {}) => {
  try {
    const message = {
      notification: { title, body },
      data: { ...data },
      token,
    };

    const response = await admin.messaging().send(message);
    console.log('Notificación enviada:', response);
    return response;
  } catch (error) {
    console.error('Error enviando notificación:', error.message);
    return null;
  }
};

const sendToMultiple = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification: { title, body },
    data: { ...data },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Notificaciones enviadas: ${response.successCount}/${tokens.length}`);
    return response;
  } catch (error) {
    console.error('Error enviando notificaciones múltiples:', error.message);
    return null;
  }
};

module.exports = { sendNotification, sendToMultiple };