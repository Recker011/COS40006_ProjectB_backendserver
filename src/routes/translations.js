// src/routes/translations.js
// Routes for translation management

const express = require('express');
const { query } = require('../../db');

const router = express.Router();

/**
 * GET /api/translations/languages
 * Get available languages
 * 
 * Response:
 * [{
 *   "code": "string",
 *   "name": "string"
 * }]
 */
router.get('/languages', async (req, res) => {
  try {
    // Based on the schema, we have two languages: English and Bengali
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'bn', name: 'Bengali' }
    ];
    
    res.json(languages);
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to retrieve languages' });
  }
});

/**
 * GET /api/translations/missing
 * Get articles missing translations
 * 
 * Response:
 * [{
 *   "article_id": "string",
 *   "missing_languages": ["string"]
 * }]
 */
router.get('/missing', async (req, res) => {
  try {
    // Find articles that are missing translations
    // An article should have translations for both 'en' and 'bn'
    const sql = `
      SELECT
        a.id as article_id,
        GROUP_CONCAT(at.language_code) as existing_translations
      FROM articles a
      LEFT JOIN article_translations at ON a.id = at.article_id
      WHERE a.status = ?
      GROUP BY a.id
      HAVING COUNT(at.language_code) < 2
    `;
    
    const { rows } = await query(sql, ['published']);
    
    // Process the results to determine which languages are missing
    const missingTranslations = rows.map(row => {
      const existing = row.existing_translations ? row.existing_translations.split(',') : [];
      const allLanguages = ['en', 'bn'];
      const missing = allLanguages.filter(lang => !existing.includes(lang));
      
      return {
        article_id: String(row.article_id),
        missing_languages: missing
      };
    });
    
    res.json(missingTranslations);
  } catch (error) {
    console.error('Error fetching missing translations:', error);
    res.status(500).json({ error: 'Failed to retrieve missing translations' });
  }
});

/**
 * GET /api/translations/status
 * Get translation completion status
 * 
 * Response:
 * {
 *   "total_articles": "number",
 *   "fully_translated": "number",
 *   "partially_translated": "number",
 *   "not_translated": "number",
 *   "language_breakdown": {
 *     "en": {
 *       "translated_articles": "number",
 *       "completion_percentage": "number"
 *     },
 *     "bn": {
 *       "translated_articles": "number",
 *       "completion_percentage": "number"
 *     }
 *   }
 * }
 */
router.get('/status', async (req, res) => {
  try {
    // Get total number of published articles
    const totalArticlesResult = await query('SELECT COUNT(*) as count FROM articles WHERE status = ?', ['published']);
    const totalArticles = totalArticlesResult.rows[0].count;
    
    // Get count of articles with translations for each language
    const translationCountsResult = await query(`
      SELECT
        language_code,
        COUNT(DISTINCT article_id) as translated_articles
      FROM article_translations at
      INNER JOIN articles a ON at.article_id = a.id
      WHERE a.status = ?
      GROUP BY language_code
    `, ['published']);
    
    const translationCounts = {};
    translationCountsResult.rows.forEach(row => {
      translationCounts[row.language_code] = row.translated_articles;
    });
    
    // Calculate completion percentages
    const languageBreakdown = {
      en: {
        translated_articles: translationCounts.en || 0,
        completion_percentage: totalArticles > 0 ? Math.round(((translationCounts.en || 0) / totalArticles) * 100) : 0
      },
      bn: {
        translated_articles: translationCounts.bn || 0,
        completion_percentage: totalArticles > 0 ? Math.round(((translationCounts.bn || 0) / totalArticles) * 100) : 0
      }
    };
    
    // Calculate article-level translation status
    const articleTranslationStatusResult = await query(`
      SELECT
        a.id,
        COUNT(at.language_code) as translation_count
      FROM articles a
      LEFT JOIN article_translations at ON a.id = at.article_id
      WHERE a.status = ?
      GROUP BY a.id
    `, ['published']);
    
    let fullyTranslated = 0;
    let partiallyTranslated = 0;
    let notTranslated = 0;
    
    articleTranslationStatusResult.rows.forEach(row => {
      if (row.translation_count === 2) {
        fullyTranslated++;
      } else if (row.translation_count > 0) {
        partiallyTranslated++;
      } else {
        notTranslated++;
      }
    });
    
    res.json({
      total_articles: totalArticles,
      fully_translated: fullyTranslated,
      partially_translated: partiallyTranslated,
      not_translated: notTranslated,
      language_breakdown: languageBreakdown
    });
  } catch (error) {
    console.error('Error fetching translation status:', error);
    res.status(500).json({ error: 'Failed to retrieve translation status' });
  }
});

module.exports = router;