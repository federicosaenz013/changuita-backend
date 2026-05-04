const express = require('express');
const router = express.Router();
const controller = require('./messages.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/unread-count', authenticate, controller.getUnreadCount);
router.get('/:bookingId', authenticate, controller.getByBooking);

module.exports = router;