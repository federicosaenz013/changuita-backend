const db         = require('../../config/database');
const cloudinary = require('../../config/cloudinary');

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

const uploadPhoto = async (req, res, next) => {
  try {
    const { base64, mimeType } = req.body;
    if (!base64) return res.status(400).json({ error: 'Imagen requerida' });

    const dataUri = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'changuita/profiles',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    await db.query(
      `UPDATE users SET profile_photo = $1 WHERE id = $2`,
      [result.secure_url, req.user.id]
    );

    res.json({ photo_url: result.secure_url });
  } catch (err) {
    next(err);
  }
};

const uploadDni = async (req, res, next) => {
  try {
    const { base64, mimeType } = req.body;
    if (!base64) return res.status(400).json({ error: 'Imagen requerida' });

    const dataUri = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'changuita/dni',
    });

    await db.query(
      `UPDATE professional_profiles 
       SET dni_photo = $1, verification_status = 'pending'
       WHERE user_id = $2`,
      [result.secure_url, req.user.id]
    );

    res.json({ dni_url: result.secure_url, message: 'DNI enviado para verificación' });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateProfile, uploadPhoto, uploadDni };