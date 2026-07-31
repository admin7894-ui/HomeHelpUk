const crypto = require('crypto');

function generateId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_homehelpuk_key_1784609943234';

const jwt = require('jsonwebtoken');

function generateFakeToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
  };
  // Using 7d expiration for the demo
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function decodeFakeToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null; // or throw depending on how we want to handle it
  }
}

function findCategoryOrService(categories, id) {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        if (sub.id === id) return sub;
        if (sub.services) {
          for (const service of sub.services) {
            if (service.id === id) return service;
          }
        }
      }
    }
  }
  return null;
}

function parseTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  
  try {
    let cleanDate = dateStr;
    if (dateStr instanceof Date) {
      cleanDate = dateStr.toISOString().split('T')[0];
    } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
      cleanDate = dateStr.split('T')[0];
    }

    const parts = String(timeStr).trim().split(/\s+/);
    if (parts.length < 2) return null;
    const [time, modifier] = parts;
    let [hours, minutes] = time.split(':');
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10) || 0;

    const mod = modifier.toUpperCase();
    if (mod === 'PM' && h < 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;
    
    const isoString = `${cleanDate}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
    return new Date(isoString).getTime();
  } catch (err) {
    return null;
  }
}

function hasTimeOverlap(bookingA, bookingB) {
  const startA = parseTime(bookingA.date, bookingA.time);
  const startB = parseTime(bookingB.date, bookingB.time);
  
  if (!startA || !startB) return false;
  
  const endA = startA + (Number(bookingA.durationHours || 1) * 60 * 60 * 1000);
  const endB = startB + (Number(bookingB.durationHours || 1) * 60 * 60 * 1000);
  
  // Overlap occurs if A starts before B ends AND B starts before A ends
  return (startA < endB) && (startB < endA);
}

module.exports = { generateId, generateFakeToken, decodeFakeToken, verifyToken: decodeFakeToken, findCategoryOrService, parseTime, hasTimeOverlap };
