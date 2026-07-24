const express = require('express');
const router = express.Router();
const walletsController = require('../controllers/walletsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Security Check: Only allow provider role to access wallet routes
router.use((req, res, next) => {
  if (req.user && req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Access denied: provider role required' });
  }
  next();
});

router.get('/', walletsController.getWallet);
router.post('/withdraw', walletsController.withdraw);

module.exports = router;
