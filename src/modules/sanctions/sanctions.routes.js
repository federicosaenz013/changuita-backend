const express = require('express');
const router  = express.Router();
const controller = require('./sanctions.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/my', authenticate, controller.getMySanctions);

module.exports = router;