const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, required: true },
  expiresAt: { type: Date },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  closeFriendsOnly: { type: Boolean, default: false },
  songName: { type: String },
  songArtist: { type: String },
  songUrl: { type: String }
}, { timestamps: true });

StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', StorySchema);
