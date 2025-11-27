// src/routes/articles.js
// Article management routes for the Information Dissemination Platform
// Implements full CRUD operations with multilingual support, search, and utility endpoints

const express = require("express");
const { query, pool } = require("../../db");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// Utility: safe ISO string conversion
// Import utility functions
const {
  toISO,
  slugify,
  generateUniqueSlug,
  findOrCreateTags,
  mimeFromUrl,
} = require("../utils/articleUtils");


/**
 * GET /api/articles
 * Optional query: ?search=term
 * - Without ?search: Retrieve all published articles with multilingual support
 * - With ?search: Search by title/content (English)
 *
 * Response:
 * [{
 *   "id": "string",
 *   "title": "string",
 *   "content": "string",
 *   "image_url": "string|null",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string"
 * }]
 */
router.get("/", async (req, res) => {
  try {

    const baseSelect = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(DISTINCT CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.status = 'published'
    `;

    let sql;
    const { search, lang, tag } = req.query; // Added 'tag' query parameter
    const languageCode = (lang === 'bn') ? 'bn' : 'en';
    let params = [languageCode];

    const conditions = [];
    if (search && typeof search === "string" && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      conditions.push(`(at.title LIKE ? OR at.body LIKE ?)`);
      params.push(like, like);
    }
    if (tag && typeof tag === "string" && tag.trim().length > 0) {
      conditions.push(`t.code = ?`);
      params.push(tag.trim());
    }

    if (conditions.length > 0) {
      sql = `${baseSelect} AND ${conditions.join(' AND ')} GROUP BY a.id ORDER BY a.created_at DESC`;
    } else {
      sql = `${baseSelect} GROUP BY a.id ORDER BY a.created_at DESC`;
    }

    const { rows } = await query(sql, params);

    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
      media_urls: article.media_urls ? article.media_urls.split('|||').filter(Boolean) : [],
      image_urls: article.image_urls ? article.image_urls.split('|||').filter(Boolean) : [],
      video_urls: article.video_urls ? article.video_urls.split('|||').filter(Boolean) : [],
    }));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching/searching articles:", error);
    res.status(500).json({ error: "Failed to retrieve articles" });
  }
});
/**
 * GET /api/articles/recent
 * List recent published articles within the last N days
 * - Public endpoint (no auth)
 * - Supports optional query params:
 *    - days: 7 | 30 (default 7)
 *    - lang: 'en' | 'bn' (default 'en')
 *    - search: optional search term (matches title/body)
 *    - tag: optional tag code filter
 */
router.get("/recent", async (req, res) => {
  try {
    const { search, lang, tag } = req.query;
    let { days } = req.query;

    const languageCode = (lang === 'bn') ? 'bn' : 'en';

    // Validate days
    let daysInt = 7; // default
    if (days !== undefined) {
      const parsed = parseInt(String(days), 10);
      if (parsed === 7 || parsed === 30) {
        daysInt = parsed;
      } else {
        return res.status(400).json({ error: "Invalid days. Allowed values: 7 or 30" });
      }
    }

    const baseSelect = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(DISTINCT CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.status = 'published'
        AND a.published_at IS NOT NULL
        AND a.published_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    const conditions = [];
    const params = [languageCode, daysInt];

    if (search && typeof search === "string" && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      conditions.push(`(at.title LIKE ? OR at.body LIKE ?)`);
      params.push(like, like);
    }

    if (tag && typeof tag === "string" && tag.trim().length > 0) {
      conditions.push(`t.code = ?`);
      params.push(tag.trim());
    }

    const sql =
      conditions.length > 0
        ? `${baseSelect} AND ${conditions.join(' AND ')} GROUP BY a.id ORDER BY a.published_at DESC`
        : `${baseSelect} GROUP BY a.id ORDER BY a.published_at DESC`;

    const { rows } = await query(sql, params);

    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
      media_urls: article.media_urls ? article.media_urls.split('|||').filter(Boolean) : [],
      image_urls: article.image_urls ? article.image_urls.split('|||').filter(Boolean) : [],
      video_urls: article.video_urls ? article.video_urls.split('|||').filter(Boolean) : [],
    }));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching recent articles:", error);
    res.status(500).json({ error: "Failed to retrieve recent articles" });
  }
});
/**
 * GET /api/articles/by-author/:userId
 * List published articles by a specific author with multilingual support
 * - Public endpoint (no auth)
 * - Supports optional query params:
 *    - lang: 'en' | 'bn' (default 'en')
 *    - search: optional search term (matches title/body)
 *    - tag: optional tag code filter
 */
router.get("/by-author/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { search, lang, tag } = req.query;

    if (!userId || !/^\d+$/.test(String(userId))) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const languageCode = (lang === 'bn') ? 'bn' : 'en';

    const baseSelect = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(DISTINCT CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.status = 'published' AND a.author_user_id = ?
    `;

    const conditions = [];
    const params = [languageCode, parseInt(userId, 10)];

    if (search && typeof search === "string" && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      conditions.push(`(at.title LIKE ? OR at.body LIKE ?)`);
      params.push(like, like);
    }

    if (tag && typeof tag === "string" && tag.trim().length > 0) {
      conditions.push(`t.code = ?`);
      params.push(tag.trim());
    }

    const sql =
      conditions.length > 0
        ? `${baseSelect} AND ${conditions.join(' AND ')} GROUP BY a.id ORDER BY a.created_at DESC`
        : `${baseSelect} GROUP BY a.id ORDER BY a.created_at DESC`;

    const { rows } = await query(sql, params);

    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
      media_urls: article.media_urls ? article.media_urls.split('|||').filter(Boolean) : [],
      image_urls: article.image_urls ? article.image_urls.split('|||').filter(Boolean) : [],
      video_urls: article.video_urls ? article.video_urls.split('|||').filter(Boolean) : [],
    }));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching articles by author:", error);
    res.status(500).json({ error: "Failed to retrieve articles by author" });
  }
});

/**
 * GET /api/articles/drafts
 * List draft articles. Visibility:
 * - admin/editor: all drafts
 * - reader: only drafts authored by the current user
 * Query params:
 * - search: optional search term
 * - lang: optional 'en' or 'bn' (default 'en')
 * - tag: optional tag code to filter
 */
