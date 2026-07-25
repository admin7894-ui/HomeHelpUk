const express = require('express');
const router = express.Router();
const providersController = require('../controllers/providersController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', providersController.getAll);
router.get('/:id', providersController.getById);
router.patch('/:id', providersController.update);
router.put('/:id/services/:serviceId', providersController.updateServiceDetail);

module.exports = router;
