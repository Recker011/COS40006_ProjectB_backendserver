// src/routes/tags.js
// Tag management routes for the Information Dissemination Platform
// Implements CRUD operations for tags with multilingual support

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { query, pool } = require('../../db');

const router = express.Router();

/**
 * GET /api/tags
 * Retrieve all tags with multilingual support
 * 
 * Optional query: ?lang=en|bn
 * 
 * Response:
 * [{
 *   "code": "string",
 *   "name_en": "string",
 *   "name_bn": "string"
 * }]
 */
router.get('/', async (req, res) => { //Returns what code the tag is along with its english and bangla names
  try {
    const { lang } = req.query;
    const languageField = lang === 'bn' ? 'name_bn' : 'name_en';
    
    const sql = `
      SELECT 
        code,
        name_en,
        name_bn
      FROM tags
      ORDER BY name_en
    `;
    
    const { rows } = await query(sql);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to retrieve tags' });
  }
});

/**
 * GET /api/tags/:code
 * Retrieve a specific tag by code
 * 
 * Response:
 * {
 *   "code": "string",
 *   "name_en": "string",
 *   "name_bn": "string"
 * }
 */
router.get('/:code', async (req, res) => { //Retrieve a specific tag by code
  try {
    const { code } = req.params;
    
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid tag code' });
    }
    
    const sql = `
      SELECT 
        code,
        name_en,
        name_bn
      FROM tags
      WHERE code = ?
    `;
    
    const { rows } = await query(sql, [code.trim().toLowerCase()]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ error: 'Failed to retrieve tag' });
  }
});

/**
 * POST /api/tags
 * Create a new tag with multilingual names
 * 
 * Request Body:
 * {
 *   "code": "string (required, lowercase, no spaces)",
 *   "name_en": "string (required)",
 *   "name_bn": "string (optional)"
 * }
 * 
 * Response: Created tag object
 */



module.exports = router;