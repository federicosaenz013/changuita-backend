const db = require('../../config/database');

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    const result = await db.query(
      `UPDATE users SET name = $1, phone = $2, updated_at = NOW()
       WHERE id = $3 RETURNING id, name, email, phone, role`,
      [name, phone || null, userId]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateProfile };