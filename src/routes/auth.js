// src/routes/auth.js
// Authentication routes for login, logout, and current user info
// Uses JWT with HttpOnly cookies for session management

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Normalize input
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    // Query user from database
    const result = await query(
      'SELECT id, email, password_hash, display_name, role, is_active FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [normalizedEmail]
    );

    const user = result.rows[0];

    // Check if user exists and is active
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(normalizedPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT payload
    const payload = {
      sub: user.id,
      role: user.role,
      display_name: user.display_name
    };

    // Sign JWT token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    // Set HttpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: Number(process.env.JWT_EXPIRES_IN) * 1000
    };

    res.cookie('access_token', token, cookieOptions);

    // Fire-and-forget update of last_login_at
    query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])
      .catch(err => console.error('Failed to update last_login_at:', err.message));

    // Return response
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    // Get user info from database to ensure accuracy
    const result = await query(
      'SELECT email, role FROM users WHERE id = ? AND is_active = 1',
      [req.user.userId]
    );

    const dbUser = result.rows[0];

    // If user not found in DB, return 401
    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Return user info
    return res.status(200).json({
      id: req.user.userId,
      email: dbUser.email,
      display_name: req.user.display_name,
      role: dbUser.role
    });
  } catch (err) {
    console.error('Get current user error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  // Clear the access_token cookie
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined
  };

  res.clearCookie('access_token', cookieOptions);
  return res.status(204).send();
});

module.exports = router;