const db = require('../db');
const { generateId } = require('../utils/helpers');

async function getFormattedChat(conversationId) {
  const cRes = await db.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
  if (cRes.rows.length === 0) return null;
  const c = cRes.rows[0];

  const mRes = await db.query(
    `SELECT id, sender_id as "senderId", text, image_url as image, read, timestamp
     FROM messages
     WHERE conversation_id = $1
     ORDER BY timestamp ASC`,
    [c.id]
  );

  // Fetch names
  const custRes = await db.query('SELECT name FROM users WHERE id = $1', [c.customer_id]);
  const customerName = custRes.rows[0] ? custRes.rows[0].name : 'Unknown Customer';

  const provRes = await db.query(
    'SELECT u.name FROM providers p JOIN users u ON p.user_id = u.id WHERE p.id = $1',
    [c.provider_id]
  );
  const providerName = provRes.rows[0] ? provRes.rows[0].name : 'Unknown Provider';

  return {
    id: c.id,
    bookingId: c.booking_id,
    customerId: c.customer_id,
    customerName,
    providerId: c.provider_id,
    providerName,
    categoryId: c.category_id,
    serviceName: c.service_name || '',
    bookingDate: c.booking_date ? new Date(c.booking_date).toISOString().split('T')[0] : c.booking_date,
    bookingTime: c.booking_time || '',
    hiddenFor: c.hidden_for || [],
    messages: mRes.rows.map(m => ({
      ...m,
      read: Boolean(m.read),
      timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()
    }))
  };
}

function getChatStatusRule(booking) {
  if (!booking) {
    return { active: false, archived: true, hidden: true, reason: 'Booking not found' };
  }

  const status = (booking.status || '').toLowerCase();
  const isDisputed = Boolean(booking.is_disputed || booking.hasDispute);

  // Rule 1: Pending or Rejected bookings cannot access or create chat
  if (status === 'pending' || status === 'rejected') {
    return { active: false, archived: false, hidden: true, reason: 'Chat is not available before provider accepts job request' };
  }

  // Rule 2: Active booking execution states
  if (['assigned', 'accepted', 'en_route', 'in_progress'].includes(status)) {
    return { active: true, archived: false, hidden: false };
  }

  const lastUpdate = booking.updated_at ? new Date(booking.updated_at).getTime() : Date.now();
  const now = Date.now();

  // Rule 3: Post-completion 7-day window
  if (status === 'completed') {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (now - lastUpdate > SEVEN_DAYS_MS && !isDisputed) {
      return { active: false, archived: true, hidden: true, reason: 'Chat archived after 7 days of completion' };
    }
    return { active: true, archived: false, hidden: false, postCompletion: true };
  }

  // Rule 4: Cancellation 24-48 hour window
  if (status === 'cancelled') {
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (now - lastUpdate > TWENTY_FOUR_HOURS_MS && !isDisputed) {
      return { active: false, archived: true, hidden: true, reason: 'Chat archived after cancellation window' };
    }
    return { active: true, archived: false, hidden: false, cancelled: true };
  }

  return { active: true, archived: false, hidden: false };
}

async function ensureConversationExists(bookingId, forceAllowPending = false) {
  // Fetch booking details
  const bRes = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  if (bRes.rows.length === 0) return null;
  const b = bRes.rows[0];

  const rule = getChatStatusRule(b);
  if (!forceAllowPending && rule.hidden && (b.status === 'pending' || b.status === 'rejected')) {
    return null;
  }

  let cRes = await db.query('SELECT id FROM conversations WHERE booking_id = $1', [bookingId]);
  if (cRes.rows.length > 0) {
    return cRes.rows[0].id;
  }

  // If chat is hidden/pending and no force, do not create
  if (!forceAllowPending && rule.hidden) return null;

  // Fetch service name
  let serviceName = 'Service';
  const srvRes = await db.query('SELECT name FROM services WHERE id = $1', [b.category_id]);
  if (srvRes.rows.length > 0) {
    serviceName = srvRes.rows[0].name;
  }

  const convId = generateId('chat');
  await db.query(
    `INSERT INTO conversations (id, booking_id, customer_id, provider_id, category_id, service_name, booking_date, booking_time, hidden_for)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb)`,
    [convId, b.id, b.customer_id, b.provider_id || '', b.category_id, serviceName, b.date, b.time]
  );

  return convId;
}

