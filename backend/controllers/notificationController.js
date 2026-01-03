const Notification = require('../models/Notification')

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id
    const notes = await Notification.find({ user: userId }).sort({ createdAt: -1 }).populate('from', 'username profilePic').limit(100)
    res.json(notes)
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

exports.markRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } })
    res.json({ message: 'Marked' })
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}
