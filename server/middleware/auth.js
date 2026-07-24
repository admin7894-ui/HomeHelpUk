const { decodeFakeToken } = require('../utils/helpers');

// Demo-only auth middleware. Reads a fake bearer token and attaches the
// decoded payload to req.user. No real security — POC purposes only.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing auth token' });
  }

  const decoded = decodeFakeToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

module.exports = authMiddleware;
