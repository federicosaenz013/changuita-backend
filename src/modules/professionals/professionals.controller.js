const profService = require('./professionals.service');

const getAll = async (req, res, next) => {
  try {
    const { category, lat, lng, radius } = req.query;
    const professionals = await profService.getAll({ category, lat, lng, radius });
    res.json({ professionals });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const professional = await profService.getById(req.params.id);
    res.json({ professional });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await profService.updateProfile(req.user.id, req.body);
    res.json({ message: 'Perfil actualizado correctamente', profile });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, updateProfile };