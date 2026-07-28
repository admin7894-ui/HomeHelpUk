const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/push-token', profileController.savePushToken);
router.patch('/:id', profileController.update);
router.post('/:id/favourites', profileController.toggleFavourite);

module.exports = router;