router.get("/drafts", authenticate, async (req, res) => {
  try {
    const { search, lang, tag } = req.query;
    const languageCode = (lang === 'bn') ? 'bn' : 'en';

    const baseSelect = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(DISTINCT CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.status = 'draft'
    `;

    let params = [languageCode];
    const conditions = [];

    // Role-based visibility
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      // Readers see only their own drafts
      conditions.push(`a.author_user_id = ?`);
      params.push(req.user.id);
    }

    if (search && typeof search === "string" && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      conditions.push(`(at.title LIKE ? OR at.body LIKE ?)`);
      params.push(like, like);
    }

    if (tag && typeof tag === "string" && tag.trim().length > 0) {
      conditions.push(`t.code = ?`);
      params.push(tag.trim());
    }

    const sql =
      conditions.length > 0
        ? `${baseSelect} AND ${conditions.join(' AND ')} GROUP BY a.id ORDER BY a.created_at DESC`
        : `${baseSelect} GROUP BY a.id ORDER BY a.created_at DESC`;

    const { rows } = await query(sql, params);

    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
      media_urls: article.media_urls ? article.media_urls.split('|||').filter(Boolean) : [],
      image_urls: article.image_urls ? article.image_urls.split('|||').filter(Boolean) : [],
      video_urls: article.video_urls ? article.video_urls.split('|||').filter(Boolean) : [],
    }));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching draft articles:", error);
    res.status(500).json({ error: "Failed to retrieve draft articles" });
  }
});

/**
 * GET /api/articles/tags/lang/:langCode
 * Lists articles grouped by tag for a specific language.
 * - Public endpoint.
 * - Filters by published articles.
 * - Response is a dictionary where keys are tag names and values are article arrays.
 */
router.get("/tags/lang/:langCode", async (req, res) => {
  try {
    const { langCode } = req.params;
    const { search, tag: tagFilter } = req.query;

    const allowedLangs = new Set(["en", "bn"]);
    if (!allowedLangs.has(langCode)) {
      return res.status(400).json({ error: "Invalid language code. Allowed: 'en', 'bn'." });
    }

    const tagNameColumn = langCode === 'bn' ? 't.name_bn' : 't.name_en';

    let sql = `
      SELECT
        t.code AS tag_code,
        ${tagNameColumn} AS tag_name,
        a.id AS article_id,
        at.title,
        at.slug,
        at.excerpt,
        a.published_at,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM tags t
      INNER JOIN article_tags atr ON t.id = atr.tag_id
      INNER JOIN articles a ON atr.article_id = a.id
      INNER JOIN article_translations at ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.status = 'published'
    `;

    const params = [langCode];
    const conditions = [];

    if (search) {
      conditions.push("(at.title LIKE ? OR at.excerpt LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (tagFilter) {
      conditions.push("t.code = ?");
      params.push(tagFilter);
    }

    if (conditions.length > 0) {
      sql += " AND " + conditions.join(" AND ");
    }
    
    sql += " ORDER BY t.code, a.published_at DESC";

    const { rows } = await query(sql, params);

    const groupedByTag = rows.reduce((acc, row) => {
      const { tag_code, tag_name, ...articleData } = row;
      if (!acc[tag_name]) {
        acc[tag_name] = [];
      }
      acc[tag_name].push({
        id: String(articleData.article_id),
        title: articleData.title,
        slug: articleData.slug,
        excerpt: articleData.excerpt,
        published_at: toISO(articleData.published_at),
        media_urls: articleData.media_urls ? articleData.media_urls.split('|||').filter(Boolean) : [],
        image_urls: articleData.image_urls ? articleData.image_urls.split('|||').filter(Boolean) : [],
        video_urls: articleData.video_urls ? articleData.video_urls.split('|||').filter(Boolean) : [],
      });
      return acc;
    }, {});

    res.json(groupedByTag);
  } catch (error) {
    console.error("Error fetching articles grouped by tag:", error);
    res.status(500).json({ error: "Failed to retrieve articles." });
  }
});

/**
 * GET /api/articles/:id/translations
 * Get all translations for a published article
 * - Public endpoint (no auth), but only returns when article is published
 * - Returns an array of translations with language_code, title, slug, excerpt, body, created_at, updated_at
 */
router.get("/:id/translations", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^\d+$/.test(String(id))) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

    const sql = `
      SELECT
        at.id AS translation_id,
        at.language_code,
        at.title,
        at.slug,
        at.excerpt,
        at.body,
        at.created_at,
        at.updated_at
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id
      WHERE a.id = ? AND a.status = 'published'
      ORDER BY at.language_code ASC, at.id ASC
    `;

    const { rows } = await query(sql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Article not found or not published" });
    }

    const translations = rows.map((t) => ({
      id: String(t.translation_id),
      language_code: t.language_code,
      title: t.title || "",
      slug: t.slug || "",
      excerpt: t.excerpt || "",
      body: t.body || "",
      created_at: toISO(t.created_at),
      updated_at: toISO(t.updated_at),
    }));

    res.json(translations);
  } catch (error) {
    console.error("Error fetching article translations:", error);
    res.status(500).json({ error: "Failed to retrieve translations" });
  }
});
/**
 * GET /api/articles/:id
 * Retrieve a specific published article by ID with multilingual support
 *
 * Response:
 * {
 *   "id": "string",
 *   "title": "string",
 *   "content": "string",
 *   "image_url": "string|null",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string"
 * }
 */
/**
 * GET /api/articles/hidden
 * List hidden articles (admin/editor only)
 * Query params:
 * - search: optional search term
 * - lang: optional 'en' or 'bn' (default 'en')
 * - tag: optional tag code to filter
 */
router.get("/hidden", authenticate, requireRole(['admin','editor']), async (req, res) => {
  try {
    const { search, lang, tag } = req.query;
    const languageCode = (lang === 'bn') ? 'bn' : 'en';

    const baseSelect = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(DISTINCT CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.status = 'hidden'
    `;

    let params = [languageCode];
    const conditions = [];

    if (search && typeof search === "string" && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      conditions.push(`(at.title LIKE ? OR at.body LIKE ?)`);
      params.push(like, like);
    }

    if (tag && typeof tag === "string" && tag.trim().length > 0) {
      conditions.push(`t.code = ?`);
      params.push(tag.trim());
    }

    const sql =
      conditions.length > 0
        ? `${baseSelect} AND ${conditions.join(' AND ')} GROUP BY a.id ORDER BY a.created_at DESC`
        : `${baseSelect} GROUP BY a.id ORDER BY a.created_at DESC`;

    const { rows } = await query(sql, params);

    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
      media_urls: article.media_urls ? article.media_urls.split('|||').filter(Boolean) : [],
      image_urls: article.image_urls ? article.image_urls.split('|||').filter(Boolean) : [],
      video_urls: article.video_urls ? article.video_urls.split('|||').filter(Boolean) : [],
    }));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching hidden articles:", error);
    res.status(500).json({ error: "Failed to retrieve hidden articles" });
  }
});

/**
 * POST /api/articles/:id/translations
 * Add a new translation for an article
 * - Authz: admin/editor only
 * - Validates that the translation for the given language doesn't already exist
 * - Regenerates a unique slug from title for the given language
 *
 * Body:
 * {
 *   "language_code": "en" | "bn",
 *   "title": "string (required)",
 *   "content": "string (required)",
 *   "excerpt": "string (optional)"
 * }
 */
router.post("/:id/translations", authenticate, requireRole(['admin','editor']), async (req, res) => {
  const { id } = req.params;
  const { language_code, title, content, excerpt } = req.body || {};

  if (!id || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: "Invalid article ID" });
  }

  const allowedLangs = new Set(["en", "bn"]);
  if (typeof language_code !== "string" || !allowedLangs.has(language_code)) {
    return res.status(400).json({ error: "Invalid language_code. Allowed: 'en' or 'bn'" });
  }

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({ error: "Content is required" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ensure the article exists and lock for update
    const [articleRows] = await connection.execute(
      "SELECT id FROM articles WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!Array.isArray(articleRows) || articleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Article not found" });
    }

    // Ensure translation for this language does not already exist
    const [existingRows] = await connection.execute(
      "SELECT id FROM article_translations WHERE article_id = ? AND language_code = ? FOR UPDATE",
      [id, language_code]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Translation for this language already exists" });
    }

    // Generate unique slug for this language
    const baseSlug = slugify(title);
    const uniqueSlug = await generateUniqueSlug(connection, baseSlug, language_code);

    // Insert translation
    const [insertRes] = await connection.execute(
      "INSERT INTO article_translations (article_id, language_code, title, slug, excerpt, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [id, language_code, title, uniqueSlug, excerpt || "", content]
    );
    const translationId = insertRes.insertId;

    // Touch the article's updated_at
    await connection.execute(
      "UPDATE articles SET updated_at = NOW() WHERE id = ?",
      [id]
    );

    await connection.commit();

    const nowIso = new Date().toISOString();
    res.status(201).json({
      ok: true,
      translation: {
        id: String(translationId),
        article_id: String(id),
        language_code,
        title,
        slug: uniqueSlug,
        excerpt: excerpt || "",
        body: content,
        created_at: nowIso,
        updated_at: nowIso
      }
    });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    console.error("Error creating translation:", error);
    res.status(500).json({ error: "Failed to create translation" });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/articles/:id/translations/:lang
 * Update specific language translation
 * - Authz: admin/editor only
 * - Updates any subset of: title, content, excerpt
 * - If title changes, slug is regenerated uniquely for that language (excluding current article)
 *
 * Body:
 * {
 *   "title": "string (optional)",
 *   "content": "string (optional)",
 *   "excerpt": "string (optional)"
 * }
 */
