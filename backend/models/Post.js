const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  caption: { type: String, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema],
  tags: [{ type: String }]
}, { timestamps: true });

PostSchema.statics.extractHashtags = function (caption) {
  if (!caption) return [];
  const matches = caption.match(/#[a-zA-Z0-9_]+/g);
  if (!matches) return [];
  return matches.map(tag => tag.toLowerCase().slice(1));
};

module.exports = mongoose.model('Post', PostSchema);
