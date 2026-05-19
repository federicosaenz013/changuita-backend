const express    = require('express');
const router     = express.Router();
const controller = require('./subscriptions.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.get('/planes',    controller.getPlanes);
router.get('/my',        authenticate, requireRole('professional'), controller.getMyPlan);
router.get('/status', authenticate, subscriptionsController.getStatus);
router.post('/subscribe', authenticate, requireRole('professional'), controller.subscribeToPlan);
router.get('/mp-success', controller.mpSuccess);
router.get('/mp-failure', controller.mpFailure);
router.get('/mp-pending',  controller.mpPending);

module.exports = router;