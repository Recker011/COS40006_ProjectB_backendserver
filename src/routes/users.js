// src/routes/users.js
const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

/**
 * GET /api/users
 * List all users (admin only)
 *
 * Request headers:
 * Authorization: Bearer <jwt_token>
 *
 * Response (success):
 * {
 *   "ok": true,
 *   "users": [
 *     {
 *       "id": 1,
 *       "email": "admin@example.com",
 *       "displayName": "Admin User",
 *       "role": "admin",
 *       "createdAt": "2023-01-01T10:00:00Z",
 *       "updatedAt": "2023-01-01T10:00:00Z"
 *     }
 *   ]
 * }
 */
router.get('/', authenticate, requireRole('admin'), userController.getAllUsers);

module.exports = router;