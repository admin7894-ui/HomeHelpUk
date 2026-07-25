const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/status-flow', bookingsController.getStatusFlow);
router.get('/', bookingsController.getAll);
router.get('/declined', bookingsController.getDeclined);
router.get('/:id', bookingsController.getById);
router.post('/', bookingsController.create);
router.patch('/:id/status', bookingsController.updateStatus);
router.post('/:id/decline', bookingsController.decline);

module.exports = router;
