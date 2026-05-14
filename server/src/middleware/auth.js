const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: No token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);

    const message = err.name === 'TokenExpiredError'
      ? 'Unauthorized: Token has expired'
      : 'Unauthorized: Invalid token';

    return res.status(401).json({ success: false, error: message });
  }
};

module.exports = verifyToken;
