const express = require('express');
const router = express.Router();
const chatsController = require('../controllers/chatsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', chatsController.getChats);
router.get('/:bookingId', chatsController.getChat);
router.post('/:bookingId/message', chatsController.sendMessage);
router.patch('/:bookingId/read', chatsController.markAsRead);
router.delete('/:bookingId', chatsController.deleteChat);

module.exports = router;
