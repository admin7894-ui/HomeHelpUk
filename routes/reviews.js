const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/provider/:providerId', reviewsController.getByProvider);
router.post('/', reviewsController.create);

module.exports = router;
