const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    message: { type: String, default: '' },
    image: { type: String, default: '' },
    isSeen: { type: Boolean, default: false },
    reactions: [{
      emoji: { type: String, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);
