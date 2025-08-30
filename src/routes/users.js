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

/**
 * GET /api/users/stats
 * User statistics (total, by role, active)
 */
router.get('/stats', authenticate, requireRole('admin'), userController.getUserStats);

/**
 * GET /api/users/:id
 * Get specific user details (admin/editor)
 */
router.get('/:id', authenticate, requireRole(['admin', 'editor']), userController.getUserById);

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', authenticate, requireRole('admin'), userController.updateUser);

/**
 * PUT /api/users/:id/activate
 * Activate/deactivate user (admin only)
 */
router.put('/:id/activate', authenticate, requireRole('admin'), userController.toggleUserActiveStatus);

/**
 * DELETE /api/users/:id
 * Soft delete user (admin only)
 */
router.delete('/:id', authenticate, requireRole('admin'), userController.softDeleteUser);

module.exports = router;