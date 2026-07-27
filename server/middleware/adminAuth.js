const { decodeFakeToken } = require('../utils/helpers');

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing authorization token' });
  }

  const decoded = decodeFakeToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  if (decoded.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: Admin authorization required' });
  }

  req.user = decoded;
  next();
}

module.exports = adminAuth;
