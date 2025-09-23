// src/routes/articles.js
// Article management routes for the Information Dissemination Platform
// Implements full CRUD operations with multilingual support, search, and utility endpoints

const express = require("express");
const { query, pool } = require("../../db");
const { authenticate } = require("../middleware/auth");

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
      image_url: article.image_url || null,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [], // Convert comma-separated string to array
      tags_names: article.tags_names ? article.tags_names.split(',') : [], // Convert comma-separated string to array
    }));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching/searching articles:", error);
    res.status(500).json({ error: "Failed to retrieve articles" });
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
      WHERE a.id = ? AND a.status = 'published'
      GROUP BY a.id, at.title, at.body, ma.url, a.created_at, a.updated_at
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
      image_url: article.image_url || null,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
      tags: article.tags_codes ? article.tags_codes.split(',') : [],
      tags_names: article.tags_names ? article.tags_names.split(',') : [],
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
    const [articleRows] = await query(
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
 * POST /api/articles
 * Create a new (published) article with English translation, optional image
 *
 * Request Body:
 * {
 *   "title": "string (required)",
 *   "content": "string (required)",
 *   "image_url": "string (optional)",
 *   "category_id": "integer (optional)",
 *   "category_code": "string (optional, e.g. 'general'); used if category_id not provided"
 * }
 *
 * Response: Created article object
 */
router.post("/", authenticate, async (req, res) => {
  // Permissions: admin/editor only
  try {
    const { title, content, image_url, category_id, category_code, language_code, tags } = req.body; // Added language_code and tags

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

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


      // Optional image: keep media_assets.id == articleId for 1:1
      if (image_url && image_url.trim().length > 0) {
        const mime = mimeFromUrl(image_url);
        await connection.execute(
          "INSERT INTO media_assets (id, type, url, mime_type, created_at) VALUES (?, ?, ?, ?, NOW())",
          [articleId, "image", image_url.trim(), mime]
        );
      }

      await connection.commit();

      res.status(201).json({
        id: String(articleId),
        title,
        content,
        image_url: image_url?.trim() || null,
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
 *   "image_url": "string (optional)"
 * }
 *
 * Response: Updated article object
 */
router.put("/:id", authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { title, content, image_url, language_code, tags } = req.body; // Added language_code and tags

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    if (req.user.role !== "admin" && req.user.role !== "editor") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

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

      // Update / upsert image
      if (image_url && image_url.trim().length > 0) {
        const mime = mimeFromUrl(image_url);
        const [mediaRows] = await connection.execute(
          "SELECT id FROM media_assets WHERE id = ?",
          [id]
        );

        if (Array.isArray(mediaRows) && mediaRows.length > 0) {
          await connection.execute(
            "UPDATE media_assets SET url = ?, mime_type = ? WHERE id = ?",
            [image_url.trim(), mime, id]
          );
        } else {
          await connection.execute(
            "INSERT INTO media_assets (id, type, url, mime_type, created_at) VALUES (?, ?, ?, ?, NOW())",
            [id, "image", image_url.trim(), mime]
          );
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
        image_url: image_url?.trim() || null,
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
      await connection.execute("DELETE FROM media_assets WHERE id = ?", [id]);
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
