const jwt = require('jsonwebtoken');

// Generate access token
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

// Set access token as HTTP-only cookie
const setAccessTokenCookie = (res, userId) => {
  const token = generateAccessToken(userId);
  
  const cookieOptions = {
    httpOnly: true,
    secure: true, // Always true for production
    sameSite: 'none', // Required for cross-site cookies
    path: '/',
    maxAge: (() => {
      const val = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
      try {
        if (val.endsWith('ms')) return parseInt(val);
        if (val.endsWith('s')) return parseInt(val) * 1000;
        if (val.endsWith('m')) return parseInt(val) * 60 * 1000;
        if (val.endsWith('h')) return parseInt(val) * 60 * 60 * 1000;
        if (val.endsWith('d')) return parseInt(val) * 24 * 60 * 60 * 1000;
        return 15 * 60 * 1000; // Default 15 minutes
      } catch (e) {
        return 15 * 60 * 1000;
      }
    })()
  };

  res.cookie('accessToken', token, cookieOptions);
  return token;
};

module.exports = { 
  generateAccessToken,
  generateRefreshToken,
  setAccessTokenCookie 
};
