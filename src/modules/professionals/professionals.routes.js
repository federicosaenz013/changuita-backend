const express    = require('express');
const router     = express.Router();
const controller = require('./professionals.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.put('/profile', authenticate, requireRole('professional'), controller.updateProfile);
router.get('/',        controller.getAll);
router.get('/:id',     controller.getById);

module.exports = router;