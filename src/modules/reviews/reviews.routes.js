const express    = require('express');
const router     = express.Router();
const controller = require('./reviews.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.post('/',           authenticate, requireRole('client'), controller.create);
router.get('/professional/:professionalId', controller.getByProfessional);

module.exports = router;