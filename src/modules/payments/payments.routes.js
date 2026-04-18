const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const { authenticate } = require('../../middleware/auth');

router.post('/create-preference', authenticate, paymentsController.createPreference);
router.post('/webhook', paymentsController.webhook);

module.exports = router;