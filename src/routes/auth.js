// src/routes/auth.js
// Authentication routes for the Information Dissemination Platform

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../db');

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with email and password
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "user_password"
 * }
 * 
 * Response (success):
 * {
 *   "ok": true,
 *   "user": {
 *     "id": 1,
 *     "email": "user@example.com",
 *     "displayName": "John Doe",
 *     "role": "reader"
 *   },
 *   "token": "jwt_token_string",
 *   "expiresIn": 86400
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const { rows } = await query('SELECT id, email, password_hash, display_name, role FROM users WHERE email = ? AND is_active = 1', [email]);
    
    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid credentials'
      });
    }

    const user = rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login time
    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      },
      token,
      expiresIn: 86400 // 24 hours in seconds
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      ok: false,
      error: 'Login failed'
    });
  }
});

module.exports = router;