router.put("/:id/translations/:lang", authenticate, requireRole(['admin','editor']), async (req, res) => {
  const { id, lang } = req.params;
  const { title, content, excerpt } = req.body || {};

  if (!id || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: "Invalid article ID" });
  }
  const allowedLangs = new Set(["en", "bn"]);
  if (!allowedLangs.has(lang)) {
    return res.status(400).json({ error: "Invalid lang. Allowed: 'en' or 'bn'" });
  }
  if (
    (title === undefined || title === null) &&
    (content === undefined || content === null) &&
    (excerpt === undefined || excerpt === null)
  ) {
    return res.status(400).json({ error: "At least one of title, content, excerpt must be provided" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ensure the article exists and lock for update
    const [articleRows] = await connection.execute(
      "SELECT id FROM articles WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!Array.isArray(articleRows) || articleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Article not found" });
    }

    // Ensure the translation row exists and lock it
    const [txRows] = await connection.execute(
      "SELECT id FROM article_translations WHERE article_id = ? AND language_code = ? FOR UPDATE",
      [id, lang]
    );
    if (!Array.isArray(txRows) || txRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Translation not found for specified language" });
    }

    const sets = [];
    const params = [];

    let newSlug = null;
    if (typeof title === "string") {
      sets.push("title = ?");
      params.push(title);
      // Regenerate slug based on new title
      const baseSlug = slugify(title);
      newSlug = await generateUniqueSlug(connection, baseSlug, lang, parseInt(id, 10));
      sets.push("slug = ?");
      params.push(newSlug);
    }

    if (typeof content === "string") {
      sets.push("body = ?");
      params.push(content);
    }

    if (typeof excerpt === "string") {
      sets.push("excerpt = ?");
      params.push(excerpt);
    }

    sets.push("updated_at = NOW()");

    const updateSql = `UPDATE article_translations SET ${sets.join(", ")} WHERE article_id = ? AND language_code = ?`;
    params.push(id, lang);
    await connection.execute(updateSql, params);

    // Touch parent article
    await connection.execute("UPDATE articles SET updated_at = NOW() WHERE id = ?", [id]);

    await connection.commit();

    res.json({
      ok: true,
      article_id: String(id),
      language_code: lang,
      ...(typeof title === "string" ? { title } : {}),
      ...(newSlug ? { slug: newSlug } : {}),
      ...(typeof excerpt === "string" ? { excerpt } : {}),
      ...(typeof content === "string" ? { body: content } : {}),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    console.error("Error updating translation:", error);
    res.status(500).json({ error: "Failed to update translation" });
  } finally {
    connection.release();
  }
});/**
 * GET /api/articles/hidden
 * List hidden articles (admin/editor only)
 * Query params:
 * - search: optional search term
 * - lang: optional 'en' or 'bn' (default 'en')
 * - tag: optional tag code to filter
 */
 // Removed duplicate /hidden route (consolidated earlier)

/**
 * POST /api/articles/:id/translations
 * Add a new translation for an article
 * - Authz: admin/editor only
 * - Validates that the translation for the given language doesn't already exist
 * - Regenerates a unique slug from title for the given language
 *
 * Body:
 * {
 *   "language_code": "en" | "bn",
 *   "title": "string (required)",
 *   "content": "string (required)",
 *   "excerpt": "string (optional)"
 * }
 */
router.post("/:id/translations", authenticate, requireRole(['admin','editor']), async (req, res) => {
  const { id } = req.params;
  const { language_code, title, content, excerpt } = req.body || {};

  if (!id || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: "Invalid article ID" });
  }

  const allowedLangs = new Set(["en", "bn"]);
  if (typeof language_code !== "string" || !allowedLangs.has(language_code)) {
    return res.status(400).json({ error: "Invalid language_code. Allowed: 'en' or 'bn'" });
  }

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({ error: "Content is required" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ensure the article exists and lock for update
    const [articleRows] = await connection.execute(
      "SELECT id FROM articles WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!Array.isArray(articleRows) || articleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Article not found" });
    }

    // Ensure translation for this language does not already exist
    const [existingRows] = await connection.execute(
      "SELECT id FROM article_translations WHERE article_id = ? AND language_code = ? FOR UPDATE",
      [id, language_code]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Translation for this language already exists" });
    }

    // Generate unique slug for this language
    const baseSlug = slugify(title);
    const uniqueSlug = await generateUniqueSlug(connection, baseSlug, language_code);

    // Insert translation
    const [insertRes] = await connection.execute(
      "INSERT INTO article_translations (article_id, language_code, title, slug, excerpt, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [id, language_code, title, uniqueSlug, excerpt || "", content]
    );
    const translationId = insertRes.insertId;

    // Touch the article's updated_at
    await connection.execute(
      "UPDATE articles SET updated_at = NOW() WHERE id = ?",
      [id]
    );

    await connection.commit();

    const nowIso = new Date().toISOString();
    res.status(201).json({
      ok: true,
      translation: {
        id: String(translationId),
        article_id: String(id),
        language_code,
        title,
        slug: uniqueSlug,
        excerpt: excerpt || "",
        body: content,
        created_at: nowIso,
        updated_at: nowIso
      }
    });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    console.error("Error creating translation:", error);
    res.status(500).json({ error: "Failed to create translation" });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/articles/:id/translations/:lang
 * Update specific language translation
 * - Authz: admin/editor only
 * - Updates any subset of: title, content, excerpt
 * - If title changes, slug is regenerated uniquely for that language (excluding current article)
 *
 * Body:
 * {
 *   "title": "string (optional)",
 *   "content": "string (optional)",
 *   "excerpt": "string (optional)"
 * }
 */
