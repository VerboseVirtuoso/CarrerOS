const jwt = require('jsonwebtoken');

/**
 * verifyToken — reads Authorization: Bearer <token>, verifies the JWT,
 * and stamps req.userId (string) for downstream route handlers.
 */
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

    // Set req.userId to the user ID stored in the token payload
    // Our register/login routes use { id: user._id }
    req.userId = decoded.id;
    req.user = decoded; // Store full payload if needed

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
