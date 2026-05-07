const service = require('./client-reviews.service');

const create = async (req, res, next) => {
  try {
    const { booking_id, client_id, rating, comment } = req.body;
    const review = await service.create(req.user.id, booking_id, client_id, rating, comment);
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
};

module.exports = { create };