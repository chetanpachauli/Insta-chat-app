const Post = require('../models/Post')
const User = require('../models/User')
const Notification = require('../models/Notification')

exports.createPost = async (req, res) => {
  try {
    const userId = req.user.id
    const { image, caption, mediaType = 'image' } = req.body
    if (!image) return res.status(400).json({ message: 'Media file is required' })
    if (!['image', 'video'].includes(mediaType)) {
      return res.status(400).json({ message: 'Invalid media type' })
    }
    const post = new Post({ 
      author: userId, 
      image, 
      mediaType,
      caption: caption || '' 
    })
    const saved = await post.save()
    // add to user's posts
    await User.findByIdAndUpdate(userId, { $push: { posts: saved._id } })
    // no notification for self post
    res.status(201).json(saved)
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id
    const { postId } = req.params
    const post = await Post.findById(postId)
    if (!post) return res.status(404).json({ message: 'Post not found' })
    const idx = post.likes.findIndex(x => String(x) === String(userId))
    let action = 'liked'
    if (idx === -1) {
      post.likes.push(userId)
      // create notification to post author if not same user
      if (String(post.author) !== String(userId)) {
        const n = await Notification.create({ user: post.author, from: userId, type: 'like', post: post._id })
        try {
          const socket = require('../socket')
          const io = socket.getIo()
          const toSocket = socket.getSocketId(String(post.author))
          if (io && toSocket) io.to(toSocket).emit('notification', n)
        } catch (e) {}
      }
    } else {
      post.likes.splice(idx, 1)
      action = 'unliked'
    }
    await post.save()
    res.json({ postId: post._id, likes: post.likes.length, action })
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id
    const { postId } = req.params
    const { text } = req.body
    if (!text) return res.status(400).json({ message: 'Comment text required' })
    const post = await Post.findById(postId).populate('author')
    if (!post) return res.status(404).json({ message: 'Post not found' })
    post.comments.push({ author: userId, text })
    await post.save()
    const last = post.comments[post.comments.length - 1]
    // notification for post author
    if (String(post.author._id || post.author) !== String(userId)) {
      const n = await Notification.create({ user: post.author._id || post.author, from: userId, type: 'comment', post: post._id })
      try {
        const socket = require('../socket')
        const io = socket.getIo()
        const toSocket = socket.getSocketId(String(post.author._id || post.author))
        if (io && toSocket) io.to(toSocket).emit('notification', n)
      } catch (e) {}
    }
    res.status(201).json({ comment: last, postId: post._id })
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

exports.getFeed = async (req, res) => {
  try {
    const userId = req.user.id
    // feed: posts from following + own posts
    const me = await User.findById(userId)
    const ids = (me.following || []).concat([userId])
    const posts = await Post.find({ author: { $in: ids } }).sort({ createdAt: -1 }).populate('author', 'username profilePic')
    res.json(posts)
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

exports.getExplore = async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};

    if (type === 'reel') {
      // First try to get video posts
      const videoQuery = {
        $or: [
          { image: { $regex: /\.(mp4|mov|webm|quicktime)$/i } },
          { mediaType: 'video' },
          { 'media.mimetype': { $regex: 'video/', $options: 'i' } }
        ]
      };

      // Try to get video posts first
      let posts = await Post.find(videoQuery)
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('author', 'username profilePic')
        .lean();

      // If no video posts found, try to get image posts as fallback
      if (!posts || posts.length === 0) {
        console.log('No video reels found, trying image fallback...');
        const imageQuery = {
          $or: [
            { image: { $exists: true } },
            { mediaType: 'image' }
          ]
        };
        
        posts = await Post.find(imageQuery)
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('author', 'username profilePic')
          .lean();
      }

      return res.json(posts);
    }

    // For non-reel explore, use the regular query
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'username profilePic')
      .lean();

    console.log(`Found ${posts.length} posts`);
    res.json(posts);
  } catch (err) { 
    console.error('Error in getExplore:', {
      message: err.message,
      stack: err.stack,
      query: req.query
    });
    res.status(500).json({ 
      message: err.message || 'Server error',
      code: 'EXPLORE_FETCH_ERROR'
    }); 
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate('author', 'username profilePic').populate('comments.author', 'username profilePic')
    if (!post) return res.status(404).json({ message: 'Post not found' })
    res.json(post)
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

exports.toggleSave = async (req, res) => {
  try {
    const userId = req.user.id
    const { postId } = req.params
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    const idx = (user.savedPosts || []).findIndex(x => String(x) === String(postId))
    if (idx === -1) {
      user.savedPosts.push(postId)
      await user.save()
      return res.json({ saved: true })
    } else {
      user.savedPosts.splice(idx,1)
      await user.save()
      return res.json({ saved: false })
    }
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

exports.getSaved = async (req, res) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId).populate('savedPosts')
    res.json(user.savedPosts || [])
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.id
    const { postId } = req.params
    const post = await Post.findById(postId)
    if (!post) return res.status(404).json({ message: 'Post not found' })
    if (String(post.author) !== String(userId)) return res.status(403).json({ message: 'Not authorized' })
    await Post.deleteOne({ _id: postId })
    // remove from author's posts
    await User.findByIdAndUpdate(userId, { $pull: { posts: postId } })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}
