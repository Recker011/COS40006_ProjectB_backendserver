// src/routes/categories.js
// Category management routes for the Information Dissemination Platform

const express = require('express');
const { query } = require('../../db');

const router = express.Router();

/**
 * GET /api/categories
 * Retrieve all categories with multilingual support
 * 
 * Optional query: ?lang=en|bn
 * 
 * Response:
 * [{
 *   "id": "number",
 *   "name_en": "string",
 *   "name_bn": "string"
 * }]
 */
router.get('/', async (req, res) => {
  try {
    const { lang } = req.query;
    const languageField = lang === 'bn' ? 'name_bn' : 'name_en';
    
    const sql = `
      SELECT 
        id,
        name_en,
        name_bn
      FROM categories
      ORDER BY ${languageField}
    `;
    
    const { rows } = await query(sql);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  };
});

/**
 * GET /api/categories/:id
 * Retrieve a specific category by ID
 *
 * Response:
 * {
 *   "id": "number",
 *   "name_en": "string",
 *   "name_bn": "string"
 * }
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    const sql = `
      SELECT
        id,
        name_en,
        name_bn
      FROM categories
      WHERE id = ?
    `;
    
    const { rows } = await query(sql, [id]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to retrieve category' });
  }
});

module.exports = router;