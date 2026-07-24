const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/user/:userId', notificationsController.getForUser);
router.patch('/:id/read', notificationsController.markRead);

module.exports = router;
