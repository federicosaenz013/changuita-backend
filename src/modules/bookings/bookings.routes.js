const express    = require('express');
const router     = express.Router();
const controller = require('./bookings.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.post('/',            authenticate, controller.create);
router.get('/',             authenticate, controller.getByUser);
router.get('/:id',          authenticate, controller.getById);
router.put('/:id/accept',   authenticate, requireRole('professional'), controller.accept);
router.put('/:id/reject',   authenticate, requireRole('professional'), controller.reject);
router.put('/:id/complete', authenticate, requireRole('professional'), controller.complete);
router.put('/:id/cancel',   authenticate, controller.cancel);
router.put('/:id/seen',     authenticate, controller.markSeen);

module.exports = router;