router.put("/:id/translations/:lang", authenticate, requireRole(['admin','editor']), async (req, res) => {
  const { id, lang } = req.params;
  const { title, content, excerpt } = req.body || {};

  if (!id || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: "Invalid article ID" });
  }
  const allowedLangs = new Set(["en", "bn"]);
  if (!allowedLangs.has(lang)) {
    return res.status(400).json({ error: "Invalid lang. Allowed: 'en' or 'bn'" });
  }
  if (
    (title === undefined || title === null) &&
    (content === undefined || content === null) &&
    (excerpt === undefined || excerpt === null)
  ) {
    return res.status(400).json({ error: "At least one of title, content, excerpt must be provided" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ensure the article exists and lock for update
    const [articleRows] = await connection.execute(
      "SELECT id FROM articles WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!Array.isArray(articleRows) || articleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Article not found" });
    }

    // Ensure the translation row exists and lock it
    const [txRows] = await connection.execute(
      "SELECT id FROM article_translations WHERE article_id = ? AND language_code = ? FOR UPDATE",
      [id, lang]
    );
    if (!Array.isArray(txRows) || txRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Translation not found for specified language" });
    }

    const sets = [];
    const params = [];

    let newSlug = null;
    if (typeof title === "string") {
      sets.push("title = ?");
      params.push(title);
      // Regenerate slug based on new title
      const baseSlug = slugify(title);
      newSlug = await generateUniqueSlug(connection, baseSlug, lang, parseInt(id, 10));
      sets.push("slug = ?");
      params.push(newSlug);
    }

    if (typeof content === "string") {
      sets.push("body = ?");
      params.push(content);
    }

    if (typeof excerpt === "string") {
      sets.push("excerpt = ?");
      params.push(excerpt);
    }

    sets.push("updated_at = NOW()");

    const updateSql = `UPDATE article_translations SET ${sets.join(", ")} WHERE article_id = ? AND language_code = ?`;
    params.push(id, lang);
    await connection.execute(updateSql, params);

    // Touch parent article
    await connection.execute("UPDATE articles SET updated_at = NOW() WHERE id = ?", [id]);

    await connection.commit();

    res.json({
      ok: true,
      article_id: String(id),
      language_code: lang,
      ...(typeof title === "string" ? { title } : {}),
      ...(newSlug ? { slug: newSlug } : {}),
      ...(typeof excerpt === "string" ? { excerpt } : {}),
      ...(typeof content === "string" ? { body: content } : {}),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    console.error("Error updating translation:", error);
    res.status(500).json({ error: "Failed to update translation" });
  } finally {
    connection.release();
  }
});
/**
 * DELETE /api/articles/:id/translations/:lang
 * Delete a specific language translation for an article
 * - Authz: admin/editor only
 * - Prevents deleting the last remaining translation for an article
 *
 * Response:
 * - 204 No Content on success
 * - 400 Invalid input
 * - 404 Article or translation not found
 * - 409 If attempting to delete the last remaining translation
 */
router.delete("/:id/translations/:lang", authenticate, requireRole(['admin','editor']), async (req, res) => {
  const { id, lang } = req.params;

  if (!id || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: "Invalid article ID" });
  }
  const allowedLangs = new Set(["en", "bn"]);
  if (!allowedLangs.has(lang)) {
    return res.status(400).json({ error: "Invalid lang. Allowed: 'en' or 'bn'" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ensure the article exists and lock for update
    const [articleRows] = await connection.execute(
      "SELECT id FROM articles WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!Array.isArray(articleRows) || articleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Article not found" });
    }

    // Ensure the specific translation exists and lock it
    const [txRows] = await connection.execute(
      "SELECT id FROM article_translations WHERE article_id = ? AND language_code = ? FOR UPDATE",
      [id, lang]
    );
    if (!Array.isArray(txRows) || txRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Translation not found for specified language" });
    }

    // Prevent deleting the last remaining translation
    const [allTxRows] = await connection.execute(
      "SELECT id FROM article_translations WHERE article_id = ? FOR UPDATE",
      [id]
    );
    if (!Array.isArray(allTxRows) || allTxRows.length <= 1) {
      await connection.rollback();
      return res.status(409).json({ error: "Cannot delete the last remaining translation for this article" });
    }

    // Delete the translation
    await connection.execute(
      "DELETE FROM article_translations WHERE article_id = ? AND language_code = ?",
      [id, lang]
    );

    // Touch parent article
    await connection.execute(
      "UPDATE articles SET updated_at = NOW() WHERE id = ?",
      [id]
    );

    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    try { await connection.rollback(); } catch {}
    console.error("Error deleting translation:", error);
    return res.status(500).json({ error: "Failed to delete translation" });
  } finally {
    connection.release();
  }
});
/**
 * POST /api/articles/:id/duplicate
 * Duplicate an article (container, translations, tags, media)
 * - Authz: admin/editor only
 * - New article is created as draft, authored by the requesting user
 * - Slugs are regenerated uniquely per language (base: original slug + "-copy")
 * - Tags and single media asset (if any) are copied
 *
 * Response (201 Created):
 * {
 *   "ok": true,
 *   "id": "newArticleId",
 *   "status": "draft",
 *   "created_at": "...",
 *   "updated_at": "..."
 * }
 */
router.post("/:id/duplicate", authenticate, requireRole(['admin','editor']), async (req, res) => {
  const { id } = req.params;

  if (!id || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: "Invalid article ID" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1) Load and lock the source article
    const [articleRows] = await connection.execute(
      "SELECT id, category_id, author_user_id, status FROM articles WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!Array.isArray(articleRows) || articleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Article not found" });
    }
    const source = articleRows[0];

    // 2) Create the new article as a draft, author = current user
    const [insertArticleRes] = await connection.execute(
      "INSERT INTO articles (category_id, author_user_id, status, published_at, created_at, updated_at) VALUES (?, ?, ?, NULL, NOW(), NOW())",
      [source.category_id, req.user.id, "draft"]
    );
    const newArticleId = insertArticleRes.insertId;

    // 3) Copy translations (generate unique slugs)
    const [txRows] = await connection.execute(
      "SELECT language_code, title, slug, body FROM article_translations WHERE article_id = ?",
      [id]
    );
    if (Array.isArray(txRows) && txRows.length > 0) {
      for (const row of txRows) {
        const languageCode = row.language_code;
        const baseSlug = `${row.slug || slugify(row.title || "article")}-copy`.slice(0, 255);
        const uniqueSlug = await generateUniqueSlug(connection, baseSlug, languageCode);

        await connection.execute(
          "INSERT INTO article_translations (article_id, language_code, title, slug, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
          [newArticleId, languageCode, row.title || "", uniqueSlug, row.body || ""]
        );
      }
    } else {
      // If source had no translations (unlikely), create empty placeholders for both languages for consistency
      for (const languageCode of ['en', 'bn']) {
        const uniqueSlug = await generateUniqueSlug(connection, `article-copy-${languageCode}`, languageCode);
        await connection.execute(
          "INSERT INTO article_translations (article_id, language_code, title, slug, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
          [newArticleId, languageCode, "", uniqueSlug, ""]
        );
      }
    }

    // 4) Copy tags
    const [tagRows] = await connection.execute(
      "SELECT tag_id FROM article_tags WHERE article_id = ?",
      [id]
    );
    if (Array.isArray(tagRows) && tagRows.length > 0) {
      for (const tr of tagRows) {
        await connection.execute(
          "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
          [newArticleId, tr.tag_id]
        );
      }
    }

    // 5) Copy media asset (if any) into a new row with id = newArticleId (1:1 mapping pattern)
    const [mediaRows] = await connection.execute(
      "SELECT type, url, mime_type FROM media_assets WHERE id = ?",
      [id]
    );
    if (Array.isArray(mediaRows) && mediaRows.length > 0) {
      const m = mediaRows[0];
      await connection.execute(
        "INSERT INTO media_assets (id, type, url, mime_type, created_at) VALUES (?, ?, ?, ?, NOW())",
        [newArticleId, m.type, m.url, m.mime_type]
      );
    }

    await connection.commit();

    const nowIso = new Date().toISOString();
    res.status(201).json({
      ok: true,
      id: String(newArticleId),
      status: "draft",
      created_at: nowIso,
      updated_at: nowIso
    });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    console.error("Error duplicating article:", error);
    res.status(500).json({ error: "Failed to duplicate article" });
  } finally {
    connection.release();
  }
});
/**
 * PUT /api/articles/:id/status
 * Change article status to 'draft' | 'published' | 'hidden'
 * Authz: admin/editor only
 * Body:
 * {
 *   "status": "draft" | "published" | "hidden"
 * }
 */
