const express    = require('express');
const router     = express.Router();
const controller = require('./subscriptions.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.get('/planes',    controller.getPlanes);
router.get('/my',        authenticate, requireRole('professional'), controller.getMyPlan);
router.post('/subscribe', authenticate, requireRole('professional'), controller.subscribeToPlan);

module.exports = router;