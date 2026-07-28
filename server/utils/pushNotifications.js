const { Expo } = require('expo-server-sdk');
const db = require('../db');
const { generateId } = require('../utils/helpers');

const expo = new Expo();

async function registerPushToken(userId, pushToken, platform = 'android', deviceId = null) {
  if (!userId || !pushToken) return null;
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn(`[Push Service] Invalid Expo push token: ${pushToken}`);
    return null;
  }

  const tokenId = generateId('token');
  try {
    await db.query(
      `INSERT INTO user_push_tokens (id, user_id, push_token, platform, device_id, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       ON CONFLICT (push_token) 
       DO UPDATE SET user_id = EXCLUDED.user_id, is_active = true, updated_at = NOW()`,
      [tokenId, userId, pushToken, platform, deviceId]
    );
    console.log(`[Push Token Registered] User: ${userId} | Token: ${pushToken.slice(0, 20)}...`);
    return true;
  } catch (err) {
    console.error('[Push Token Register Error]', err);
    return false;
  }
}

async function deactivatePushToken(pushToken) {
  try {
    await db.query(`UPDATE user_push_tokens SET is_active = false, updated_at = NOW() WHERE push_token = $1`, [pushToken]);
    console.log(`[Push Token Deactivated] ${pushToken.slice(0, 20)}...`);
  } catch (err) {
    console.error('[Push Token Deactivate Error]', err);
  }
}

async function sendPushNotification(userId, title, body, data = {}, categoryId = null) {
  try {
    const res = await db.query(
      `SELECT push_token FROM user_push_tokens WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    console.log(`[Push Token Lookup] Target User ID: ${userId} | Tokens Found: ${res.rows.length}`);

    if (res.rows.length === 0) {
      console.warn(`[Push Dispatch Warning] No active push token stored for User ID: ${userId}`);
      return;
    }

    const pushTokens = res.rows.map(r => r.push_token);
    const messages = [];

    for (const pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.warn(`[Push Warning] Invalid token for user ${userId}: ${pushToken.slice(0, 20)}...`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: { ...data, userId },
        categoryId,
        priority: 'high',
        channelId: data.channelId || 'chat-messages',
      });
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        ticketChunk.forEach((ticket, idx) => {
          if (ticket.status === 'ok') {
            console.log(`[Push Ticket Success] User: ${userId} | Ticket ID: ${ticket.id}`);
          } else if (ticket.status === 'error') {
            console.error(`[Push Ticket Error] User: ${userId} | Message: ${ticket.message} | Code: ${ticket.details?.error}`);
            if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
              deactivatePushToken(chunk[idx].to);
            }
          }
        });
      } catch (error) {
        console.error('[Push Chunk Send Error]', error);
      }
    }
  } catch (err) {
    console.error('[Send Push Notification Error]', err);
  }
}

module.exports = {
  registerPushToken,
  deactivatePushToken,
  sendPushNotification,
};
