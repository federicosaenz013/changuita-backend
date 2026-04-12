const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware de autenticación para Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token no proporcionado'));
    }

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

    // Unirse a una sala de booking
    socket.on('join_booking', (bookingId) => {
      socket.join(`booking_${bookingId}`);
      console.log(`Usuario ${socket.userId} se unió a booking_${bookingId}`);
    });

    // Enviar mensaje
    socket.on('send_message', async (data) => {
      const { bookingId, content, receiverId } = data;

      try {
        const db = require('../config/database');

        const result = await db.query(
          `INSERT INTO messages (booking_id, sender_id, receiver_id, content)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [bookingId, socket.userId, receiverId, content]
        );

        const message = result.rows[0];

        // Enviar mensaje a todos en la sala
        io.to(`booking_${bookingId}`).emit('new_message', {
          id:          message.id,
          content:     message.content,
          sender_id:   message.sender_id,
          receiver_id: message.receiver_id,
          created_at:  message.created_at,
        });

      } catch (err) {
        console.error('Error guardando mensaje:', err.message);
        socket.emit('error', { message: 'Error enviando mensaje' });
      }
    });

    // Marcar mensajes como leídos
    socket.on('mark_read', async (bookingId) => {
      try {
        const db = require('../config/database');
        await db.query(
          `UPDATE messages SET is_read = true
           WHERE booking_id = $1 AND receiver_id = $2`,
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