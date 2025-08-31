// src/routes/tags.js
// Tag management routes for the Information Dissemination Platform
// Implements CRUD operations for tags with multilingual support

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { query, pool } = require('../../db');
const { toISO } = require('../utils/articleUtils');

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
      ORDER BY ${languageField}
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
        id,
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
 * GET /api/tags/:id/articles
 * Retrieve all published articles associated with a specific tag ID.
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
 *   "tags": ["tag_code1", "tag_code2"],
 *   "tags_names": ["Tag Name 1", "Tag Name 2"]
 * }]
 */
router.get('/:id/articles', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    // 1. Input Validation
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid tag ID' });
    }

    const languageCode = (lang === 'bn') ? 'bn' : 'en';

    // 2. Check if tag exists
    const { rows: tagRows } = await query('SELECT id FROM tags WHERE id = ?', [id]);
    if (!tagRows || tagRows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // 3. Fetch articles associated with the tag
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
      INNER JOIN article_tags artag
        ON a.id = artag.article_id
      INNER JOIN tags t
        ON artag.tag_id = t.id
      WHERE a.status = 'published' AND t.id = ?
      GROUP BY a.id, at.title, at.body, ma.url, a.created_at, a.updated_at
      ORDER BY a.created_at DESC
    `;

    const { rows } = await query(sql, [languageCode, id]);

    // 4. Format the response
    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      image_url: article.image_url || null,
      created_at: article.created_at ? toISO(article.created_at) : null,
      updated_at: article.updated_at ? toISO(article.updated_at) : null,
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
    }));

    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles by tag:', error);
    res.status(500).json({ error: 'Failed to retrieve articles by tag' });
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
router.post('/', authenticate, async (req, res) => {
  try {
    const { code, name_en, name_bn } = req.body;
    
    // Validate required fields
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'Tag code is required' });
    }
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
      // Check if tag already exists
      const [existingRows] = await connection.execute(
        'SELECT code FROM tags WHERE code = ?',
        [code.trim().toLowerCase()]
      );
      
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Tag with this code already exists' });
      }
      
      // Insert new tag
      const [result] = await connection.execute(
        'INSERT INTO tags (code, name_en, name_bn, created_at) VALUES (?, ?, ?, NOW())',
        [
          code.trim().toLowerCase(),
          name_en.trim(),
          name_bn ? name_bn.trim() : ''
        ]
      );
      
      await connection.commit();
      
      // Return the created tag
      res.status(201).json({
        code: code.trim().toLowerCase(),
        name_en: name_en.trim(),
        name_bn: name_bn ? name_bn.trim() : ''
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

/*

* Path Parameters:
 *   :code - The unique code of the tag to update.
 *
 * Request Body:
 * {
 *   "name_en": "string (required)",
 *   "name_bn": "string (optional)"
 * }
 *
 * Response: Updated tag object */
 
router.put('/:code', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const { name_en, name_bn } = req.body;

    // 1. Input Validation
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'Tag code is required' });
    }
    if (!name_en || typeof name_en !== 'string' || name_en.trim().length === 0) {
      return res.status(400).json({ error: 'English name is required for update' });
    }

    // 2. Authorization Check
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 3. Check if tag exists before updating
      const [existingRows] = await connection.execute(
        'SELECT code FROM tags WHERE code = ?',
        [code.trim().toLowerCase()]
      );

      if (Array.isArray(existingRows) && existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Tag not found' });
      }

      // 4. Update the tag in the database
      // MODIFIED: Removed 'updated_at = NOW()' as per your schema
      const [result] = await connection.execute(
        'UPDATE tags SET name_en = ?, name_bn = ? WHERE code = ?',
        [
          name_en.trim(),
          name_bn ? name_bn.trim() : '',
          code.trim().toLowerCase()
        ]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(500).json({ error: 'Failed to update tag: No rows affected' });
      }

      await connection.commit();

      // 5. Return the updated tag details
      res.status(200).json({
        code: code.trim().toLowerCase(),
        name_en: name_en.trim(),
        name_bn: name_bn ? name_bn.trim() : ''
      });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});


/*
 * DELETE /api/tags/:code
 * Delete a tag by its code (admin/editor only)
 *
 * Path Parameters:
 *   :code - The unique code of the tag to delete.
 *
 * Response:
 *   Status 204 No Content on successful deletion.
 *   Status 400 if tag code is invalid.
 *   Status 401 if not authenticated.
 *   Status 403 if insufficient permissions.
 *   Status 404 if tag not found.
 *   Status 500 on server error.
 */
router.delete('/:code', authenticate, async (req, res) => {
  try {
    const { code } = req.params;

    // 1. Input Validation
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'Tag code is required' });
    }

    // 2. Authorization Check
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 3. Check if tag exists before attempting to delete
      const [existingRows] = await connection.execute(
        'SELECT code FROM tags WHERE code = ?',
        [code.trim().toLowerCase()]
      );

      if (Array.isArray(existingRows) && existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Tag not found' });
      }

      // 4. Delete the tag from the database
      const [result] = await connection.execute(
        'DELETE FROM tags WHERE code = ?',
        [code.trim().toLowerCase()]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(500).json({ error: 'Failed to delete tag: No rows affected' });
      }

      await connection.commit();

      // 5. Respond with 204 No Content on successful deletion
      res.status(204).send();

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});


module.exports = router;
