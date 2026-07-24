const fs = require('fs');
const path = require('path');
const { findCategoryOrService } = require('../utils/helpers');

const dataDir = path.join(__dirname, '../data');
const chatsPath = path.join(dataDir, 'chats.json');
const bookingsPath = path.join(dataDir, 'bookings.json');
const usersPath = path.join(dataDir, 'users.json');
const categoriesPath = path.join(dataDir, 'categories.json');

const chats = JSON.parse(fs.readFileSync(chatsPath, 'utf-8'));
const bookings = JSON.parse(fs.readFileSync(bookingsPath, 'utf-8'));
const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

let updated = 0;

chats.forEach(chat => {
  if (chat.bookingId && !chat.customerName) {
    const booking = bookings.find(b => b.id === chat.bookingId);
    if (booking) {
      chat.customerId = booking.customerId;
      chat.providerId = booking.providerId;
      chat.categoryId = booking.categoryId;
      chat.bookingDate = booking.date;
      chat.bookingTime = booking.time;
      
      const customer = users.find(u => u.id === booking.customerId);
      if (customer) {
        chat.customerName = customer.name;
      } else {
        chat.customerName = 'Unknown Customer';
      }
      
      const provider = users.find(u => u.providerId === booking.providerId);
      if (provider) {
        chat.providerName = provider.name;
      } else {
        chat.providerName = 'Unknown Provider';
      }
      
      const service = findCategoryOrService(categories, booking.categoryId);
      if (service) {
        chat.serviceName = service.name;
      } else {
        chat.serviceName = 'Unknown Service';
      }
      
      if (!chat.hiddenFor) {
        chat.hiddenFor = [];
      }
      
      updated++;
    }
  } else if (!chat.hiddenFor) {
    chat.hiddenFor = [];
    updated++;
  }
});

if (updated > 0) {
  fs.writeFileSync(chatsPath, JSON.stringify(chats, null, 2));
  console.log(`Successfully migrated ${updated} chats!`);
} else {
  console.log('No chats required migration.');
}
