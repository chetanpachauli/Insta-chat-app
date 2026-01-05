const jwt = require('jsonwebtoken');

function setAccessTokenCookie(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined,
    maxAge: (() => {
      const val = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
      // default to 15 minutes if parsing fails
      try {
        if (val.endsWith('ms')) return parseInt(val);
        if (val.endsWith('s')) return parseInt(val) * 1000;
        if (val.endsWith('m')) return parseInt(val) * 60 * 1000;
        if (val.endsWith('h')) return parseInt(val) * 60 * 60 * 1000;
        if (val.endsWith('d')) return parseInt(val) * 24 * 60 * 60 * 1000;
        return 15 * 60 * 1000;
      } catch (e) {
        return 15 * 60 * 1000;
      }
    })()
  };

  res.cookie('accessToken', token, cookieOptions);
  return token;
}

module.exports = { setAccessTokenCookie };
