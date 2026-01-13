// api/_helpers/auth.js
// Authentication helper for serverless functions

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from Authorization header
 * Returns user object or throws error
 */
function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Middleware wrapper for authenticated endpoints
 */
function requireAuth(handler) {
  return async (req, res) => {
    try {
      const user = verifyAuth(req);
      req.user = user;
      return await handler(req, res);
    } catch (error) {
      if (error.message === 'No token provided') {
        return res.status(401).json({
          success: false,
          error: 'No token provided',
          message: 'Authorization header missing or invalid'
        });
      }
      if (error.message === 'Token expired') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Please log in again'
        });
      }
      if (error.message === 'Invalid token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Authentication failed'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Authentication error',
        message: error.message
      });
    }
  };
}

module.exports = { verifyAuth, requireAuth };





