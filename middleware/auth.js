const { verifyAccessToken } = require('../utils/tokenUtils');

/**
 * Middleware to verify JWT access token from Authorization header
 * Attaches decoded user info to req.user
 * Expects: Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization header is missing.',
      });
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Use: Bearer <token>',
      });
    }

    const token = parts[1];

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh your token.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
      error: error.message,
    });
  }
};

module.exports = authMiddleware;
