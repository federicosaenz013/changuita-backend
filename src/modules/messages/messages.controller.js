const messagesService = require('./messages.service');

const getByBooking = async (req, res, next) => {
  try {
    const messages = await messagesService.getByBooking(req.params.bookingId, req.user.id);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByBooking };