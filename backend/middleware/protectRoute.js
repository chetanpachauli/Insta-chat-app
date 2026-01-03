const jwt = require('jsonwebtoken');

module.exports = function protectRoute(req, res, next) {
  try {
    // Accept token from Authorization header or http-only cookie
    const authHeader = req.headers.authorization || '';
    let token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    // Safely check for cookies
    if (!token && req.cookies) {
      token = req.cookies.accessToken || null;
    }

    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Attach user to request
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Authentication failed' });
  }
};
