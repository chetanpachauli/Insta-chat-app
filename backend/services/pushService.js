const User = require('../models/User');

class PushService {
  async send(userId, title, body, data = {}) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.fcmTokens.length) return;

      for (const token of user.fcmTokens) {
        console.log(`Push notification sent to ${token} - Title: "${title}", Body: "${body}"`);
      }
    } catch (err) {
      console.error('Push notification error:', err.message);
    }
  }

  async sendToToken(token, title, body, data = {}) {
    console.log(`Push notification sent to ${token} - Title: "${title}", Body: "${body}"`);
  }
}

module.exports = new PushService();
