// src/routes/articles.js
// Article management routes for the Information Dissemination Platform
// Implements full CRUD operations with multilingual support, search, and utility endpoints

const express = require("express");
const { query, pool } = require("../../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Utility: safe ISO string conversion
const toISO = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
};

// Utility: slug generator (ASCII-only, 255 chars max)
const slugify = (text, fallback = "article") => {
  try {
    if (!text || typeof text !== "string") return fallback;
    const ascii = text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const slug = ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 255);
    return slug.length > 0 ? slug : fallback;
  } catch {
    return fallback;
  }
};

// Ensure slug uniqueness within a language; optionally exclude an article_id (for updates)
async function generateUniqueSlug(connection, base, language, excludeArticleId = null) {
  const maxLen = 255;
  const baseTrim =
    (typeof base === "string" && base.trim().length > 0 ? base.trim().toLowerCase() : "article").slice(0, maxLen);
  let candidate = baseTrim.length > 0 ? baseTrim : "article";

  for (let i = 0; i < 50; i++) {
    let rows;
    if (excludeArticleId !== null && excludeArticleId !== undefined) {
      [rows] = await connection.execute(
        "SELECT 1 FROM article_translations WHERE slug = ? AND language_code = ? AND article_id <> ? LIMIT 1",
        [candidate, language, excludeArticleId]
      );
    } else {
      [rows] = await connection.execute(
        "SELECT 1 FROM article_translations WHERE slug = ? AND language_code = ? LIMIT 1",
        [candidate, language]
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return candidate;
    }

    const suffix = `-${i + 2}`;
    candidate = baseTrim.slice(0, maxLen - suffix.length) + suffix;
  }

  // Fallback: timestamp suffix
  const ts = Date.now().toString().slice(-6);
  const fallbackSuffix = `-${ts}`;
  return baseTrim.slice(0, maxLen - fallbackSuffix.length) + fallbackSuffix;
}
// Utility: derive a simple MIME type from a URL's extension (default to image/jpeg)
const mimeFromUrl = (url) => {
  try {
    if (typeof url !== "string") return "image/jpeg";
    const u = url.split("?")[0].split("#")[0].toLowerCase();
    if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
    if (u.endsWith(".png")) return "image/png";
    if (u.endsWith(".gif")) return "image/gif";
    if (u.endsWith(".webp")) return "image/webp";
    if (u.endsWith(".bmp")) return "image/bmp";
    if (u.endsWith(".svg")) return "image/svg+xml";
    return "image/jpeg";
  } catch {
    return "image/jpeg";
  }
};


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
    const { search } = req.query;

    const baseSelect = `
      SELECT
        a.id,
        at_en.title,
        at_en.body AS content,
        ma.url AS image_url,
        a.created_at,
        a.updated_at
      FROM articles a
      INNER JOIN article_translations at_en
        ON a.id = at_en.article_id AND at_en.language_code = 'en'
      LEFT JOIN media_assets ma
        ON a.id = ma.id
      WHERE a.status = 'published'
    `;

    let sql;
    let params = [];

    if (search && typeof search === "string" && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      sql = `
        ${baseSelect}
          AND (at_en.title LIKE ? OR at_en.body LIKE ?)
        ORDER BY a.created_at DESC
      `;
      params = [like, like];
    } else {
      sql = `
        ${baseSelect}
        ORDER BY a.created_at DESC
      `;
    }

    const { rows } = await query(sql, params);

    const articles = rows.map((article) => ({
      id: String(article.id),
      title: article.title,
      content: article.content,
      image_url: article.image_url || null,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
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

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

    const sql = `
      SELECT
        a.id,
        at_en.title,
        at_en.body AS content,
        ma.url AS image_url,
        a.created_at,
        a.updated_at
      FROM articles a
      INNER JOIN article_translations at_en
        ON a.id = at_en.article_id AND at_en.language_code = 'en'
      LEFT JOIN media_assets ma
        ON a.id = ma.id
      WHERE a.id = ? AND a.status = 'published'
    `;

    const { rows } = await query(sql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    const article = rows[0];
    res.json({
      id: String(article.id),
      title: article.title,
      content: article.content,
      image_url: article.image_url || null,
      created_at: toISO(article.created_at),
      updated_at: toISO(article.updated_at),
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Failed to retrieve article" });
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
    const { title, content, image_url, category_id, category_code } = req.body;

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

      // English translation (with unique slug)
      const enBaseSlug = slugify(title);
      const enSlug = await generateUniqueSlug(connection, enBaseSlug, "en");
      await connection.execute(
        "INSERT INTO article_translations (article_id, language_code, title, slug, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [articleId, "en", title, enSlug, content]
      );

      // Bangla translation placeholder (unique slug)
      const bnBaseSlug = `${enSlug}-bn`.slice(0, 255);
      const bnSlug = await generateUniqueSlug(connection, bnBaseSlug, "bn");
      await connection.execute(
        "INSERT INTO article_translations (article_id, language_code, title, slug, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [articleId, "bn", "", bnSlug, ""]
      );

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
    const { title, content, image_url } = req.body;

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
      // Update English translation (also update slug with uniqueness)
      const enBaseSlug = slugify(title);
      const enSlug = await generateUniqueSlug(connection, enBaseSlug, "en", parseInt(id, 10));
      await connection.execute(
        "UPDATE article_translations SET title = ?, slug = ?, body = ?, updated_at = NOW() WHERE article_id = ? AND language_code = ?",
        [title, enSlug, content, id, "en"]
      );

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
