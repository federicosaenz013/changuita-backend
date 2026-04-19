const express = require('express');
const router = express.Router();
const { saveToken, testNotification } = require('./notifications.controller');
const { authenticate } = require('../../middleware/auth');

router.post('/token', authenticate, saveToken);
router.post('/test', authenticate, testNotification);

module.exports = router;