// src/routes/admin.js
// Admin routes for the Information Dissemination Platform

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { query } = require('../../db');

const router = express.Router();

/**
 * GET /api/admin/stats
 * System statistics for admin users
 *
 * Request headers:
 * Authorization: Bearer <jwt_token>
 *
 * Response (success):
 * {
 *   "ok": true,
 *   "stats": {
 *     "articles": {
 *       "total": 100,
 *       "published": 80,
 *       "drafts": 15,
 *       "hidden": 5
 *     },
 *     "users": {
 *       "total": 50,
 *       "active": 45,
 *       "inactive": 5,
 *       "roles": {
 *         "admin": 2,
 *         "editor": 5,
 *         "reader": 43
 *       }
 *     },
 *     "comments": {
 *       "total": 200,
 *       "active": 180
 *     },
 *     "tags": {
 *       "total": 25
 *     },
 *     "categories": {
 *       "total": 10
 *     },
 *     "orphanedContent": {
 *       "articlesWithoutTranslations": 2,
 *       "translationsWithoutArticles": 1,
 *       "tagsWithoutArticles": 3,
 *       "categoriesWithoutArticles": 1
 *     }
 *   }
 * }
 */
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    // Get articles statistics
    const totalArticles = await query('SELECT COUNT(*) as count FROM articles');
    const publishedArticles = await query('SELECT COUNT(*) as count FROM articles WHERE status = ?', ['published']);
    const draftArticles = await query('SELECT COUNT(*) as count FROM articles WHERE status = ?', ['draft']);
    const hiddenArticles = await query('SELECT COUNT(*) as count FROM articles WHERE status = ?', ['hidden']);
    
    // Get users statistics
    const totalUsers = await query('SELECT COUNT(*) as count FROM users');
    const activeUsers = await query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const inactiveUsers = await query('SELECT COUNT(*) as count FROM users WHERE is_active = 0');
    const usersByRole = await query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    
    // Get comments statistics
    const totalComments = await query('SELECT COUNT(*) as count FROM comments');
    const activeComments = await query('SELECT COUNT(*) as count FROM comments WHERE deleted_at IS NULL');
    
    // Get tags statistics
    const totalTags = await query('SELECT COUNT(*) as count FROM tags');
    
    // Get categories statistics
    const totalCategories = await query('SELECT COUNT(*) as count FROM categories');
    
    // Get orphaned content statistics
    const articlesWithoutTranslations = await query(`
      SELECT COUNT(*) as count FROM articles a
      LEFT JOIN article_translations at ON a.id = at.article_id
      WHERE at.article_id IS NULL
    `);
    
    const translationsWithoutArticles = await query(`
      SELECT COUNT(*) as count FROM article_translations at
      LEFT JOIN articles a ON at.article_id = a.id
      WHERE a.id IS NULL
    `);
    
    const tagsWithoutArticles = await query(`
      SELECT COUNT(*) as count FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      WHERE at.tag_id IS NULL
    `);
    
    const categoriesWithoutArticles = await query(`
      SELECT COUNT(*) as count FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      WHERE a.category_id IS NULL
    `);
    
    // Format the statistics object
    const stats = {
      articles: {
        total: parseInt(totalArticles.rows[0].count, 10),
        published: parseInt(publishedArticles.rows[0].count, 10),
        drafts: parseInt(draftArticles.rows[0].count, 10),
        hidden: parseInt(hiddenArticles.rows[0].count, 10)
      },
      users: {
        total: parseInt(totalUsers.rows[0].count, 10),
        active: parseInt(activeUsers.rows[0].count, 10),
        inactive: parseInt(inactiveUsers.rows[0].count, 10),
        roles: usersByRole.rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count, 10);
          return acc;
        }, {})
      },
      comments: {
        total: parseInt(totalComments.rows[0].count, 10),
        active: parseInt(activeComments.rows[0].count, 10)
      },
      tags: {
        total: parseInt(totalTags.rows[0].count, 10)
      },
      categories: {
        total: parseInt(totalCategories.rows[0].count, 10)
      },
      orphanedContent: {
        articlesWithoutTranslations: parseInt(articlesWithoutTranslations.rows[0].count, 10),
        translationsWithoutArticles: parseInt(translationsWithoutArticles.rows[0].count, 10),
        tagsWithoutArticles: parseInt(tagsWithoutArticles.rows[0].count, 10),
        categoriesWithoutArticles: parseInt(categoriesWithoutArticles.rows[0].count, 10)
      }
    };
    
    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching system statistics:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch system statistics'
    });
  }
});

/**
 * GET /api/admin/content/orphaned
 * List orphaned content in the system
 *
 * Request headers:
 * Authorization: Bearer <jwt_token>
 *
 * Response (success):
 * {
 *   "ok": true,
 *   "orphanedContent": {
 *     "articlesWithoutTranslations": [],
 *     "translationsWithoutArticles": [],
 *     "tagsWithoutArticles": [],
 *     "categoriesWithoutArticles": []
 *   }
 * }
 */
