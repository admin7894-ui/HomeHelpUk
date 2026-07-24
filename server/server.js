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

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple request log — handy during the investor demo
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'HomeHelpUK API (POC / mock backend) is running' });
});

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

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
