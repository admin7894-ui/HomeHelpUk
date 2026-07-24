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
  // e.g., "2026-07-23", "10:00 AM"
  if (!dateStr || !timeStr) return null;
  
  try {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') hours = '00';
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }
    
    const isoString = `${dateStr}T${hours.toString().padStart(2, '0')}:${minutes}:00`;
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

module.exports = { generateId, generateFakeToken, decodeFakeToken, findCategoryOrService, parseTime, hasTimeOverlap };
