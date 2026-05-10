const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const sendPushNotification = async (expoPushToken, title, body) => {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to:    expoPushToken,
        title,
        body,
        sound: 'default',
        data:  { type: 'new_message' },
      }),
    });
  } catch (err) {
    console.error('Error enviando push notification:', err.message);
  }
};

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token no proporcionado'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.userId}`);

    socket.on('join_booking', (bookingId) => {
      socket.join(`booking_${bookingId}`);
    });

    socket.on('send_message', async (data) => {
      const { bookingId, content, receiverId } = data;
      try {
        const db = require('../config/database');

        // Guardar mensaje
        const result = await db.query(
          `INSERT INTO messages (booking_id, sender_id, receiver_id, content)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [bookingId, socket.userId, receiverId, content]
        );
        const message = result.rows[0];

        // Emitir a la sala
        io.to(`booking_${bookingId}`).emit('new_message', {
          id:          message.id,
          content:     message.content,
          sender_id:   message.sender_id,
          receiver_id: message.receiver_id,
          created_at:  message.created_at,
        });

        // Buscar nombre del remitente y token push del receptor
        const [senderRes, tokenRes] = await Promise.all([
          db.query('SELECT name FROM users WHERE id = $1', [socket.userId]),
          db.query(
            'SELECT token FROM push_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [receiverId]
          ),
        ]);

        const senderName  = senderRes.rows[0]?.name || 'Alguien';
        const pushToken   = tokenRes.rows[0]?.token;

        if (pushToken) {
          await sendPushNotification(
            pushToken,
            `Nuevo mensaje de ${senderName}`,
            content.length > 80 ? content.substring(0, 80) + '...' : content
          );
        }

      } catch (err) {
        console.error('Error guardando mensaje:', err.message);
        socket.emit('error', { message: 'Error enviando mensaje' });
      }
    });

    socket.on('mark_read', async (bookingId) => {
      try {
        const db = require('../config/database');
        await db.query(
          `UPDATE messages SET is_read = true WHERE booking_id = $1 AND receiver_id = $2`,
          [bookingId, socket.userId]
        );
      } catch (err) {
        console.error('Error marcando mensajes:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${socket.userId}`);
    });
  });

  return io;
};

module.exports = initSocket;