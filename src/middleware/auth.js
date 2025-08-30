// src/middleware/auth.js
// JWT authentication middleware for the Information Dissemination Platform

const jwt = require('jsonwebtoken');
const { query, pool } = require('../../db');

/**
 * Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const { rows } = await query('SELECT id, email, display_name, role FROM users WHERE id = ? AND is_active = 1', [decoded.userId]);
    
    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        error: 'User not found or inactive'
      });
    }

    // Attach user to request object
    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        error: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        ok: false,
        error: 'Invalid token'
      });
    }
    
    res.status(500).json({
      ok: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Check if user has required role
 * @param {string} role - Required role ('admin', 'editor', 'reader')
 * @returns {Function} Express middleware function
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: 'Insufficient permissions'
      });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };