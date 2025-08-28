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

/**
 * POST /api/auth/register
 * User registration with email, password, and display name
 *
 * Request body:
 * {
 *   "email": "newuser@example.com",
 *   "password": "new_user_password",
 *   "displayName": "New User"
 * }
 *
 * Response (success):
 * {
 *   "ok": true,
 *   "user": {
 *     "id": 2,
 *     "email": "newuser@example.com",
 *     "displayName": "New User",
 *     "role": "reader"
 *   },
 *   "token": "jwt_token_string",
 *   "expiresIn": 86400
 * }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate input
    if (!email || !password || !displayName) {
      return res.status(400).json({
        ok: false,
        error: 'Email, password, and display name are required'
      });
    }

    // Check if user already exists
    const { rows: existingUsers } = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user into database
    const { rows: result } = await query(
      'INSERT INTO users (email, password_hash, display_name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
      [email, passwordHash, displayName, 'reader'] // Default role 'reader', is_active = 1
    );

    const newUserId = result.insertId;

    // Fetch the newly created user to return
    const { rows: newUserRows } = await query('SELECT id, email, display_name, role FROM users WHERE id = ?', [newUserId]);
    const newUser = newUserRows[0];

    // Create JWT token for the new user
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.status(201).json({
      ok: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        role: newUser.role
      },
      token,
      expiresIn: 86400 // 24 hours in seconds
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      ok: false,
      error: 'Registration failed'
    });
  }
});

module.exports = router;