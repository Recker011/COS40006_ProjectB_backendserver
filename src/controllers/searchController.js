// src/controllers/searchController.js
// Global search across articles, categories, and tags (MySQL)

const { query } = require('../../db');
const { toISO } = require('../utils/articleUtils');

const ALL_TYPES = ['articles', 'categories', 'tags'];

function coerceBoolean(v, fallback = false) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  return fallback;
}

function parseCSV(value) {
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function deriveExcerpt(excerpt, body) {
  if (excerpt && typeof excerpt === 'string' && excerpt.trim().length > 0) return excerpt.trim();
  if (typeof body !== 'string' || body.length === 0) return '';
  const plain = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain.slice(0, 220);
}

function validateParams(req) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return { error: { code: 400, message: 'q is required' } };
  if (q.length > 100) return { error: { code: 400, message: 'q is too long (max 100 chars)' } };

  const lang = req.query.lang === 'bn' ? 'bn' : 'en';
  const typesParam = parseCSV(req.query.types);
  const types = typesParam.length ? typesParam : ALL_TYPES;
  for (const t of types) if (!ALL_TYPES.includes(t)) return { error: { code: 422, message: `Invalid type: ${t}` } };

  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * limit;

  const includeCounts = coerceBoolean(req.query.includeCounts, false);

  return { q, lang, types, limit, page, offset, includeCounts };
}

async function searchArticles({ q, lang, limit, offset, includeCounts }) {
  const like = `%${q.toLowerCase()}%`;

  const effectiveLimit = includeCounts ? limit : limit + 1;

  const nameCol = lang === 'bn' ? 'c.name_bn' : 'c.name_en';
  const tagNameCol = lang === 'bn' ? 't.name_bn' : 't.name_en';

  const sql = `
    SELECT
      a.id,
      at.title,
      at.slug,
      at.excerpt,
      at.body,
      a.created_at,
      a.updated_at,
      ${nameCol} AS category_name,
      GROUP_CONCAT(DISTINCT t.code ORDER BY t.code SEPARATOR ',') AS tag_codes,
      GROUP_CONCAT(DISTINCT ${tagNameCol} ORDER BY t.code SEPARATOR ',') AS tag_names
    FROM articles a
    INNER JOIN article_translations at ON a.id = at.article_id AND at.language_code = ?
    LEFT JOIN categories c ON c.id = a.category_id
    LEFT JOIN article_tags artag ON artag.article_id = a.id
    LEFT JOIN tags t ON t.id = artag.tag_id
    WHERE a.status = 'published' AND (
      LOWER(at.title)   LIKE ? OR
      LOWER(at.excerpt) LIKE ? OR
      LOWER(at.body)    LIKE ? OR
      LOWER(${nameCol}) LIKE ? OR
      LOWER(${tagNameCol}) LIKE ? OR
      LOWER(t.code) LIKE ?
    )
    GROUP BY a.id
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ? OFFSET ?
  `;

  const params = [
    lang,
    like,
    like,
    like,
    like,
    like,
    like,
    effectiveLimit,
    offset
  ];

  const { rows } = await query(sql, params);

  let items = (rows || []).map(r => ({
    id: String(r.id),
    title: r.title,
    slug: r.slug,
    excerpt: deriveExcerpt(r.excerpt, r.body),
    created_at: toISO(r.created_at),
    updated_at: toISO(r.updated_at),
    category_name: r.category_name || null,
    tag_codes: r.tag_codes ? String(r.tag_codes).split(',') : [],
    tag_names: r.tag_names ? String(r.tag_names).split(',') : []
  }));

  let total;
  let hasMore = false;
  if (!includeCounts && items.length > limit) {
    hasMore = true;
    items = items.slice(0, limit);
  }

  if (includeCounts) {
    const countSql = `
      SELECT COUNT(DISTINCT a.id) AS cnt
      FROM articles a
      INNER JOIN article_translations at ON a.id = at.article_id AND at.language_code = ?
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN article_tags artag ON artag.article_id = a.id
      LEFT JOIN tags t ON t.id = artag.tag_id
      WHERE a.status = 'published' AND (
        LOWER(at.title)   LIKE ? OR
        LOWER(at.excerpt) LIKE ? OR
        LOWER(at.body)    LIKE ? OR
        LOWER(${nameCol}) LIKE ? OR
        LOWER(${tagNameCol}) LIKE ? OR
        LOWER(t.code) LIKE ?
      )
    `;
    const { rows: cRows } = await query(countSql, [lang, like, like, like, like, like, like]);
    total = Array.isArray(cRows) && cRows.length ? Number(cRows[0].cnt) : 0;
    hasMore = (offset + items.length) < total;
  }

  return { items, total, hasMore };
}

