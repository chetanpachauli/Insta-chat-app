const User = require('../models/User');

exports.saveToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { fcmTokens: token }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { fcmTokens: token }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
