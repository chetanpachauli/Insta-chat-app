const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who receives
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who triggered
  type: { type: String, enum: ['like','comment','follow'], required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
