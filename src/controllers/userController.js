// src/controllers/userController.js
const { query, pool } = require('../../db');

const getAllUsers = async (req, res) => {
  try {
    const { rows } = await query('SELECT id, email, display_name, role, created_at, updated_at FROM users WHERE is_active = 1');
    
    const users = rows.map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    res.json({
      ok: true,
      users: users,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch users' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT id, email, display_name, role, created_at, updated_at FROM users WHERE id = ? AND is_active = 1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found or inactive' });
    }

    const user = {
      id: rows[0].id,
      email: rows[0].email,
      displayName: rows[0].display_name,
      role: rows[0].role,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    };

    res.json({ ok: true, user });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, email, role } = req.body;

    // Prevent updating sensitive fields or non-existent user
    const { rowCount } = await query(
      'UPDATE users SET display_name = ?, email = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1',
      [displayName, email, role, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'User not found or inactive' });
    }

    res.json({ ok: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ ok: false, error: 'Failed to update user' });
  }
};

const toggleUserActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body; // Expect boolean true/false

    const { rowCount } = await query(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive ? 1 : 0, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    res.json({ ok: true, message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Error toggling user active status:', error);
    res.status(500).json({ ok: false, error: 'Failed to toggle user status' });
  }
};

const softDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await query(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1',
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'User not found or already deleted' });
    }

    res.json({ ok: true, message: 'User soft-deleted successfully' });
  } catch (error) {
    console.error('Error soft-deleting user:', error);
    res.status(500).json({ ok: false, error: 'Failed to soft-delete user' });
  }
};

const getUserStats = async (req, res) => {
  try {
    const totalUsers = await query('SELECT COUNT(*) FROM users');
    const activeUsers = await query('SELECT COUNT(*) FROM users WHERE is_active = 1');
    const usersByRole = await query('SELECT role, COUNT(*) FROM users GROUP BY role');

    res.json({
      ok: true,
      stats: {
        totalUsers: parseInt(totalUsers.rows[0].count, 10),
        activeUsers: parseInt(activeUsers.rows[0].count, 10),
        usersByRole: usersByRole.rows.map(row => ({ role: row.role, count: parseInt(row.count, 10) })),
      },
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user statistics' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserActiveStatus,
  softDeleteUser,
  getUserStats,
};