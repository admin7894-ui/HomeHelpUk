const fs = require('fs');
const path = require('path');

const notificationsPath = path.join(__dirname, '../data/notifications.json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

exports.getForUser = (req, res) => {
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ success: false, message: 'Access denied: not your notifications' });
  }

  const notifications = readJson(notificationsPath)
    .filter((n) => n.userId === req.params.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, notifications });
};

exports.markRead = (req, res) => {
  const notifications = readJson(notificationsPath);
  const index = notifications.findIndex((n) => n.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Notification not found' });

  if (notifications[index].userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied: not your notification' });
  }

  notifications[index].read = true;
  writeJson(notificationsPath, notifications);
  res.json({ success: true, notification: notifications[index] });
};
