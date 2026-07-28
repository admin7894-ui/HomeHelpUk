const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const JWT_SECRET = process.env.JWT_SECRET || 'homehelpuk_secret_key_poc_2026';

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // JWT Middleware for Socket Authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      // Allow unauthenticated connection fallback if token missing, but assign unauth room
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      console.warn('[Socket Auth Error]', err.message);
      // Proceed without user payload if token invalid, instead of crashing connection
      socket.user = null;
      return next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (user) {
      console.log(`[Socket Connected] User: ${user.id} (${user.role}) | Socket ID: ${socket.id}`);
      
      // Join user-specific room
      socket.join(`user_${user.id}`);

      if (user.role === 'provider' && user.providerId) {
        socket.join(`provider_${user.providerId}`);
        console.log(`[Socket Joined Room] provider_${user.providerId}`);
      }

      if (user.role === 'admin') {
        socket.join('admin_dashboard');
        console.log(`[Socket Joined Room] admin_dashboard`);
      }
    } else {
      console.log(`[Socket Connected Anonymous] Socket ID: ${socket.id}`);
    }

    // Dynamic Room Join with Authorization Check
    socket.on('join_booking_room', ({ bookingId }) => {
      if (bookingId) {
        socket.join(`booking_${bookingId}`);
        console.log(`[Socket Joined Room] booking_${bookingId}`);
      }
    });

    socket.on('leave_booking_room', ({ bookingId }) => {
      if (bookingId) {
        socket.leave(`booking_${bookingId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket Disconnected] ${socket.id} (${reason})`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    console.warn('[Socket Warning] IO instance accessed before initialization.');
  }
  return io;
}

// Event Emitters for Controllers
function emitBookingCreated(booking, eligibleProviderIds = []) {
  if (!io) return;
  const payload = { booking, timestamp: Date.now() };

  // Notify eligible providers
  eligibleProviderIds.forEach((pId) => {
    io.to(`provider_${pId}`).emit('booking:created', payload);
  });

  // Notify admin dashboard
  io.to('admin_dashboard').emit('booking:created', payload);
  console.log(`[Socket Broadcast] booking:created emitted for booking ${booking.id}`);

  // Trigger Asynchronous Push Notifications
  try {
    const { sendPushNotification } = require('./pushNotifications');
    const db = require('../db');
    eligibleProviderIds.forEach(async (pId) => {
      const pRes = await db.query('SELECT user_id FROM providers WHERE id = $1', [pId]);
      if (pRes.rows.length > 0) {
        sendPushNotification(
          pRes.rows[0].user_id,
          'New Job Request Available',
          `A new ${booking.serviceName || 'service'} booking is available near you.`,
          { type: 'booking_created', bookingId: booking.id, screen: 'JobFeed' },
          'job-requests'
        );
      }
    });
  } catch (pErr) {}
}

function emitBookingAccepted(booking) {
  if (!io) return;
  const payload = { booking, timestamp: Date.now() };

  io.to(`user_${booking.customerId}`).emit('booking:accepted', payload);
  io.to(`booking_${booking.id}`).emit('booking:accepted', payload);
  io.to('admin_dashboard').emit('booking:accepted', payload);
  console.log(`[Socket Broadcast] booking:accepted emitted for booking ${booking.id}`);

  // Push Notification to Customer
  try {
    const { sendPushNotification } = require('./pushNotifications');
    sendPushNotification(
      booking.customerId,
      'Booking Accepted',
      'Your service booking has been accepted by a provider.',
      { type: 'booking_accepted', bookingId: booking.id, screen: 'BookingStatus' },
      'booking-updates'
    );
  } catch (pErr) {}
}

function emitBookingDeclined(booking, providerId) {
  if (!io) return;
  const payload = { booking, providerId, timestamp: Date.now() };

  io.to(`user_${booking.customerId}`).emit('booking:declined', payload);
  io.to(`booking_${booking.id}`).emit('booking:declined', payload);
  io.to('admin_dashboard').emit('booking:declined', payload);
  console.log(`[Socket Broadcast] booking:declined emitted for booking ${booking.id}`);

  // Push Notification to Customer
  try {
    const { sendPushNotification } = require('./pushNotifications');
    sendPushNotification(
      booking.customerId,
      'Booking Request Declined',
      'A provider declined your request. We are matching another provider.',
      { type: 'booking_declined', bookingId: booking.id, screen: 'BookingStatus' },
      'booking-updates'
    );
  } catch (pErr) {}
}

function emitBookingStatusChanged(booking) {
  if (!io) return;
  const payload = {
    bookingId: booking.id,
    status: booking.status,
    providerId: booking.providerId,
    customerId: booking.customerId,
    booking,
    timestamp: Date.now()
  };

  io.to(`user_${booking.customerId}`).emit('booking:status_changed', payload);
  if (booking.providerId && booking.providerId !== 'open') {
    io.to(`provider_${booking.providerId}`).emit('booking:status_changed', payload);
  }
  io.to(`booking_${booking.id}`).emit('booking:status_changed', payload);
  io.to('admin_dashboard').emit('booking:status_changed', payload);
  console.log(`[Socket Broadcast] booking:status_changed (${booking.status}) emitted for booking ${booking.id}`);

  // Push Notification to Customer
  try {
    const statusTitles = {
      en_route: 'Provider En Route',
      arrived: 'Provider Arrived',
      in_progress: 'Job Started'
    };
    const statusBodies = {
      en_route: 'Your service provider is on the way to your location.',
      arrived: 'Your service provider has arrived.',
      in_progress: 'Your service provider has started the job.'
    };
    if (statusTitles[booking.status]) {
      const { sendPushNotification } = require('./pushNotifications');
      sendPushNotification(
        booking.customerId,
        statusTitles[booking.status],
        statusBodies[booking.status],
        { type: 'booking_status_changed', bookingId: booking.id, status: booking.status, screen: 'BookingStatus' },
        'booking-updates'
      );
    }
  } catch (pErr) {}
}

function emitBookingCompleted(booking) {
  if (!io) return;
  const payload = { bookingId: booking.id, booking, timestamp: Date.now() };

  io.to(`user_${booking.customerId}`).emit('booking:completed', payload);
  if (booking.providerId && booking.providerId !== 'open') {
    io.to(`provider_${booking.providerId}`).emit('booking:completed', payload);
  }
  io.to(`booking_${booking.id}`).emit('booking:completed', payload);
  io.to('admin_dashboard').emit('booking:completed', payload);
  console.log(`[Socket Broadcast] booking:completed emitted for booking ${booking.id}`);

  // Push Notification to Customer
  try {
    const { sendPushNotification } = require('./pushNotifications');
    sendPushNotification(
      booking.customerId,
      'Service Completed',
      'Your service has been marked as complete. Please leave a review!',
      { type: 'booking_completed', bookingId: booking.id, screen: 'BookingStatus' },
      'booking-updates'
    );
  } catch (pErr) {}
}

function emitBookingCancelled(booking) {
  if (!io) return;
  const payload = { bookingId: booking.id, booking, timestamp: Date.now() };

  if (booking.providerId && booking.providerId !== 'open') {
    io.to(`provider_${booking.providerId}`).emit('booking:cancelled', payload);
  }
  io.to(`user_${booking.customerId}`).emit('booking:cancelled', payload);
  io.to(`booking_${booking.id}`).emit('booking:cancelled', payload);
  io.to('admin_dashboard').emit('booking:cancelled', payload);
  console.log(`[Socket Broadcast] booking:cancelled emitted for booking ${booking.id}`);

  // Push Notification to Provider
  try {
    const { sendPushNotification } = require('./pushNotifications');
    const db = require('../db');
    if (booking.providerId && booking.providerId !== 'open') {
      db.query('SELECT user_id FROM providers WHERE id = $1', [booking.providerId]).then(pRes => {
        if (pRes.rows.length > 0) {
          sendPushNotification(
            pRes.rows[0].user_id,
            'Booking Cancelled',
            'A booking assigned to you has been cancelled by the customer.',
            { type: 'booking_cancelled', bookingId: booking.id, screen: 'MyJobs' },
            'booking-updates'
          );
        }
      });
    }
  } catch (pErr) {}
}

function emitMessageSent(message, conversation) {
  if (!io) return;
  const payload = { message, conversation, timestamp: Date.now() };

  io.to(`user_${conversation.customerId}`).emit('chat:message_sent', payload);
  io.to(`provider_${conversation.providerId}`).emit('chat:message_sent', payload);
  console.log(`[Socket Broadcast] chat:message_sent emitted for message ${message.id}`);

  // Push Notification to Recipient
  try {
    const { sendPushNotification } = require('./pushNotifications');
    const db = require('../db');
    const recipientUserId = message.senderId === conversation.customerId ? null : conversation.customerId;
    
    const notifyRecipient = (targetUserId) => {
      sendPushNotification(
        targetUserId,
        'New Message',
        message.text ? (message.text.length > 50 ? message.text.slice(0, 50) + '...' : message.text) : 'Sent an image attachment.',
        { type: 'chat_message', bookingId: conversation.bookingId, conversationId: conversation.id, screen: 'Chat' },
        'chat-messages'
      );
    };

    if (recipientUserId) {
      notifyRecipient(recipientUserId);
    } else {
      db.query('SELECT user_id FROM providers WHERE id = $1', [conversation.providerId]).then(pRes => {
        if (pRes.rows.length > 0) notifyRecipient(pRes.rows[0].user_id);
      });
    }
  } catch (pErr) {}
}

function emitWalletUpdated(providerId, walletData) {
  if (!io) return;
  const payload = { providerId, wallet: walletData, timestamp: Date.now() };

  io.to(`provider_${providerId}`).emit('wallet:updated', payload);
  console.log(`[Socket Broadcast] wallet:updated emitted for provider ${providerId}`);

  // Push Notification to Provider
  try {
    const { sendPushNotification } = require('./pushNotifications');
    const db = require('../db');
    db.query('SELECT user_id FROM providers WHERE id = $1', [providerId]).then(pRes => {
      if (pRes.rows.length > 0) {
        sendPushNotification(
          pRes.rows[0].user_id,
          'Wallet & Earnings Updated',
          'Your earnings have been credited for job completion.',
          { type: 'wallet_updated', screen: 'Wallet' },
          'wallet-earnings'
        );
      }
    });
  } catch (pErr) {}
}

function emitCatalogUpdated(action, details = {}) {
  if (!io) return;
  const payload = { action, details, timestamp: Date.now() };

  io.emit('catalog:updated', payload);
  console.log(`[Socket Broadcast] catalog:updated (${action}) emitted to all clients`);
}

module.exports = {
  initSocket,
  getIO,
  emitBookingCreated,
  emitBookingAccepted,
  emitBookingDeclined,
  emitBookingStatusChanged,
  emitBookingCompleted,
  emitBookingCancelled,
  emitMessageSent,
  emitWalletUpdated,
  emitCatalogUpdated
};
