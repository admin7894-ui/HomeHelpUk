const db = require('../db');

exports.getForUser = async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'Access denied: not your notifications' });
    }

    const nRes = await db.query(
      `SELECT id, user_id as "userId", title, message, read, created_at as "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.params.userId]
    );

    const notifications = nRes.rows.map(n => ({
      ...n,
      read: Boolean(n.read),
      createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString()
    }));

    res.json({ success: true, notifications });
  } catch (err) {
    console.error('[Notifications getForUser Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const nRes = await db.query('SELECT * FROM notifications WHERE id = $1', [req.params.id]);
    if (nRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Notification not found' });

    const notif = nRes.rows[0];
    if (notif.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: not your notification' });
    }

    await db.query('UPDATE notifications SET read = true WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      notification: {
        id: notif.id,
        userId: notif.user_id,
        title: notif.title,
        message: notif.message,
        read: true,
        createdAt: notif.created_at ? new Date(notif.created_at).toISOString() : new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[Notifications markRead Error]', err);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};