async function searchCategories({ q, lang, limit, offset, includeCounts }) {
  const like = `%${q.toLowerCase()}%`;
  const effectiveLimit = includeCounts ? limit : limit + 1;
  const nameCol = lang === 'bn' ? 'name_bn' : 'name_en';

  const sql = `
    SELECT id, code, ${nameCol} AS name, created_at
    FROM categories
    WHERE LOWER(${nameCol}) LIKE ? OR LOWER(code) LIKE ?
    ORDER BY ${nameCol} ASC, id ASC
    LIMIT ? OFFSET ?
  `;
  const { rows } = await query(sql, [like, like, effectiveLimit, offset]);

  let items = (rows || []).map(r => ({
    id: Number(r.id),
    code: r.code,
    name: r.name,
    created_at: toISO(r.created_at)
  }));

  let total;
  let hasMore = false;
  if (!includeCounts && items.length > limit) {
    hasMore = true;
    items = items.slice(0, limit);
  }
  if (includeCounts) {
    const { rows: cRows } = await query(`SELECT COUNT(*) AS cnt FROM categories WHERE LOWER(${nameCol}) LIKE ? OR LOWER(code) LIKE ?`, [like, like]);
    total = Array.isArray(cRows) && cRows.length ? Number(cRows[0].cnt) : 0;
    hasMore = (offset + items.length) < total;
  }
  return { items, total, hasMore };
}

async function searchTags({ q, lang, limit, offset, includeCounts }) {
  const like = `%${q.toLowerCase()}%`;
  const effectiveLimit = includeCounts ? limit : limit + 1;
  const nameCol = lang === 'bn' ? 'name_bn' : 'name_en';

  const sql = `
    SELECT id, code, ${nameCol} AS name, created_at
    FROM tags
    WHERE LOWER(${nameCol}) LIKE ? OR LOWER(code) LIKE ?
    ORDER BY ${nameCol} ASC, id ASC
    LIMIT ? OFFSET ?
  `;
  const { rows } = await query(sql, [like, like, effectiveLimit, offset]);

  let items = (rows || []).map(r => ({
    id: Number(r.id),
    code: r.code,
    name: r.name,
    created_at: toISO(r.created_at)
  }));

  let total;
  let hasMore = false;
  if (!includeCounts && items.length > limit) {
    hasMore = true;
    items = items.slice(0, limit);
  }
  if (includeCounts) {
    const { rows: cRows } = await query(`SELECT COUNT(*) AS cnt FROM tags WHERE LOWER(${nameCol}) LIKE ? OR LOWER(code) LIKE ?`, [like, like]);
    total = Array.isArray(cRows) && cRows.length ? Number(cRows[0].cnt) : 0;
    hasMore = (offset + items.length) < total;
  }
  return { items, total, hasMore };
}

