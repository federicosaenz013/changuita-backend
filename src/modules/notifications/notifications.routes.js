const express = require('express');
const router = express.Router();
const { saveToken, testNotification, getNotifications, markAllRead, getUnreadCount } = require('./notifications.controller');
const { authenticate } = require('../../middleware/auth');

router.post('/token',      authenticate, saveToken);
router.post('/test',       authenticate, testNotification);
router.get('/',            authenticate, getNotifications);
router.put('/read-all',    authenticate, markAllRead);
router.get('/unread-count', authenticate, getUnreadCount);

module.exports = router;