router.put("/:id/status", authenticate, requireRole(['admin','editor']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: "Invalid article ID" });
  }

  const allowedStatuses = new Set(["draft", "published", "hidden"]);
  if (typeof status !== "string" || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: "Invalid status. Allowed: draft, published, hidden" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ensure the article exists and lock it for update
    const [rows] = await connection.execute(
      "SELECT id FROM articles WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Article not found" });
    }

    // Set published_at appropriately when changing status
    if (status === "published") {
      await connection.execute(
        "UPDATE articles SET status = ?, published_at = NOW(), updated_at = NOW() WHERE id = ?",
        [status, id]
      );
    } else {
      await connection.execute(
        "UPDATE articles SET status = ?, published_at = NULL, updated_at = NOW() WHERE id = ?",
        [status, id]
      );
    }

    await connection.commit();

    res.json({
      ok: true,
      id: String(id),
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    console.error("Error updating article status:", error);
    res.status(500).json({ error: "Failed to update article status" });
  } finally {
    connection.release();
  }
});
/**
 * GET /api/articles/:id/comments
 * List comments for a specific article (public; excludes soft-deleted)
 *
 * Response:
 * [{
 *   "id": "string",
 *   "article_id": "string",
 *   "user_id": "string",
 *   "author_display_name": "string",
 *   "body": "string",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string",
 *   "edited_at": "ISO string|null",
 *   "edited_by_user_id": "string|null",
 *   "deleted_at": "ISO string|null",
 *   "deleted_by_user_id": "string|null"
 * }]
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

        // Verify the article exists and is published
        const { rows: articleRows } = await query(
          "SELECT id FROM articles WHERE id = ? AND status = 'published'",
          [id]
        );

    if (!articleRows || articleRows.length === 0) {
      return res.status(404).json({ error: "Article not found or not published" });
    }

    const sql = `
      SELECT
        c.id,
        c.article_id,
        c.user_id,
        u.display_name AS author_display_name,
        c.body,
        c.created_at,
        c.updated_at,
        c.edited_at,
        c.edited_by_user_id,
        c.deleted_at,
        c.deleted_by_user_id
      FROM comments c
      INNER JOIN users u
        ON c.user_id = u.id
      WHERE c.article_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `;

    const { rows } = await query(sql, [id]);

    const comments = rows.map((comment) => ({
      id: String(comment.id),
      article_id: String(comment.article_id),
      user_id: String(comment.user_id),
      author_display_name: comment.author_display_name,
      body: comment.body,
      created_at: toISO(comment.created_at),
      updated_at: toISO(comment.updated_at),
      edited_at: toISO(comment.edited_at),
      edited_by_user_id: comment.edited_by_user_id ? String(comment.edited_by_user_id) : null,
      deleted_at: toISO(comment.deleted_at),
      deleted_by_user_id: comment.deleted_by_user_id ? String(comment.deleted_by_user_id) : null,
    }));

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments for article:", error);
    res.status(500).json({ error: "Failed to retrieve comments" });
  }
});
/**
 * GET /api/articles/:id/:lang
 * Retrieve a specific published article by ID for a specific language (path param)
 *
 * Response:
 * {
 *   "id": "string",
 *   "title": "string",
 *   "content": "string",
 *   "image_url": "string|null",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string",
 *   "tags": ["code1","code2"],
 *   "tags_names": ["Name EN/BN", ...]
 * }
 */
