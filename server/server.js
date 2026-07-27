const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const providersRoutes = require('./routes/providers');
const bookingsRoutes = require('./routes/bookings');
const reviewsRoutes = require('./routes/reviews');
const notificationsRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const walletRoutes = require('./routes/wallet');
const chatsRoutes = require('./routes/chats');
const adminRoutes = require('./routes/admin');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  process.env.ADMIN_PANEL_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  'https://home-help-uk-gvf1.vercel.app',
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:4000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('CORS policy violation: Origin not allowed'));
  },
  credentials: true
}));
app.use(express.json());

// Serve Admin Web Panel statically at /admin
const adminPanelPath = path.join(__dirname, '../admin-panel');
app.use('/admin', express.static(adminPanelPath));
app.get(['/admin', '/admin/*'], (req, res) => {
  res.sendFile(path.join(adminPanelPath, 'index.html'));
});

// Simple request log — handy during the investor demo
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'HomeHelpUK API (POC / mock backend) is running' });
});

app.get('/health', async (req, res) => {
  try {
    const db = require('./db');
    await db.query('SELECT 1');
    res.json({ success: true, status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ success: false, status: 'error', db: 'disconnected', message: err.message });
  }
});

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/provider/wallet', walletRoutes);
app.use('/api/chats', chatsRoutes);

// 404 handler
app.use((req, res) => {
  const logDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    statusCode: 404,
    message: 'Route not found',
  };
  console.warn('[API 404 Log]', JSON.stringify(logDetails, null, 2));
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    statusCode: err.status || 500,
    message: err.message,
    stack: err.stack,
  };
  console.error('[API Error Log]', JSON.stringify(errorDetails, null, 2));

  res.status(errorDetails.statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: err.stack
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HomeHelpUK API running on http://0.0.0.0:${PORT}`);
});