exports.getChats = async (req, res) => {
  try {
    const isCustomer = req.user.role === 'customer';
    let pId = null;
    if (!isCustomer) {
      const pRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
      pId = pRes.rows[0] ? pRes.rows[0].id : null;
    }

    let sql = `
      SELECT 
        c.id as conversation_id,
        c.booking_id as "bookingId",
        c.customer_id as "customerId",
        c.provider_id as "providerId",
        c.category_id as "categoryId",
        c.service_name as "serviceName",
        c.booking_date as "bookingDate",
        c.booking_time as "bookingTime",
        c.hidden_for,
        b.status as "bookingStatus",
        b.updated_at as "bookingUpdatedAt",
        cust.name as "customerName",
        prov_u.name as "providerName",
        lm.text as "lastMessage",
        lm.timestamp as "lastMessageTime",
        COALESCE(un.unread_count, 0)::int as "unreadCount"
      FROM conversations c
      JOIN bookings b ON c.booking_id = b.id
      JOIN users cust ON c.customer_id = cust.id
      LEFT JOIN providers p ON c.provider_id = p.id
      LEFT JOIN users prov_u ON p.user_id = prov_u.id
      LEFT JOIN LATERAL (
        SELECT text, timestamp
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as unread_count
        FROM messages
        WHERE conversation_id = c.id AND sender_id != $1 AND read = false
      ) un ON true
      WHERE 1=1
    `;

    const params = [req.user.id];
    if (isCustomer) {
      params.push(req.user.id);
      sql += ` AND c.customer_id = $${params.length}`;
    } else {
      if (!pId) return res.json({ success: true, conversations: [], unreadTotal: 0 });
      params.push(pId);
      sql += ` AND c.provider_id = $${params.length}`;
    }

    sql += ` ORDER BY lm.timestamp DESC NULLS LAST`;

    const convRes = await db.query(sql, params);
    const conversations = [];
    let unreadTotal = 0;

    for (const row of convRes.rows) {
      const hiddenFor = row.hidden_for || [];
      if (hiddenFor.includes(req.user.id)) continue;

      const rule = getChatStatusRule({ status: row.bookingStatus, updated_at: row.bookingUpdatedAt });
      if (rule.hidden) continue;

      const unreadCount = Number(row.unreadCount) || 0;
      unreadTotal += unreadCount;

      conversations.push({
        bookingId: row.bookingId,
        contactName: isCustomer ? (row.providerName || 'Provider') : (row.customerName || 'Customer'),
        contactAvatar: null,
        categoryId: row.categoryId,
        serviceName: row.serviceName,
        bookingDate: row.bookingDate ? new Date(row.bookingDate).toISOString().split('T')[0] : row.bookingDate,
        bookingTime: row.bookingTime,
        bookingStatus: row.bookingStatus,
        lastMessage: row.lastMessage || null,
        lastMessageTime: row.lastMessageTime ? new Date(row.lastMessageTime).toISOString() : null,
        unreadCount
      });
    }

    res.json({ success: true, conversations, unreadTotal });
  } catch (err) {
    console.error('[Chats getChats Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

exports.getChat = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const bRes = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (bRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
    const b = bRes.rows[0];

    const pRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const pId = pRes.rows[0] ? pRes.rows[0].id : null;

    if (req.user.role === 'customer' && b.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: not your booking chat' });
    }
    if (req.user.role === 'provider' && b.provider_id !== pId) {
      return res.status(403).json({ success: false, message: 'Access denied: not your booking chat' });
    }

    const rule = getChatStatusRule(b);
    if (rule.hidden) {
      return res.status(403).json({ success: false, message: rule.reason || 'Chat is not available before provider accepts job request.', chatRule: rule });
    }

    const convId = await ensureConversationExists(bookingId);
    if (!convId) return res.status(404).json({ success: false, message: 'Chat conversation could not be initialized' });

    const chat = await getFormattedChat(convId);
    res.json({ success: true, chat, chatRule: rule });
  } catch (err) {
    console.error('[Chats getChat Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat conversation' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { text, image } = req.body;

    if (!text && !image) {
      return res.status(400).json({ success: false, message: 'Message text or image is required' });
    }

    const bRes = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (bRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
    const b = bRes.rows[0];

    const pRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const pId = pRes.rows[0] ? pRes.rows[0].id : null;

    if (req.user.role === 'customer' && b.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: not your booking chat' });
    }
    if (req.user.role === 'provider' && b.provider_id !== pId) {
      return res.status(403).json({ success: false, message: 'Access denied: not your booking chat' });
    }

    const rule = getChatStatusRule(b);
    if (rule.hidden || !rule.active) {
      return res.status(403).json({ success: false, message: rule.reason || 'Chat is inactive or archived for this booking.' });
    }

    const convId = await ensureConversationExists(bookingId);
    await db.query(`UPDATE conversations SET hidden_for = '[]'::jsonb, updated_at = NOW() WHERE id = $1`, [convId]);

    const msgId = generateId('msg');
    const nowIso = new Date().toISOString();
    await db.query(
      `INSERT INTO messages (id, conversation_id, sender_id, text, image_url, read, timestamp)
       VALUES ($1, $2, $3, $4, $5, false, $6)`,
      [msgId, convId, req.user.id, text || '', image || null, nowIso]
    );

    const newMessage = {
      id: msgId,
      senderId: req.user.id,
      text: text || '',
      image: image || null,
      timestamp: nowIso,
      read: false
    };

    // Emit Real-Time Socket Broadcast
    try {
      const socket = require('../utils/socket');
      const convRes = await db.query('SELECT customer_id, provider_id FROM conversations WHERE id = $1', [convId]);
      if (convRes.rows.length > 0) {
        socket.emitMessageSent(newMessage, {
          id: convId,
          bookingId,
          customerId: convRes.rows[0].customer_id,
          providerId: convRes.rows[0].provider_id
        });
      }
    } catch (sErr) {
      console.warn('[Socket Chat Broadcast Error]', sErr.message);
    }

    res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    console.error('[Chats sendMessage Error]', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const convRes = await db.query('SELECT id FROM conversations WHERE booking_id = $1', [bookingId]);
    if (convRes.rows.length > 0) {
      const convId = convRes.rows[0].id;
      await db.query(
        `UPDATE messages SET read = true WHERE conversation_id = $1 AND sender_id != $2`,
        [convId, req.user.id]
      );
    }
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error('[Chats markAsRead Error]', err);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const convRes = await db.query('SELECT id, customer_id, hidden_for FROM conversations WHERE booking_id = $1', [bookingId]);
    if (convRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const conv = convRes.rows[0];
    if (req.user.role === 'customer' && conv.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let hiddenFor = conv.hidden_for || [];
    if (!Array.isArray(hiddenFor)) hiddenFor = [];

    if (!hiddenFor.includes(req.user.id)) {
      hiddenFor.push(req.user.id);
      await db.query('UPDATE conversations SET hidden_for = $1 WHERE id = $2', [JSON.stringify(hiddenFor), conv.id]);
    }

    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (err) {
    console.error('[Chats deleteChat Error]', err);
    res.status(500).json({ success: false, message: 'Failed to delete chat' });
  }
};
