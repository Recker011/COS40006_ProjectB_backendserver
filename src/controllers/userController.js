// src/controllers/userController.js
const { query } = require('../../db');

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

module.exports = { getAllUsers };