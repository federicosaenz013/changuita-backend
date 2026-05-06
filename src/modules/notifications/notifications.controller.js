const bookingsService = require('./bookings.service');
const { sendNotification } = require('../notifications/notifications.service');
const db = require('../../config/database');

const create = async (req, res, next) => {
  try {
    const booking = await bookingsService.create(req.user.id, req.body);
    res.status(201).json({ message: 'Reserva creada correctamente', booking });
  } catch (err) {
    next(err);
  }
};

const getByUser = async (req, res, next) => {
  try {
    const bookings = await bookingsService.getByUser(req.user.id, req.user.role);
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const booking = await bookingsService.getById(req.params.id, req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
};

const accept = async (req, res, next) => {
  try {
    const booking = await bookingsService.updateStatus(req.params.id, req.user.id, 'accepted');
    res.json({ message: 'Reserva aceptada', booking });
    const tokenRes = await db.query('SELECT token FROM push_tokens WHERE user_id = $1 LIMIT 1', [booking.client_id]);
    if (tokenRes.rows.length > 0) {
      await sendNotification(tokenRes.rows[0].token, '✅ Reserva aceptada', 'Tu reserva fue aceptada por el profesional', {});
    }
  } catch (err) {
    next(err);
  }
};

const reject = async (req, res, next) => {
  try {
    const booking = await bookingsService.updateStatus(req.params.id, req.user.id, 'rejected');
    res.json({ message: 'Reserva rechazada', booking });
    const tokenRes = await db.query('SELECT token FROM push_tokens WHERE user_id = $1 LIMIT 1', [booking.client_id]);
    if (tokenRes.rows.length > 0) {
      await sendNotification(tokenRes.rows[0].token, '❌ Reserva rechazada', 'Tu reserva fue rechazada por el profesional', {});
    }
  } catch (err) {
    next(err);
  }
};

const complete = async (req, res, next) => {
  try {
    const booking = await bookingsService.updateStatus(req.params.id, req.user.id, 'completed');
    res.json({ message: 'Reserva completada', booking });
    const tokenRes = await db.query('SELECT token FROM push_tokens WHERE user_id = $1 LIMIT 1', [booking.client_id]);
    if (tokenRes.rows.length > 0) {
      await sendNotification(tokenRes.rows[0].token, '🎉 Trabajo completado', 'El profesional marcó el trabajo como completado', {});
    }
  } catch (err) {
    next(err);
  }
};

const cancel = async (req, res, next) => {
  try {
    const booking = await bookingsService.cancel(req.params.id, req.user.id);
    res.json({ message: 'Reserva cancelada', booking });
  } catch (err) {
    next(err);
  }
};

const markSeen = async (req, res, next) => {
  try {
    await bookingsService.markSeenByClient(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getByUser, getById, accept, reject, complete, cancel, markSeen };