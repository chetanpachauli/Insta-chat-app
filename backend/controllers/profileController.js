const User = require('../models/User')

// Get public profile by id or username
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if the ID is a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    
    let user;
    if (isObjectId) {
      user = await User.findById(id).select('-password -refreshTokens').populate('posts');
    } else {
      // If not a valid ObjectId, search by username
      user = await User.findOne({ username: id }).select('-password -refreshTokens').populate('posts');
    }
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const profile = user.toObject();
    profile.followersCount = (user.followers || []).length;
    profile.followingCount = (user.following || []).length;
    
    res.json(profile);
  } catch (err) {
    console.error('Error in getProfile:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// Get my profile
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshTokens').populate('posts')
    if (!user) return res.status(404).json({ message: 'User not found' })
    const profile = user.toObject()
    profile.followersCount = (user.followers || []).length
    profile.followingCount = (user.following || []).length
    res.json(profile)
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }) }
}

// Update own profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Handle text fields
    if (typeof name === 'string') user.name = name;
    if (typeof bio === 'string') user.bio = bio;

    // Handle file upload if a new photo was uploaded
    if (req.file) {
      try {
        const { uploadToCloudinary } = require('../utils/cloudinary');
        
        // Upload new photo to Cloudinary
        const uploadResult = await uploadToCloudinary(req.file, 'chat-app/profiles');
        
        // Store the Cloudinary URL
        user.profilePic = uploadResult;
        
        // Delete the temporary file
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        // If there's an error with the upload, don't fail the entire request
        // Just log it and continue with other updates
      }
    }

    await user.save();
    
    // Prepare response
    const response = user.toObject();
    delete response.password;
    delete response.refreshTokens;
    
    res.json(response);
  } catch (err) {
    console.error('Error in updateProfile:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Follow a user
exports.followUser = async (req, res) => {
  try {
    const meId = req.user.id
    const { id } = req.params
    if (meId === id) return res.status(400).json({ message: 'Cannot follow yourself' })
    const me = await User.findById(meId)
    const other = await User.findById(id)
    if (!other) return res.status(404).json({ message: 'User not found' })
    if (!other.followers.includes(meId)) other.followers.push(meId)
    if (!me.following.includes(id)) me.following.push(id)
    await other.save()
    await me.save()
    // create follow notification and emit real-time if possible
    try {
      const Notification = require('../models/Notification')
      const n = await Notification.create({ user: other._id, from: meId, type: 'follow' })
      try { const socket = require('../socket'); const io = socket.getIo(); const toSocket = socket.getSocketId(String(other._id)); if (io && toSocket) io.to(toSocket).emit('notification', n) } catch (e) {}
    } catch (e) {}
    res.json({ message: 'Followed' })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
}

// Unfollow
exports.unfollowUser = async (req, res) => {
  try {
    const meId = req.user.id
    const { id } = req.params
    if (meId === id) return res.status(400).json({ message: 'Cannot unfollow yourself' })
    const me = await User.findById(meId)
    const other = await User.findById(id)
    if (!other) return res.status(404).json({ message: 'User not found' })
    other.followers = (other.followers || []).filter(x => String(x) !== String(meId))
    me.following = (me.following || []).filter(x => String(x) !== String(id))
    await other.save()
    await me.save()
    res.json({ message: 'Unfollowed' })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
}

// Export remaining methods as needed