async function searchHandler(req, res) {
  try {
    const p = validateParams(req);
    if (p.error) return res.status(p.error.code).json({ error: p.error.message });

    const { q, lang, types, limit, page, offset, includeCounts } = p;

    const results = {
      articles: { items: [], page, limit, hasMore: false },
      categories: { items: [], page, limit, hasMore: false },
      tags: { items: [], page, limit, hasMore: false }
    };

    const tasks = [];
    if (types.includes('articles')) tasks.push((async () => {
      const r = await searchArticles({ q, lang, limit, offset, includeCounts });
      results.articles = { ...results.articles, ...r };
    })());

    if (types.includes('categories')) tasks.push((async () => {
      const r = await searchCategories({ q, lang, limit, offset, includeCounts });
      results.categories = { ...results.categories, ...r };
    })());

    if (types.includes('tags')) tasks.push((async () => {
      const r = await searchTags({ q, lang, limit, offset, includeCounts });
      results.tags = { ...results.tags, ...r };
    })());

    await Promise.all(tasks);

    return res.json({ query: q, types, page, limit, sort: 'default', results });
  } catch (err) {
    console.error('Global search error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Build a simple case-insensitive highlight string by wrapping the first match of q
 * inside <c>...</c>. Returns original text if no match or invalid inputs.
 * Example: buildHighlight('React State', 'rea') => '<c>Rea</c>ct State'
 */
function buildHighlight(text, q) {
  if (typeof text !== 'string' || typeof q !== 'string') return text;
  const src = text;
  const lower = src.toLowerCase();
  const ql = q.toLowerCase();
  const idx = lower.indexOf(ql);
  if (idx < 0) return src;
  const end = idx + ql.length;
  return src.slice(0, idx) + '<c>' + src.slice(idx, end) + '</c>' + src.slice(end);
}

/**
 * Validate params for suggestions endpoint
 * q: required (1..64), lang: 'en'|'bn' (default 'en'),
 * types: CSV subset of ['articles','categories','tags'] (default all),
 * limit: 1..20 (default 10), perTypeLimit: 1..10 (default 5),
 * includeMeta: boolean (default false)
 */
function validateSuggestionParams(req) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return { error: { code: 400, message: "Query parameter 'q' is required" } };
  if (q.length > 64) return { error: { code: 400, message: "Query parameter 'q' must be <= 64 characters" } };

  const lang = req.query.lang === 'bn' ? 'bn' : 'en';

  const ALL = ['articles', 'categories', 'tags'];
  const typesCSV = parseCSV(req.query.types);
  const types = typesCSV.length ? Array.from(new Set(typesCSV)) : ALL;
  for (const t of types) {
    if (!ALL.includes(t)) return { error: { code: 422, message: `Invalid type: ${t}` } };
  }

  const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 10));
  const perTypeLimit = Math.max(1, Math.min(10, parseInt(req.query.perTypeLimit, 10) || 5));
  const includeMeta = coerceBoolean(req.query.includeMeta, false);

  return { q, lang, types, limit, perTypeLimit, includeMeta };
}

/**
 * Suggestions endpoint handler
 * GET /api/search/suggestions
 * Returns compact autocomplete suggestions across requested types without heavy payloads.
 */
