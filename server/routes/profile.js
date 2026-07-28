const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.patch('/:id', profileController.update);
router.post('/:id/favourites', profileController.toggleFavourite);
router.post('/push-token', profileController.savePushToken);

module.exports = router;
