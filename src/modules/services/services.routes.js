const express    = require('express');
const router     = express.Router();
const controller = require('./services.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.get('/categories',   controller.getCategories);
router.get('/my-services',  authenticate, controller.getMyServices);
router.get('/',             controller.getAll);
router.get('/:id',          controller.getById);
router.post('/',            authenticate, requireRole('professional'), controller.create);
router.put('/:id',          authenticate, requireRole('professional'), controller.update);
router.patch('/:id',        authenticate, requireRole('professional'), controller.update);
router.delete('/:id',       authenticate, requireRole('professional'), controller.remove);

module.exports = router;