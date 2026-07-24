const fs = require('fs');
const path = require('path');
const { generateId } = require('../utils/helpers');

const chatsPath = path.join(__dirname, '../data/chats.json');

const readJson = (p) => {
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
};
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

exports.getChats = (req, res) => {
  const chats = readJson(chatsPath);
  const usersPath = path.join(__dirname, '../data/users.json');
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  
  const currentUser = users.find((u) => u.id === req.user.id);
  if (!currentUser) return res.status(404).json({ success: false, message: 'User not found' });
  
  const isCustomer = req.user.role === 'customer';
  
  // Filter chats by the current user's role and ID, and exclude deleted chats
  const myChats = chats.filter(c => {
    if (c.hiddenFor && c.hiddenFor.includes(req.user.id)) return false;
    if (isCustomer) return c.customerId === currentUser.id;
    return c.providerId === currentUser.providerId; // provider uses providerId (e.g. prov_xyz)
  });
  
  let unreadTotal = 0;
  const conversations = myChats.map(chat => {
    let unreadCount = 0;
    let lastMessage = null;
    let lastMessageTime = null;
    
    if (chat.messages && chat.messages.length > 0) {
      lastMessage = chat.messages[chat.messages.length - 1].text;
      lastMessageTime = chat.messages[chat.messages.length - 1].timestamp;
      
      // Calculate unread count (messages sent by the other party that are not read)
      unreadCount = chat.messages.filter(m => m.senderId !== req.user.id && !m.read).length;
      unreadTotal += unreadCount;
    }

    return {
      bookingId: chat.bookingId,
      contactName: isCustomer ? chat.providerName : chat.customerName,
      contactAvatar: null, // Since we didn't migrate avatar, frontend handles fallback
      categoryId: chat.categoryId,
      serviceName: chat.serviceName,
      bookingDate: chat.bookingDate,
      bookingTime: chat.bookingTime,
      lastMessage,
      lastMessageTime,
      unreadCount
    };
  });
  
  // Sort by most recent message, then by booking date
  conversations.sort((a, b) => {
    if (a.lastMessageTime && b.lastMessageTime) {
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    }
    if (a.lastMessageTime) return -1;
    if (b.lastMessageTime) return 1;
    return 0;
  });

  res.json({ success: true, conversations, unreadTotal });
};

// Helper for generating new chat context
const { findCategoryOrService } = require('../utils/helpers');
const categoriesPath = path.join(__dirname, '../data/categories.json');

const generateNewChat = (booking, users) => {
  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  const customer = users.find(u => u.id === booking.customerId);
  const provider = users.find(u => u.providerId === booking.providerId);
  const service = findCategoryOrService(categories, booking.categoryId);
  
  return {
    id: generateId('chat'),
    bookingId: booking.id,
    customerId: booking.customerId,
    customerName: customer ? customer.name : 'Unknown Customer',
    providerId: booking.providerId,
    providerName: provider ? provider.name : 'Unknown Provider',
    categoryId: booking.categoryId,
    serviceName: service ? service.name : 'Unknown Service',
    bookingDate: booking.date,
    bookingTime: booking.time,
    hiddenFor: [],
    messages: []
  };
};

exports.getChat = (req, res) => {
  const chats = readJson(chatsPath);
  const { bookingId } = req.params;

  // Security Check: Is the user authorized to view this chat?
  const bookingsPath = path.join(__dirname, '../data/bookings.json');
  const usersPath = path.join(__dirname, '../data/users.json');
  const bookings = JSON.parse(fs.readFileSync(bookingsPath, 'utf-8'));
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  const currentUser = users.find((u) => u.id === req.user.id);
  const pId = currentUser ? currentUser.providerId : null;

  if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied: not your booking chat' });
  }
  if (req.user.role === 'provider' && booking.providerId !== pId) {
    return res.status(403).json({ success: false, message: 'Access denied: not your booking chat' });
  }

  let chat = chats.find((c) => c.bookingId === bookingId);
  if (!chat) {
    chat = generateNewChat(booking, users);
    chats.push(chat);
    writeJson(chatsPath, chats);
  }

  res.json({ success: true, chat });
};

exports.sendMessage = (req, res) => {
  const { bookingId } = req.params;
  const { text, image } = req.body;

  if (!text && !image) {
    return res.status(400).json({ success: false, message: 'Message text or image is required' });
  }

  // Security Check: Is the user authorized to send messages in this chat?
  const bookingsPath = path.join(__dirname, '../data/bookings.json');
  const usersPath = path.join(__dirname, '../data/users.json');
  const bookings = JSON.parse(fs.readFileSync(bookingsPath, 'utf-8'));
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  const currentUser = users.find((u) => u.id === req.user.id);
  const pId = currentUser ? currentUser.providerId : null;

  if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied: not your booking chat' });
  }
  if (req.user.role === 'provider' && booking.providerId !== pId) {
    return res.status(403).json({ success: false, message: 'Access denied: not your booking chat' });
  }

  const chats = readJson(chatsPath);
  const index = chats.findIndex((c) => c.bookingId === bookingId);

  let chat;
  if (index === -1) {
    chat = generateNewChat(booking, users);
    chats.push(chat);
  } else {
    chat = chats[index];
    // A new message means the conversation is active again.
    // We clear hiddenFor so both the sender and recipient can see the new activity.
    chat.hiddenFor = [];
  }

  const newMessage = {
    id: generateId('msg'),
    senderId: req.user.id,
    text: text || '',
    image: image || null,
    timestamp: new Date().toISOString(),
    read: false
  };

  chat.messages.push(newMessage);
  writeJson(chatsPath, chats);

  res.status(201).json({ success: true, message: newMessage });
};

exports.markAsRead = (req, res) => {
  const { bookingId } = req.params;
  const chats = readJson(chatsPath);
  const index = chats.findIndex((c) => c.bookingId === bookingId);

  if (index !== -1) {
    const chat = chats[index];
    chat.messages.forEach((m) => {
      if (m.senderId !== req.user.id) {
        m.read = true;
      }
    });
    writeJson(chatsPath, chats);
  }
  res.json({ success: true, message: 'Messages marked as read' });
};

exports.deleteChat = (req, res) => {
  const { bookingId } = req.params;
  const chats = readJson(chatsPath);
  const chat = chats.find(c => c.bookingId === bookingId);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }

  if (req.user.role === 'customer' && chat.customerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  if (!chat.hiddenFor) chat.hiddenFor = [];
  if (!chat.hiddenFor.includes(req.user.id)) {
    chat.hiddenFor.push(req.user.id);
    writeJson(chatsPath, chats);
  }
  
  res.json({ success: true, message: 'Chat deleted successfully' });
};