router.get('/content/orphaned', authenticate, requireRole('admin'), async (req, res) => {
  try {
    // Get articles without translations
    const articlesWithoutTranslations = await query(`
      SELECT id, created_at, updated_at FROM articles a
      LEFT JOIN article_translations at ON a.id = at.article_id
      WHERE at.article_id IS NULL
    `);
    
    // Get translations without articles
    const translationsWithoutArticles = await query(`
      SELECT id, article_id, language_code, title, created_at, updated_at FROM article_translations at
      LEFT JOIN articles a ON at.article_id = a.id
      WHERE a.id IS NULL
    `);
    
    // Get tags without articles
    const tagsWithoutArticles = await query(`
      SELECT id, code, name_en, name_bn, created_at, updated_at FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      WHERE at.tag_id IS NULL
    `);
    
    // Get categories without articles
    const categoriesWithoutArticles = await query(`
      SELECT id, code, name_en, name_bn, created_at, updated_at FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      WHERE a.category_id IS NULL
    `);
    
    // Format the orphaned content object
    const orphanedContent = {
      articlesWithoutTranslations: articlesWithoutTranslations.rows.map(row => ({
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      translationsWithoutArticles: translationsWithoutArticles.rows.map(row => ({
        id: row.id,
        articleId: row.article_id,
        languageCode: row.language_code,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      tagsWithoutArticles: tagsWithoutArticles.rows.map(row => ({
        id: row.id,
        code: row.code,
        nameEn: row.name_en,
        nameBn: row.name_bn,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      categoriesWithoutArticles: categoriesWithoutArticles.rows.map(row => ({
        id: row.id,
        code: row.code,
        nameEn: row.name_en,
        nameBn: row.name_bn,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
    
    res.json({
      ok: true,
      orphanedContent
    });
  } catch (error) {
    console.error('Error fetching orphaned content:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch orphaned content'
    });
  }
});

/**
 * POST /api/admin/cleanup
 * Clean up orphaned data in the system
 *
 * Request headers:
 * Authorization: Bearer <jwt_token>
 *
 * Response (success):
 * {
 *   "ok": true,
 *   "message": "Orphaned data cleaned up successfully",
 *   "cleanupStats": {
 *     "articlesWithoutTranslations": 0,
 *     "translationsWithoutArticles": 0,
 *     "tagsWithoutArticles": 0,
 *     "categoriesWithoutArticles": 0
 *   }
 * }
 */
router.post('/cleanup', authenticate, requireRole('admin'), async (req, res) => {
  try {
    // Clean up articles without translations
    const articlesWithoutTranslations = await query(`
      SELECT a.id FROM articles a
      LEFT JOIN article_translations at ON a.id = at.article_id
      WHERE at.article_id IS NULL
    `);
    
    let articlesWithoutTranslationsCount = 0;
    if (articlesWithoutTranslations.rows.length > 0) {
      const articleIds = articlesWithoutTranslations.rows.map(row => row.id);
      await query(`DELETE FROM articles WHERE id IN (${articleIds.map(() => '?').join(',')})`, articleIds);
      articlesWithoutTranslationsCount = articleIds.length;
    }
    
    // Clean up translations without articles
    const translationsWithoutArticles = await query(`
      SELECT at.id FROM article_translations at
      LEFT JOIN articles a ON at.article_id = a.id
      WHERE a.id IS NULL
    `);
    
    let translationsWithoutArticlesCount = 0;
    if (translationsWithoutArticles.rows.length > 0) {
      const translationIds = translationsWithoutArticles.rows.map(row => row.id);
      await query(`DELETE FROM article_translations WHERE id IN (${translationIds.map(() => '?').join(',')})`, translationIds);
      translationsWithoutArticlesCount = translationIds.length;
    }
    
    // Clean up tags without articles
    const tagsWithoutArticles = await query(`
      SELECT t.id FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      WHERE at.tag_id IS NULL
    `);
    
    let tagsWithoutArticlesCount = 0;
    if (tagsWithoutArticles.rows.length > 0) {
      const tagIds = tagsWithoutArticles.rows.map(row => row.id);
      await query(`DELETE FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')})`, tagIds);
      tagsWithoutArticlesCount = tagIds.length;
    }
    
    // Clean up categories without articles
    const categoriesWithoutArticles = await query(`
      SELECT c.id FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      WHERE a.category_id IS NULL
    `);
    
    let categoriesWithoutArticlesCount = 0;
    if (categoriesWithoutArticles.rows.length > 0) {
      const categoryIds = categoriesWithoutArticles.rows.map(row => row.id);
      await query(`DELETE FROM categories WHERE id IN (${categoryIds.map(() => '?').join(',')})`, categoryIds);
      categoriesWithoutArticlesCount = categoryIds.length;
    }
    
    // Format the cleanup statistics object
    const cleanupStats = {
      articlesWithoutTranslations: articlesWithoutTranslationsCount,
      translationsWithoutArticles: translationsWithoutArticlesCount,
      tagsWithoutArticles: tagsWithoutArticlesCount,
      categoriesWithoutArticles: categoriesWithoutArticlesCount
    };
    
    res.json({
      ok: true,
      message: 'Orphaned data cleaned up successfully',
      cleanupStats
    });
  } catch (error) {
    console.error('Error cleaning up orphaned content:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to clean up orphaned content'
    });
  }
});

module.exports = router;