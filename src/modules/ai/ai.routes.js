const express    = require('express');
const router     = express.Router();
const { authenticate } = require('../../middleware/auth');
const { sugerirCategoria } = require('./ai.controller');

router.post('/sugerir-categoria', authenticate, sugerirCategoria);

module.exports = router;