// src/server.js
// Minimal Express server with routing, static index.html, CORS, and /api/health.

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");   // request logs
const { ping } = require("../db");

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(cors());          // allow cross-origin (React / RN dev servers)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "https:", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
      },
    },
  })
);
      // basic security headers
app.use(morgan("dev"));   // concise logs

// serve the dashboard at /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// example API routing pattern (need to extend later)
const api = express.Router();

// GET /api/articles - paginated, bilingual article feed
api.get("/articles", async (req, res) => {
  try {
    // Input validation
    const { lang = 'en', q, category, tag, cursor, limit = '10', include } = req.query;

    // Validate language
    if (!['en', 'bn'].includes(lang)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid language. Use 'en' or 'bn'."
      });
    }

    // Validate limit
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        ok: false,
        error: "Invalid limit. Must be between 1 and 50."
      });
    }

    // Parse include parameters
    const includeParams = include ? include.split(',') : [];
    const includeMedia = includeParams.includes('media');
    const includeTTS = includeParams.includes('tts');

    // Import database query function
    const { query } = require("../db");

    // Base query with joins
    let sql = `
      SELECT
        a.id,
        a.published_at,
        t.title,
        t.slug,
        t.excerpt,
        t.language_code,
        c.id as category_id,
        c.code as category_code,
        c.name_en as category_name_en,
        c.name_bn as category_name_bn
    `;


    // Add TTS join if requested
    if (includeTTS) {
      sql += `,
        tts.audio_url as tts_audio_url,
        tts.voice as tts_voice
      `;
    }

    sql += `
      FROM articles a
      INNER JOIN article_translations t ON t.article_id = a.id AND t.language_code = ?
      INNER JOIN categories c ON c.id = a.category_id
      LEFT JOIN article_tags at ON at.article_id = a.id
      LEFT JOIN tags tg ON tg.id = at.tag_id
    `;

    // Add media join if requested
    if (includeMedia) {
      // Since article_media table doesn't exist and there's no direct article_id in media_assets,
      // we'll skip the media join for now
      // In a real implementation, we would need a proper junction table
      sql += `
        LEFT JOIN (SELECT NULL as dummy) AS ma ON 1=0
      `;
    }

    // Add TTS join if requested
    if (includeTTS) {
      sql += `
        LEFT JOIN article_tts tts ON tts.article_id = a.id AND tts.language_code = ?
      `;
    }

    // Build WHERE clause
    const conditions = ["a.status = 'published'", 'a.published_at <= NOW()'];
    const params = [lang];

    // Add TTS language parameter if needed
    if (includeTTS) {
      params.push(lang);
    }

    // Add cursor condition if provided
    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        if (cursorData.published_at && cursorData.id) {
          conditions.push('(a.published_at < ? OR (a.published_at = ? AND a.id < ?))');
          params.push(cursorData.published_at, cursorData.published_at, cursorData.id);
        }
      } catch (err) {
        return res.status(400).json({
          ok: false,
          error: "Invalid cursor format"
        });
      }
    }

    // Add category filter
    if (category) {
      if (!isNaN(category)) {
        // category is an ID
        conditions.push('c.id = ?');
        params.push(parseInt(category, 10));
      } else {
        // category is a code
        conditions.push('c.code = ?');
        params.push(category);
      }
    }

    // Add tag filters (OR logic)
    const tagConditions = [];
    const tagParams = [];
    if (tag) {
      const tags = Array.isArray(tag) ? tag : [tag];
      tags.forEach(t => {
        if (!isNaN(t)) {
          // tag is an ID
          tagConditions.push('tg.id = ?');
          tagParams.push(parseInt(t, 10));
        } else {
          // tag is a code
          tagConditions.push('tg.code = ?');
          tagParams.push(t);
        }
      });
    }

    // Add search filter
    if (q) {
      if (lang === 'en') {
        conditions.push('(MATCH(t.title, t.excerpt, t.body) AGAINST (? IN NATURAL LANGUAGE MODE))');
        params.push(q);
      } else {
        // For Bengali, use LIKE (until proper search service is added)
        conditions.push('(t.title LIKE ? OR t.excerpt LIKE ? OR t.body LIKE ?)');
        const searchParam = `%${q}%`;
        params.push(searchParam, searchParam, searchParam);
      }
    }

    // Combine conditions
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add tag conditions with OR logic
    if (tagConditions.length > 0) {
      sql += ' AND (' + tagConditions.join(' OR ') + ')';
      params.push(...tagParams);
    }

    // Add ordering
    sql += ' ORDER BY a.published_at DESC, a.id DESC';

    // Add limit (fetch one extra to check if there's a next page)
    sql += ' LIMIT ?';
    params.push(limitNum + 1);

    // Execute query
    const rows = await query(sql, params);

    // Process results
    const items = [];
    const processedIds = new Set();

    rows.forEach(row => {
      // Skip if we've already processed this article (due to multiple media/TTS entries)
      if (processedIds.has(row.id)) {
        return;
      }
      processedIds.add(row.id);

      const item = {
        id: row.id,
        slug: row.slug,
        lang: row.language_code,
        title: row.title,
        excerpt: row.excerpt,
        published_at: row.published_at.toISOString(),
        category: {
          id: row.category_id,
          code: row.category_code,
          name: lang === 'en' ? row.category_name_en : row.category_name_bn
        },
        tags: []
      };


      // Add TTS if requested
      if (includeTTS && row.tts_audio_url) {
        item.tts = {
          audio_url: row.tts_audio_url,
          voice: row.tts_voice
        };
      }

      items.push(item);
    });

    // Determine next cursor
    let nextCursor = null;
    if (items.length > limitNum) {
      // Remove the extra item we fetched to check for next page
      items.pop();
      
      // Create cursor from the last item
      const lastItem = items[items.length - 1];
      const cursorData = {
        p: lastItem.published_at,
        i: lastItem.id
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    // Add caching headers
    res.set('Cache-Control', 'public, max-age=60');
    
    // Set ETag based on the newest published_at in the page
    if (items.length > 0) {
      const newestPublishedAt = items[0].published_at;
      res.set('ETag', `"${newestPublishedAt}"`);
    }

    // Add logging for observability
    console.log("Article feed request:", {
      lang,
      limit: limitNum,
      hasQuery: !!q,
      hasCategory: !!category,
      hasTag: !!tag,
      hasCursor: !!cursor,
      includeMedia,
      includeTTS,
      itemCount: items.length,
      nextCursor: !!nextCursor
    });

    res.json({
      ok: true,
      items,
      next_cursor: nextCursor
    });
  } catch (error) {
    console.error("Error in /api/articles:", error);
    res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});
api.get("/health", async (req, res) => {
  const started = Date.now();
  try {
    const version = await ping();
    const latencyMs = Date.now() - started;
    res.json({
      ok: true,
      time: new Date().toISOString(),
      uptimeSec: process.uptime(),
      latencyMs,
      db: { ok: true, version },
    });
  } catch (err) {
    const latencyMs = Date.now() - started;
    res.status(500).json({
      ok: false,
      time: new Date().toISOString(),
      uptimeSec: process.uptime(),
      latencyMs,
      db: { ok: false, error: String(err?.message || err) },
    });
  }
});

app.use("/api", api);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not Found" });
});

// start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
