const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { setAccessTokenCookie } = require('../utils/generateToken');

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' });

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
    // set access token as HTTP-only cookie
    setAccessTokenCookie(res, saved._id);

    saved.refreshTokens.push(refreshToken);
    await saved.save();

    res.status(201).json({
      user: { id: saved._id, username: saved.username, email: saved.email, profilePic: saved.profilePic, bio: saved.bio },
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
    // set access token as HTTP-only cookie
    setAccessTokenCookie(res, user._id);

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      user: { id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio },
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
    res.json({ user: { id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio } })
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

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'No refresh token provided' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const found = user.refreshTokens.includes(refreshToken);
    if (!found) return res.status(401).json({ message: 'Refresh token not recognized' });

    // rotate token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    const newAccessToken = generateAccessToken(user._id);
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
