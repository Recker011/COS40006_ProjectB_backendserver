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

module.exports = router;