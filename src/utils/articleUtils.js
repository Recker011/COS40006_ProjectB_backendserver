// src/utils/articleUtils.js

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

// Utility: Find or create tags and return their IDs
async function findOrCreateTags(connection, tagCodes, languageCode) {
  if (!Array.isArray(tagCodes) || tagCodes.length === 0) {
    return [];
  }

  const tagIds = [];
  for (const code of tagCodes) {
    const trimmedCode = code.trim().toLowerCase();
    if (!trimmedCode) continue;

    // Try to find existing tag
    const [existingTagRows] = await connection.execute(
      "SELECT id FROM tags WHERE code = ?",
      [trimmedCode]
    );

    let tagId;
    if (Array.isArray(existingTagRows) && existingTagRows.length > 0) {
      tagId = existingTagRows[0].id;
    } else {
      // Create new tag if not found
      const nameEn = trimmedCode.charAt(0).toUpperCase() + trimmedCode.slice(1);
      const nameBn = ""; // Placeholder for Bengali name
      const [insertTagResult] = await connection.execute(
        "INSERT INTO tags (code, name_en, name_bn, created_at) VALUES (?, ?, ?, NOW())",
        [trimmedCode, nameEn, nameBn]
      );
      tagId = insertTagResult.insertId;
    }
    tagIds.push(tagId);
  }
  return tagIds;
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

module.exports = {
  toISO,
  slugify,
  generateUniqueSlug,
  findOrCreateTags,
  mimeFromUrl,
};