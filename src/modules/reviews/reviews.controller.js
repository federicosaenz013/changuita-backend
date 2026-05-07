const reviewsService = require('./reviews.service');

const create = async (req, res, next) => {
  try {
    const review = await reviewsService.create(req.user.id, req.body);
    res.status(201).json({ message: 'Reseña enviada correctamente', review });
  } catch (err) {
    next(err);
  }
};

const getByProfessional = async (req, res, next) => {
  try {
    const reviews = await reviewsService.getByProfessional(req.params.professionalId);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
};

const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await reviewsService.getMyReviews(req.user.id);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
};

const getGiven = async (req, res, next) => {
  try {
    const reviews = await reviewsService.getGiven(req.user.id);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getMyReviews, getByProfessional, getGiven };