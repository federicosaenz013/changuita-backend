const profService = require('./professionals.service');
const db          = require('../../config/database');

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

const getBookingsOcupados = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const { date } = req.query;

    if (!date) return res.json({ horarios: [] });

    const result = await db.query(
      `SELECT scheduled_time
       FROM bookings
       WHERE professional_id = $1
         AND scheduled_date  = $2
         AND status NOT IN ('rejected', 'cancelled')`,
      [id, date]
    );

    const horarios = result.rows.map(r => r.scheduled_time.slice(0, 5));
    res.json({ horarios });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, updateProfile, getBookingsOcupados };