async function getSuggestions(req, res) {
  const started = Date.now();
  try {
    const p = validateSuggestionParams(req);
    if (p.error) return res.status(p.error.code).json({ error: p.error.message });

    const { q, lang, types, limit, perTypeLimit, includeMeta } = p;
    const infix = `%${q.toLowerCase()}%`;
    const prefix = `${q.toLowerCase()}%`;

    const suggestions = [];
    const perTypeCounts = { articles: 0, categories: 0, tags: 0 };

    const tasks = [];

    if (types.includes('articles')) {
      tasks.push((async () => {
        const sql = `
          SELECT
            a.id,
            at.title,
            at.slug,
            a.created_at
          FROM articles a
          INNER JOIN article_translations at
            ON a.id = at.article_id AND at.language_code = ?
          WHERE a.status = 'published'
            AND (LOWER(at.title) LIKE ? OR LOWER(at.slug) LIKE ?)
          ORDER BY
            CASE
              WHEN LOWER(at.title) LIKE ? THEN 0
              WHEN LOWER(at.slug) LIKE ? THEN 1
              WHEN LOWER(at.title) LIKE ? THEN 2
              WHEN LOWER(at.slug) LIKE ? THEN 3
              ELSE 4
            END,
            a.created_at DESC,
            a.id DESC
          LIMIT ?
        `;
        const params = [lang, infix, infix, prefix, prefix, infix, infix, perTypeLimit];
        const { rows } = await query(sql, params);
        const items = (rows || []).map(r => ({
          type: 'articles',
          id: String(r.id),
          title: r.title,
          slug: r.slug,
          highlight: {
            title: buildHighlight(r.title || '', q),
            slug: buildHighlight(r.slug || '', q)
          }
        }));
        perTypeCounts.articles = items.length;
        suggestions.push(...items);
      })());
    }

    if (types.includes('categories')) {
      tasks.push((async () => {
        const nameCol = lang === 'bn' ? 'name_bn' : 'name_en';
        const sql = `
          SELECT
            id,
            code,
            ${nameCol} AS name,
            created_at
          FROM categories
          WHERE LOWER(${nameCol}) LIKE ? OR LOWER(code) LIKE ?
          ORDER BY
            CASE
              WHEN LOWER(${nameCol}) LIKE ? THEN 0
              WHEN LOWER(code) LIKE ? THEN 1
              WHEN LOWER(${nameCol}) LIKE ? THEN 2
              WHEN LOWER(code) LIKE ? THEN 3
              ELSE 4
            END,
            created_at DESC,
            id DESC
          LIMIT ?
        `;
        const params = [infix, infix, prefix, prefix, infix, infix, perTypeLimit];
        const { rows } = await query(sql, params);
        const items = (rows || []).map(r => ({
          type: 'categories',
          id: String(r.id),
          code: r.code,
          name: r.name,
          highlight: {
            name: buildHighlight(r.name || '', q),
            code: buildHighlight(r.code || '', q)
          }
        }));
        perTypeCounts.categories = items.length;
        suggestions.push(...items);
      })());
    }

    if (types.includes('tags')) {
      tasks.push((async () => {
        const nameCol = lang === 'bn' ? 'name_bn' : 'name_en';
        const sql = `
          SELECT
            id,
            code,
            ${nameCol} AS name,
            created_at
          FROM tags
          WHERE LOWER(${nameCol}) LIKE ? OR LOWER(code) LIKE ?
          ORDER BY
            CASE
              WHEN LOWER(${nameCol}) LIKE ? THEN 0
              WHEN LOWER(code) LIKE ? THEN 1
              WHEN LOWER(${nameCol}) LIKE ? THEN 2
              WHEN LOWER(code) LIKE ? THEN 3
              ELSE 4
            END,
            created_at DESC,
            id DESC
          LIMIT ?
        `;
        const params = [infix, infix, prefix, prefix, infix, infix, perTypeLimit];
        const { rows } = await query(sql, params);
        const items = (rows || []).map(r => ({
          type: 'tags',
          id: String(r.id),
          code: r.code,
          name: r.name,
          highlight: {
            name: buildHighlight(r.name || '', q),
            code: buildHighlight(r.code || '', q)
          }
        }));
        perTypeCounts.tags = items.length;
        suggestions.push(...items);
      })());
    }

    await Promise.all(tasks);

    // Merge strategy is already prefix-first within each type; simply trim to overall limit
    const finalSuggestions = suggestions.slice(0, limit);

    const response = {
      query: q,
      types,
      suggestions: finalSuggestions
    };

    if (includeMeta) {
      response.meta = {
        tookMs: Date.now() - started,
        totalCandidates: perTypeCounts
      };
    }

    return res.json(response);
  } catch (err) {
    console.error('Suggestions error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { searchHandler, getSuggestions };
