const express = require('express');
const router = express.Router();
const { saveToken, testNotification } = require('./notifications.controller');
const { authenticateToken } = require('../../middleware/auth');

router.post('/token', authenticateToken, saveToken);
router.post('/test', authenticateToken, testNotification);

module.exports = router;