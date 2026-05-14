const sanctionsService = require('./sanctions.service');

const getMySanctions = async (req, res, next) => {
  try {
    const sanctions = await sanctionsService.getSanctions(req.user.id);
    res.json({ sanctions });
  } catch (err) { next(err); }
};

module.exports = { getMySanctions };