const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Story = require('../models/Story');
const Notification = require('../models/Notification');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  getAccessToken, 
  setAccessTokenCookie 
} = require('../utils/generateToken');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  try {
    const { username, email, password, profilePic, bio } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = new User({ username, email, password: hashed, profilePic: profilePic || '', bio: bio || '' });
    const saved = await user.save();

    const refreshToken = generateRefreshToken(saved._id);
    const accessToken = getAccessToken(saved._id);
    setAccessTokenCookie(res, saved._id);

    saved.refreshTokens.push(refreshToken);
    await saved.save();

    res.status(201).json({
      user: { id: saved._id, username: saved.username, email: saved.email, profilePic: saved.profilePic, bio: saved.bio },
      accessToken,
      refreshToken
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const refreshToken = generateRefreshToken(user._id);
    const accessToken = getAccessToken(user._id);
    setAccessTokenCookie(res, user._id);

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      user: { id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio },
      accessToken,
      refreshToken
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// Search users by query string (GET /api/auth/search?query=...)
exports.search = async (req, res) => {
  try {
    const q = (req.query.query || '').trim()
    if (!q) return res.json([])
    const regex = new RegExp(q, 'i')
    const users = await User.find({ $or: [{ username: regex }, { email: regex }] }).select('-password -refreshTokens')
    const result = users.map(u => ({ id: u._id, username: u.username, profilePic: u.profilePic, bio: u.bio }))
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
}

// Check current session via accessToken cookie or Authorization header
exports.checkAuth = async (req, res) => {
  try {
    const token = req.cookies?.accessToken || (req.headers.authorization && req.headers.authorization.split(' ')[1])
    if (!token) return res.status(401).json({ message: 'Not authenticated' })
    let decoded
    try { decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) } catch (e) { return res.status(401).json({ message: 'Invalid token' }) }
    const user = await User.findById(decoded.id).select('-password -refreshTokens')
    if (!user) return res.status(401).json({ message: 'User not found' })
    res.json({ user: { id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio, isPrivate: user.isPrivate } })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
}

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'No refresh token provided' });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(200).json({ message: 'Logged out' });

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    await user.save();

    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Delete all posts by the user
    await Post.deleteMany({ author: userId });
    
    // Delete all messages sent or received by the user
    await Message.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }]
    });
    
    // Delete all stories by the user
    await Story.deleteMany({ author: userId });
    
    // Delete all notifications to or from the user
    await Notification.deleteMany({
      $or: [{ user: userId }, { from: userId }]
    });
    
    // Remove user from followers/following lists of other users
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );
    
    // Remove user's likes from all posts
    await Post.updateMany(
      { likes: userId },
      { $pull: { likes: userId } }
    );
    
    // Remove user's comments from all posts
    await Post.updateMany(
      { 'comments.user': userId },
      { $pull: { comments: { user: userId } } }
    );
    
    // Delete the user from the database
    await User.findByIdAndDelete(userId);
    
    // Clear the access token cookie
    res.clearCookie('accessToken', {
      httpOnly: true,
      sameSite: 'none',
      secure: true
    });
    
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error deleting account' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'No refresh token provided' });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Find the user and check if the refresh token exists
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const newRefreshToken = generateRefreshToken(user._id);
    const newAccessToken = generateAccessToken(user._id);

    // Update the refresh token in the database (token rotation)
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    // Set the new access token as an HTTP-only cookie
    setAccessTokenCookie(res, user._id);

    res.json({ 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        profilePic: user.profilePic,
        bio: user.bio
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken 
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

// Google OAuth login
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required' });

    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    const { email, name, picture, sub } = payload;
    if (!email) return res.status(400).json({ message: 'Google account has no email' });

    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });

    if (!user) {
      const baseUsername = (email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '');
      let username = baseUsername;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }
      user = new User({
        username,
        email,
        name: name || '',
        profilePic: picture || '',
        googleId: sub,
        password: ''
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = sub;
      if (!user.profilePic && picture) user.profilePic = picture;
      if (!user.name && name) user.name = name;
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    user.refreshTokens.push(hashedRefresh);
    await user.save();

    res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        bio: user.bio,
        name: user.name
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ message: 'Google login failed' });
  }
};
