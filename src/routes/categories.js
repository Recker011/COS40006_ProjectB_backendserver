// src/routes/categories.js
// Category management routes for the Information Dissemination Platform

const express = require('express');
const { authenticate } = require('../middleware/auth'); // Import authenticate middleware
const { toISO } = require('../utils/articleUtils'); // Import utility functions
const { query, pool } = require('../../db'); // Import pool for transactions

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
/**
 * GET /api/categories/:id/articles
 * Retrieve all published articles in a specific category with multilingual support
 *
 * Optional query: ?lang=en|bn
 *
 * Response:
 * [{
 *   "id": "string",
 *   "title": "string",
 *   "content": "string",
 *   "image_url": "string|null",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string",
 *   "tags": ["string"],
 *   "tags_names": ["string"]
 * }]
 */
router.get('/:id/articles', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;
    const languageCode = (lang === 'bn') ? 'bn' : 'en';

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Check if category exists
    const [categoryRows] = await query('SELECT id FROM categories WHERE id = ?', [id]);
    if (!categoryRows || categoryRows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const sql = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        ma.url AS image_url,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN media_assets ma
        ON a.id = ma.id
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      WHERE a.category_id = ? AND a.status = 'published'
      GROUP BY a.id, at.title, at.body, ma.url, a.created_at, a.updated_at
      ORDER BY a.published_at DESC
    `;

    const { rows } = await query(sql, [languageCode, id]);

    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      image_url: article.image_url || null,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
    }));

    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles for category:', error);
    res.status(500).json({ error: 'Failed to retrieve articles for category' });
  }
});
});

/**
 * POST /api/categories
 * Create a new category with multilingual names
 *
 * Request Body:
 * {
 *   "name_en": "string (required)",
 *   "name_bn": "string (optional)"
 * }
 *
 * Response: Created category object
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name_en, name_bn } = req.body;
    
    // Validate required fields
    if (!name_en || typeof name_en !== 'string' || name_en.trim().length === 0) {
      return res.status(400).json({ error: 'English name is required' });
    }
    
    // Check user role
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if category with the same English name already exists
      const [existingRows] = await connection.execute(
        'SELECT id FROM categories WHERE name_en = ?',
        [name_en.trim()]
      );
      
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Category with this English name already exists' });
      }
      
      // Generate a code from the English name
      const code = name_en.trim().toLowerCase().replace(/\s+/g, '-');

      // Insert new category
      const [result] = await connection.execute(
        'INSERT INTO categories (name_en, name_bn, code, created_at) VALUES (?, ?, ?, NOW())',
        [
          name_en.trim(),
          name_bn ? name_bn.trim() : '',
          code
        ]
      );
      
      await connection.commit();
      
      // Return the created category
      res.status(201).json({
        id: result.insertId, // Assuming MySQL returns insertId
        name_en: name_en.trim(),
        name_bn: name_bn ? name_bn.trim() : '',
        code: code
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
});
/**
 * PUT /api/categories/:id
 * Update category (admin/editor)
 *
 * Request Body:
 * {
 *   "name_en": "string (required)",
 *   "name_bn": "string (optional)"
 * }
 *
 * Response: Updated category object
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_bn } = req.body;

    // Validate ID
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Validate required fields
    if (!name_en || typeof name_en !== 'string' || name_en.trim().length === 0) {
      return res.status(400).json({ error: 'English name is required' });
    }

    // Check user role
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if category exists
      const [existingCategoryRows] = await connection.execute(
        'SELECT id, name_en, code FROM categories WHERE id = ?',
        [id]
      );

      if (Array.isArray(existingCategoryRows) && existingCategoryRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if category with the new English name already exists (excluding the current category)
      const [duplicateNameRows] = await connection.execute(
        'SELECT id FROM categories WHERE name_en = ? AND id != ?',
        [name_en.trim(), id]
      );

      if (Array.isArray(duplicateNameRows) && duplicateNameRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Category with this English name already exists' });
      }

      // Generate a new code if name_en has changed
      const oldNameEn = existingCategoryRows[0].name_en;
      let code = existingCategoryRows[0].code; // Keep existing code by default
      if (name_en.trim() !== oldNameEn) {
        code = name_en.trim().toLowerCase().replace(/\s+/g, '-');
      }

      // Update category
      await connection.execute(
        'UPDATE categories SET name_en = ?, name_bn = ?, code = ? WHERE id = ?',
        [
          name_en.trim(),
          name_bn ? name_bn.trim() : '',
          code,
          id
        ]
      );

      await connection.commit();

      // Return the updated category
      res.status(200).json({
        id: parseInt(id),
        name_en: name_en.trim(),
        name_bn: name_bn ? name_bn.trim() : '',
        code: code
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
});
/**
 * DELETE /api/categories/:id
 * Delete a category by ID
 *
 * Response: 204 No Content
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Check user role
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if category exists
      const [existingRows] = await connection.execute(
        'SELECT id FROM categories WHERE id = ?',
        [id]
      );

      if (Array.isArray(existingRows) && existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Category not found' });
      }

      // Delete category
      await connection.execute(
        'DELETE FROM categories WHERE id = ?',
        [id]
      );

      await connection.commit();
      res.status(204).send(); // No content for successful deletion
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category', details: error.message });
  }
});


module.exports = router;