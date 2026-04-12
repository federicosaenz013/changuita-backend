const express    = require('express');
const router     = express.Router();
const controller = require('./professionals.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.get('/',      controller.getAll);
router.get('/:id',   controller.getById);
router.put('/profile', authenticate, requireRole('professional'), controller.updateProfile);

module.exports = router;