// src/middleware/requireAuth.js
// Authentication middleware for JWT verification
// Checks Authorization header first, then access_token cookie
// Attaches user data to req.user on success, returns 401 on failure

const jwt = require('jsonwebtoken');

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAuth(req, res, next) {
  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  // If no token in header, try access_token cookie
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }
  
  // If no token found, return 401
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Verify JWT token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user data from token claims
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      display_name: decoded.display_name
    };
    next();
  } catch (err) {
    // Token verification failed
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = requireAuth;