router.get("/:id/:lang", async (req, res) => {
  try {
    const { id, lang } = req.params;

    if (!id || !/^\d+$/.test(String(id))) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

    const allowedLangs = new Set(["en", "bn"]);
    if (!allowedLangs.has(lang)) {
      return res.status(400).json({ error: "Invalid language. Allowed: 'en' or 'bn'" });
    }

    const sql = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(DISTINCT CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.id = ? AND a.status = 'published'
      GROUP BY a.id, at.title, at.body, a.created_at, a.updated_at
    `;

    const { rows } = await query(sql, [lang, id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Article not found in the requested language" });
    }

    const article = rows[0];
    res.json({
      id: String(article.id),
      title: article.title,
      content: article.content,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(",") : [],
      tags_names: article.tags_names ? article.tags_names.split(",") : [],
      media_urls: article.media_urls ? article.media_urls.split('|||').filter(Boolean) : [],
      image_urls: article.image_urls ? article.image_urls.split('|||').filter(Boolean) : [],
      video_urls: article.video_urls ? article.video_urls.split('|||').filter(Boolean) : [],
    });
  } catch (error) {
    console.error("Error fetching article by id and lang:", error);
    res.status(500).json({ error: "Failed to retrieve article" });
  }
});

/**
 * GET /api/articles/:lang
 * List published articles for a specific language (path param)
 * Optional query: ?search=term&amp;tag=code
 *
 * Response: same shape as GET /api/articles (array)
 */
router.get("/:lang", async (req, res, next) => {
  try {
    const { lang } = req.params;
    const { search, tag } = req.query;

    // Only allow valid language codes; otherwise pass to next route (e.g., numeric :id handler)
    const allowedLangs = new Set(["en", "bn"]);
    if (!allowedLangs.has(lang)) {
      return next();
    }

    const baseSelect = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(DISTINCT CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.status = 'published'
    `;

    const conditions = [];
    const params = [lang];

    if (search && typeof search === "string" && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      conditions.push(`(at.title LIKE ? OR at.body LIKE ?)`);
      params.push(like, like);
    }

    if (tag && typeof tag === "string" && tag.trim().length > 0) {
      conditions.push(`t.code = ?`);
      params.push(tag.trim());
    }

    const sql =
      conditions.length > 0
        ? `${baseSelect} AND ${conditions.join(" AND ")} GROUP BY a.id ORDER BY a.created_at DESC`
        : `${baseSelect} GROUP BY a.id ORDER BY a.created_at DESC`;

    const { rows } = await query(sql, params);

    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(",") : [],
      tags_names: article.tags_names ? article.tags_names.split(",") : [],
      media_urls: article.media_urls ? article.media_urls.split('|||').filter(Boolean) : [],
      image_urls: article.image_urls ? article.image_urls.split('|||').filter(Boolean) : [],
      video_urls: article.video_urls ? article.video_urls.split('|||').filter(Boolean) : [],
    }));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching articles by language:", error);
    res.status(500).json({ error: "Failed to retrieve articles" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query; // Get the optional 'lang' query parameter

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

    // Determine the language code, default to 'en' if not specified or invalid
    const languageCode = (lang === 'bn') ? 'bn' : 'en';

    const sql = `
      SELECT
        a.id,
        at.title,
        at.body AS content,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT t.code ORDER BY t.code ASC) AS tags_codes,
        GROUP_CONCAT(DISTINCT CASE WHEN at.language_code = 'en' THEN t.name_en ELSE t.name_bn END ORDER BY t.code ASC) AS tags_names,
        GROUP_CONCAT(DISTINCT ma.url ORDER BY ma.url ASC SEPARATOR '|||') AS media_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'image' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS image_urls,
        GROUP_CONCAT(DISTINCT CASE WHEN ma.type = 'video' THEN ma.url END ORDER BY ma.url ASC SEPARATOR '|||') AS video_urls
      FROM articles a
      INNER JOIN article_translations at
        ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN article_tags artag
        ON a.id = artag.article_id
      LEFT JOIN tags t
        ON artag.tag_id = t.id
      LEFT JOIN article_media am
        ON a.id = am.article_id
      LEFT JOIN media_assets ma
        ON am.media_asset_id = ma.id
      WHERE a.id = ? AND a.status = 'published'
      GROUP BY a.id, at.title, at.body, a.created_at, a.updated_at
    `;

    const { rows } = await query(sql, [languageCode, id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Article not found in the requested language" });
    }

    const article = rows[0];
    res.json({
      id: String(article.id),
      title: article.title,
      content: article.content,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
      media_urls: article.media_urls ? article.media_urls.split('|||').filter(Boolean) : [],
      image_urls: article.image_urls ? article.image_urls.split('|||').filter(Boolean) : [],
      video_urls: article.video_urls ? article.video_urls.split('|||').filter(Boolean) : [],
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Failed to retrieve article" });
  }
});

/**
 * GET /api/articles/:id/comments
 * List comments for a specific article (public; excludes soft-deleted)
 *
 * Response:
 * [{
 *   "id": "string",
 *   "article_id": "string",
 *   "user_id": "string",
 *   "author_display_name": "string",
 *   "body": "string",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string",
 *   "edited_at": "ISO string|null",
 *   "edited_by_user_id": "string|null",
 *   "deleted_at": "ISO string|null",
 *   "deleted_by_user_id": "string|null"
 * }]
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

    // Verify the article exists and is published
    const { rows: articleRows } = await query(
      "SELECT id FROM articles WHERE id = ? AND status = 'published'",
      [id]
    );

    if (!articleRows || articleRows.length === 0) {
      return res.status(404).json({ error: "Article not found or not published" });
    }

    // @ts-ignore
    const sql = `
      SELECT
        c.id,
        c.article_id,
        c.user_id,
        u.\`display_name\` AS author_display_name,
        c.body,
        c.created_at,
        c.updated_at,
        c.edited_at,
        c.edited_by_user_id,
        c.deleted_at,
        c.deleted_by_user_id
      FROM comments c
      INNER JOIN users u
        ON c.user_id = u.id
      WHERE c.article_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `;

    const { rows } = await query(sql, [id]);

    const comments = rows.map((comment) => ({
      id: String(comment.id),
      article_id: String(comment.article_id),
      user_id: String(comment.user_id),
      author_display_name: comment.author_display_name,
      body: comment.body,
      created_at: toISO(comment.created_at),
      updated_at: toISO(comment.updated_at),
      edited_at: toISO(comment.edited_at),
      edited_by_user_id: comment.edited_by_user_id ? String(comment.edited_by_user_id) : null,
      deleted_at: toISO(comment.deleted_at),
      deleted_by_user_id: comment.deleted_by_user_id ? String(comment.deleted_by_user_id) : null,
    }));

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments for article:", error);
    res.status(500).json({ error: "Failed to retrieve comments" });
  }
});



/**
 * GET /api/articles/:id/comments
 * List comments for a specific article (public; excludes soft-deleted)
 *
 * Response:
 * [{
 *   "id": "string",
 *   "article_id": "string",
 *   "user_id": "string",
 *   "author_display_name": "string",
 *   "body": "string",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string",
 *   "edited_at": "ISO string|null",
 *   "edited_by_user_id": "string|null",
 *   "deleted_at": "ISO string|null",
 *   "deleted_by_user_id": "string|null"
 * }]
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

        // Verify the article exists and is published
        const { rows: articleRows } = await query(
          "SELECT id FROM articles WHERE id = ? AND status = 'published'",
          [id]
        );

    if (!articleRows || articleRows.length === 0) {
      return res.status(404).json({ error: "Article not found or not published" });
    }

    const sql = `
      SELECT
        c.id,
        c.article_id,
        c.user_id,
        u.display_name AS author_display_name,
        c.body,
        c.created_at,
        c.updated_at,
        c.edited_at,
        c.edited_by_user_id,
        c.deleted_at,
        c.deleted_by_user_id
      FROM comments c
      INNER JOIN users u
        ON c.user_id = u.id
      WHERE c.article_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `;

    const { rows } = await query(sql, [id]);

    const comments = rows.map((comment) => ({
      id: String(comment.id),
      article_id: String(comment.article_id),
      user_id: String(comment.user_id),
      author_display_name: comment.author_display_name,
      body: comment.body,
      created_at: toISO(comment.created_at),
      updated_at: toISO(comment.updated_at),
      edited_at: toISO(comment.edited_at),
      edited_by_user_id: comment.edited_by_user_id ? String(comment.edited_by_user_id) : null,
      deleted_at: toISO(comment.deleted_at),
      deleted_by_user_id: comment.deleted_by_user_id ? String(comment.deleted_by_user_id) : null,
    }));

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments for article:", error);
    res.status(500).json({ error: "Failed to retrieve comments" });
  }
});

/**
 * POST /api/articles/:id/comments
 * Create a new comment on an article (authenticated users, including admins)
 *
 * Request headers:
 * Authorization: Bearer <jwt_token>
 *
 * Request body:
 * {
 *   "body": "Comment content"
 * }
 *
 * Response (success):
 * {
 *   "id": "string",
 *   "article_id": "string",
 *   "user_id": "string",
 *   "author_display_name": "string",
 *   "body": "string",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string"
 * }
 */
router.post("/:id/comments", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const userId = req.user.id;

    // Validate article ID
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

    // Validate comment body
    if (!body || typeof body !== "string" || body.trim().length === 0) {
      return res.status(400).json({ error: "Comment body is required and cannot be empty" });
    }

    // Verify the article exists and is published
    const { rows: articleRows } = await query(
      "SELECT id FROM articles WHERE id = ? AND status = 'published'",
      [id]
    );

    if (!articleRows || articleRows.length === 0) {
      return res.status(404).json({ error: "Article not found or not published" });
    }

    // Insert comment into database
    const { rows: insertResult } = await query(
      "INSERT INTO comments (article_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [id, userId, body.trim()]
    );

    // Get the inserted comment with author display name
    const { rows: commentRows } = await query(
      `SELECT
        c.id,
        c.article_id,
        c.user_id,
        u.display_name AS author_display_name,
        c.body,
        c.created_at,
        c.updated_at,
        c.edited_at,
        c.edited_by_user_id,
        c.deleted_at,
        c.deleted_by_user_id
      FROM comments c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.id = ?`,
      [insertResult.insertId]
    );

    if (!commentRows || commentRows.length === 0) {
      return res.status(500).json({ error: "Failed to retrieve created comment" });
    }

    const comment = commentRows[0];
    res.status(201).json({
      id: String(comment.id),
      article_id: String(comment.article_id),
      user_id: String(comment.user_id),
      author_display_name: comment.author_display_name,
      body: comment.body,
      created_at: toISO(comment.created_at),
      updated_at: toISO(comment.updated_at),
      edited_at: toISO(comment.edited_at),
      edited_by_user_id: comment.edited_by_user_id ? String(comment.edited_by_user_id) : null,
      deleted_at: toISO(comment.deleted_at),
      deleted_by_user_id: comment.deleted_by_user_id ? String(comment.deleted_by_user_id) : null,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

/**
 * DELETE /api/comments/:id
 * Delete a comment (admin only; soft delete recommended)
 *
 * Request headers:
 * Authorization: Bearer <jwt_token>
 *
 * Response (success):
 * 204 No Content
 */
router.delete("/comments/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate comment ID
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid comment ID" });
    }

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions. Admin only." });
    }

    // Verify the comment exists and is not already deleted
    const { rows: commentRows } = await query(
      "SELECT id FROM comments WHERE id = ? AND deleted_at IS NULL",
      [id]
    );

    if (!commentRows || commentRows.length === 0) {
      return res.status(404).json({ error: "Comment not found or already deleted" });
    }

    // Perform soft delete by setting deleted_at and deleted_by_user_id
    await query(
      "UPDATE comments SET deleted_at = NOW(), deleted_by_user_id = ? WHERE id = ?",
      [userId, id]
    );

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

/**
 * PUT /api/articles/comments/:id
 * Edit a comment (admin only)
 *
 * Request headers:
 * Authorization: Bearer <jwt_token>
 *
 * Request body:
 * {
 *   "body": "Edited comment content"
 * }
 *
 * Response (success):
 * {
 *   "id": "string",
 *   "article_id": "string",
 *   "user_id": "string",
 *   "author_display_name": "string",
 *   "body": "string",
 *   "created_at": "ISO string",
 *   "updated_at": "ISO string",
 *   "edited_at": "ISO string",
 *   "edited_by_user_id": "string"
 * }
 */
router.put("/comments/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const userId = req.user.id;

    // Validate comment ID
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid comment ID" });
    }

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions. Admin only." });
    }

    // Validate comment body
    if (!body || typeof body !== "string" || body.trim().length === 0) {
      return res.status(400).json({ error: "Comment body is required and cannot be empty" });
    }

    // Verify the comment exists and is not deleted
    const { rows: commentRows } = await query(
      "SELECT id, article_id, user_id, created_at, updated_at, edited_at, edited_by_user_id FROM comments WHERE id = ? AND deleted_at IS NULL",
      [id]
    );

    if (!commentRows || commentRows.length === 0) {
      return res.status(404).json({ error: "Comment not found or deleted" });
    }

    const existingComment = commentRows[0];

    // Update comment in database
    await query(
      "UPDATE comments SET body = ?, edited_at = NOW(), edited_by_user_id = ?, updated_at = NOW() WHERE id = ?",
      [body.trim(), userId, id]
    );

    // Return updated comment with all relevant fields
    res.json({
      id: String(existingComment.id),
      article_id: String(existingComment.article_id),
      user_id: String(existingComment.user_id),
      author_display_name: req.user.display_name, // Admin's display name
      body: body.trim(),
      created_at: toISO(existingComment.created_at),
      updated_at: new Date().toISOString(),
      edited_at: new Date().toISOString(),
      edited_by_user_id: String(userId)
    });
  } catch (error) {
    console.error("Error editing comment:", error);
    res.status(500).json({ error: "Failed to edit comment" });
  }
});
/**
 * POST /api/articles
 * Create a new (published) article with English translation, optional image
 *
 * Request Body:
 * {
 *   "title": "string (required)",
 *   "content": "string (required)",
 *   "media_urls": ["string (optional)"],
 *   "category_id": "integer (optional)",
 *   "category_code": "string (optional, e.g. 'general'); used if category_id not provided"
 * }
 *
 * Response: Created article object
 */
router.post("/", authenticate, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { title, content, media_urls, category_id, category_code, language_code, tags } = req.body || {};
    // Backward compatibility: accept legacy single image_url too
    const image_url = (req.body && typeof req.body.image_url === 'string') ? req.body.image_url.trim() : undefined;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    // media_urls is optional; if provided must be an array of strings. image_url may be a single string.
    if (media_urls !== undefined && (!Array.isArray(media_urls) || !media_urls.every(url => typeof url === 'string'))) {
      return res.status(400).json({ error: "media_urls must be an array of strings" });
    }
    const mediaUrlsInput = Array.isArray(media_urls) ? media_urls : [];
    const singleImageList = image_url ? [image_url] : [];
    const allMediaUrls = [...mediaUrlsInput, ...singleImageList];

    const userId = req.user.id;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Resolve category_id: prefer provided category_id; else category_code; else default 'general'
      let resolvedCategoryId = null;

      // If a numeric category_id is provided and exists, use it
      if (category_id !== undefined && category_id !== null && /^\d+$/.test(String(category_id))) {
        const idNum = parseInt(category_id, 10);
        const [catByIdRows] = await connection.execute(
          "SELECT id FROM categories WHERE id = ?",
          [idNum]
        );
        if (Array.isArray(catByIdRows) && catByIdRows.length > 0) {
          resolvedCategoryId = idNum;
        }
      }

      // If not resolved by id, attempt by code (provided or fallback 'general')
      if (!resolvedCategoryId) {
        let code = "general";
        if (typeof category_code === "string" && category_code.trim().length > 0) {
          code = category_code.trim().toLowerCase();
        }

        const [catRows] = await connection.execute(
          "SELECT id FROM categories WHERE code = ?",
          [code]
        );

        if (Array.isArray(catRows) && catRows.length > 0) {
          resolvedCategoryId = catRows[0].id;
        } else {
          // Create the category on-the-fly
          const nameEn = code.charAt(0).toUpperCase() + code.slice(1);
          const [insertCatRes] = await connection.execute(
            "INSERT INTO categories (code, name_en, name_bn, created_at) VALUES (?, ?, ?, NOW())",
            [code, nameEn, ""]
          );
          resolvedCategoryId = insertCatRes.insertId;
        }
      }

      // Create article (include category_id and set published_at for published status)
      const [articleResult] = await connection.execute(
        "INSERT INTO articles (category_id, author_user_id, status, published_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW(), NOW())",
        [resolvedCategoryId, userId, "published"]
      );
      const articleId = articleResult.insertId;

      // Determine the primary language for this creation
      const primaryLang = (language_code === 'bn') ? 'bn' : 'en';
      const secondaryLang = (primaryLang === 'en') ? 'bn' : 'en';

      // Primary language translation
      const baseSlug = slugify(title);
      const primarySlug = await generateUniqueSlug(connection, baseSlug, primaryLang);
      await connection.execute(
        "INSERT INTO article_translations (article_id, language_code, title, slug, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [articleId, primaryLang, title, primarySlug, content]
      );

      // Secondary language placeholder (if not already created)
      const secondaryTitle = "";
      const secondaryContent = "";
      const secondaryBaseSlug = `${primarySlug}-${secondaryLang}`.slice(0, 255);
      const secondarySlug = await generateUniqueSlug(connection, secondaryBaseSlug, secondaryLang);
      await connection.execute(
        "INSERT INTO article_translations (article_id, language_code, title, slug, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [articleId, secondaryLang, secondaryTitle, secondarySlug, secondaryContent]
      );

      // Handle tags
      const tagIds = await findOrCreateTags(connection, tags, primaryLang);
      for (const tagId of tagIds) {
        await connection.execute(
          "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
          [articleId, tagId]
        );
      }

      // Handle media (media_urls array and legacy image_url)
      if (allMediaUrls.length > 0) {
        for (const mediaUrl of allMediaUrls) {
          const trimmedUrl = mediaUrl.trim();
          if (trimmedUrl.length > 0) {
            const mime = mimeFromUrl(trimmedUrl);
            const type = mime.startsWith('image/') ? 'image' : (mime.startsWith('video/') ? 'video' : 'other');

            // Insert into media_assets if not already present (deduplicate by url_hash)
            const [existingMediaRows] = await connection.execute(
              "SELECT id FROM media_assets WHERE url = ?",
              [trimmedUrl]
            );

            let mediaAssetId;
            if (Array.isArray(existingMediaRows) && existingMediaRows.length > 0) {
              mediaAssetId = existingMediaRows[0].id;
            } else {
              const [insertMediaRes] = await connection.execute(
                "INSERT INTO media_assets (type, url, mime_type, created_at) VALUES (?, ?, ?, NOW())",
                [type, trimmedUrl, mime]
              );
              mediaAssetId = insertMediaRes.insertId;
            }

            // Link media asset to article
            await connection.execute(
              "INSERT INTO article_media (article_id, media_asset_id) VALUES (?, ?)",
              [articleId, mediaAssetId]
            );
          }
        }
      }

      await connection.commit();

      res.status(201).json({
        id: String(articleId),
        title,
        content,
        media_urls: allMediaUrls,
        image_urls: allMediaUrls.filter(u => mimeFromUrl(u).startsWith('image/')),
        video_urls: allMediaUrls.filter(u => mimeFromUrl(u).startsWith('video/')),
        language_code: primaryLang, // Indicate the language created
        tags: tags || [], // Include tags in the response
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error creating article:", error);
    res.status(500).json({ error: "Failed to create article" });
  }
});

/**
 * PUT /api/articles/:id
 * Update an existing article (English translation + optional image)
 *
 * Request Body:
 * {
 *   "title": "string (required)",
 *   "content": "string (required)",
 *   "media_urls": ["string (optional)"]
 * }
 *
 * Response: Updated article object
 */
router.put("/:id", authenticate, requireRole(['admin', 'editor']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { title, content, media_urls, language_code, tags } = req.body || {};
    // Backward compatibility: accept legacy single image_url too
    const image_url = (req.body && typeof req.body.image_url === 'string') ? req.body.image_url.trim() : undefined;

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    // media_urls is optional; if provided, must be an array of strings. image_url may be a single string.
    if (media_urls !== undefined && (!Array.isArray(media_urls) || !media_urls.every(url => typeof url === 'string'))) {
      return res.status(400).json({ error: "media_urls must be an array of strings" });
    }
    const mediaUrlsInput = Array.isArray(media_urls) ? media_urls : [];
    const singleImageList = image_url ? [image_url] : [];
    const allMediaUrls = [...mediaUrlsInput, ...singleImageList];

    await connection.beginTransaction();

      // Verify article exists and is published within transaction
      const [articleRows] = await connection.execute(
        "SELECT id, created_at FROM articles WHERE id = ? AND status = 'published' FOR UPDATE",
        [id]
      );
      
      if (!articleRows || articleRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Published article not found" });
      }


    try {
      // Determine the language code for this update
      const targetLang = (language_code === 'bn') ? 'bn' : 'en';

      // Update specific language translation (also update slug with uniqueness)
      const baseSlug = slugify(title);
      const targetSlug = await generateUniqueSlug(connection, baseSlug, targetLang, parseInt(id, 10));
      await connection.execute(
        "UPDATE article_translations SET title = ?, slug = ?, body = ?, updated_at = NOW() WHERE article_id = ? AND language_code = ?",
        [title, targetSlug, content, id, targetLang]
      );

      // Handle tags: delete existing and insert new ones
      await connection.execute("DELETE FROM article_tags WHERE article_id = ?", [id]);
      const tagIds = await findOrCreateTags(connection, tags, targetLang);
      for (const tagId of tagIds) {
        await connection.execute(
          "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
          [id, tagId]
        );
      }

      // Handle media (media_urls array and legacy image_url): delete existing and insert new ones
      await connection.execute("DELETE FROM article_media WHERE article_id = ?", [id]);
      if (allMediaUrls.length > 0) {
        for (const mediaUrl of allMediaUrls) {
          const trimmedUrl = mediaUrl.trim();
          if (trimmedUrl.length > 0) {
            const mime = mimeFromUrl(trimmedUrl);
            const type = mime.startsWith('image/') ? 'image' : (mime.startsWith('video/') ? 'video' : 'other');

            // Insert into media_assets if not already present (deduplicate by url_hash)
            const [existingMediaRows] = await connection.execute(
              "SELECT id FROM media_assets WHERE url = ?",
              [trimmedUrl]
            );

            let mediaAssetId;
            if (Array.isArray(existingMediaRows) && existingMediaRows.length > 0) {
              mediaAssetId = existingMediaRows[0].id;
            } else {
              const [insertMediaRes] = await connection.execute(
                "INSERT INTO media_assets (type, url, mime_type, created_at) VALUES (?, ?, ?, NOW())",
                [type, trimmedUrl, mime]
              );
              mediaAssetId = insertMediaRes.insertId;
            }

            // Link media asset to article
            await connection.execute(
              "INSERT INTO article_media (article_id, media_asset_id) VALUES (?, ?)",
              [id, mediaAssetId]
            );
          }
        }
      }

      // Touch the article
      await connection.execute(
        "UPDATE articles SET updated_at = NOW() WHERE id = ?",
        [id]
      );

      await connection.commit();

      res.json({
        id: String(id),
        title,
        content,
        media_urls: allMediaUrls,
        image_urls: allMediaUrls.filter(u => mimeFromUrl(u).startsWith('image/')),
        video_urls: allMediaUrls.filter(u => mimeFromUrl(u).startsWith('video/')),
        language_code: targetLang, // Indicate the language updated
        tags: tags || [], // Include tags in the response
        created_at: toISO(articleRows[0].created_at),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({ error: "Failed to update article" });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/articles/:id
 * Delete an article by ID (and related rows)
 *
 * Response: 204 No Content
 */
router.delete("/:id", authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    await connection.beginTransaction();

      // Verify article exists and is published within transaction
      const [articleRows] = await connection.execute(
        "SELECT id FROM articles WHERE id = ? AND status = 'published' FOR UPDATE",
        [id]
      );
      
      if (!articleRows || articleRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Published article not found" });
      }


    try {
      // Delete in proper referential order
      await connection.execute("DELETE FROM article_tags WHERE article_id = ?", [id]);
      await connection.execute("DELETE FROM article_translations WHERE article_id = ?", [id]);
      await connection.execute("DELETE FROM article_media WHERE article_id = ?", [id]); // Delete from the new join table
      // Note: media_assets themselves are not deleted here, as they might be shared by other articles
      await connection.execute("DELETE FROM articles WHERE id = ?", [id]);

      await connection.commit();
      res.status(204).send();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ error: "Failed to delete article" });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/articles
 * Clear all articles and related data (utility endpoint)
 *
 * Response: 204 No Content
 */
router.delete("/", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute("DELETE FROM article_translations");
      await connection.execute("DELETE FROM article_tags");
      await connection.execute(
        "DELETE FROM media_assets WHERE type IN (?, ?)",
        ["image", "video"]
      );
      await connection.execute("DELETE FROM articles");

      await connection.commit();
      res.status(204).send();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error clearing all articles:", error);
    res.status(500).json({ error: "Failed to clear articles" });
  }
});

/**
 * POST /api/articles/clear
 * Alternate utility endpoint to clear all articles and related data
 *
 * Response: 204 No Content
 */
router.post("/clear", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute("DELETE FROM article_translations");
      await connection.execute("DELETE FROM article_tags");
      await connection.execute(
        "DELETE FROM media_assets WHERE type IN (?, ?)",
        ["image", "video"]
      );
      await connection.execute("DELETE FROM articles");

      await connection.commit();
      res.status(204).send();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error in clear articles endpoint:", error);
    res.status(500).json({ error: "Failed to clear articles" });
  }
});

module.exports = router;
