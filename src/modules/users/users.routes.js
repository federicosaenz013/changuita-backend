const express = require('express');
const router = express.Router();
const controller = require('./users.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/test', (req, res) => {
  res.json({ message: 'users module funcionando' });
});

router.put('/profile', authenticate, controller.updateProfile);

module.exports = router;