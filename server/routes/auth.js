const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authMiddleware, authController.me);
router.get('/push-status/:userId', async (req, res) => {
  try {
    const db = require('../db');
    const r = await db.query('SELECT count(*) as count FROM user_push_tokens WHERE user_id = $1 AND is_active = true', [req.params.userId]);
    res.json({ success: true, userId: req.params.userId, activeTokensFound: parseInt(r.rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
