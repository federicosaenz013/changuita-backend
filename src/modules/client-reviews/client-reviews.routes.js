const express = require('express');
const router = express.Router();
const controller = require('./client-reviews.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.post('/', authenticate, requireRole('professional'), controller.create);

module.exports = router;