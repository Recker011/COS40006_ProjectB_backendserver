# Database Documentation — Information Dissemination Platform (MySQL)

## Overview
A minimal, bilingual content model for web/mobile clients. Articles are language-agnostic containers; per-language text lives in `article_translations`. Media files are stored in object storage; only URLs live in DB. Optional tagging for flexible grouping.

## Relationships (at a glance)
- `articles` → `categories` (many→one)
- `articles` → `users` (author, many→one)
- `article_translations` → `articles` (many→one)
- `article_tags` ↔ (`articles`, `tags`) (many↔many)
- `comments` → `articles` (many→one)
- `comments` → `users` (author, many→one)
- `media_assets` (standalone; attach in app logic)
  
> Suggested FKs:
> `articles.category_id → categories.id`, `articles.author_user_id → users.id`,
> `article_translations.article_id → articles.id`,
> `article_tags.article_id → articles.id`, `article_tags.tag_id → tags.id`,
> `comments.article_id → articles.id`, `comments.user_id → users.id`,
> `comments.edited_by_user_id → users.id (NULLABLE)`, `comments.deleted_by_user_id → users.id (NULLABLE)`,
> `media_assets.uploaded_by → users.id`.

---

## Tables

### `users`
**Reasoning**: Authentication/authorization and attribution (article author).  
**Key**: `id` (PK)  
**Columns**: `email`, `password_hash`, `display_name`, `role ('admin'|'editor'|'reader')`, `is_active`, timestamps.  
**Notes**: `email` should be unique; use `is_active` to disable accounts without deletes.

### `categories`
**Reasoning**: Stable, flat taxonomy for browsing and filtering.  
**Key**: `id` (PK)  
**Columns**: `code`, `name_en`, `name_bn`, `created_at`.  
**Notes**: `code` should be unique and stable (safe to reference in clients).

### `articles`
**Reasoning**: Language-agnostic container holding workflow state, timing, and ownership.  
**Key**: `id` (PK)  
**Columns**: `category_id`, `author_user_id`, `status ('draft'|'published'|'hidden')`, `published_at`, timestamps.  
**Notes**: Gate public content by `status='published' AND published_at <= NOW()`.

### `article_translations`
**Reasoning**: Per-language text and routing (slugs), enabling bilingual content and search.  
**Key**: `id` (PK)  
**Columns**: `article_id`, `language_code ('en'|'bn')`, `title`, `slug`, `excerpt`, `body (LONGTEXT)`, timestamps.  
**Notes**: Recommend unique `(article_id, language_code)` and `(slug, language_code)`; add `FULLTEXT(title, excerpt, body)` for search.

### `tags`
**Reasoning**: Flexible, optional topical labels (orthogonal to categories).  
**Key**: `id` (PK)  
**Columns**: `code`, `name_en`, `name_bn`, `created_at`.  
**Notes**: `code` should be unique; keep tag set modest to avoid noise.

### `article_tags`
**Reasoning**: Junction for many-to-many `articles` ↔ `tags`.  
**Key**: Composite PK `(article_id, tag_id)`  
**Columns**: `article_id`, `tag_id`.  
**Notes**: Composite PK prevents duplicates; index `(tag_id, article_id)` for reverse lookups.

### `media_assets`
**Reasoning**: Registry of uploaded files (images/videos) with stable URLs and basic metadata.  
**Key**: `id` (PK)  
**Columns**: `type ('image'|'video')`, `url`, `url_hash (char(64))`, `mime_type`, `width`, `height`, `duration_seconds`, `alt_text_en`, `alt_text_bn`, `uploaded_by`, `created_at`.  
**Notes**: Enforce unique `url` or `url_hash` to deduplicate; `alt_text_*` supports accessibility; `uploaded_by` credits the uploader.

### `comments`
**Reasoning**: User-authored remarks on articles. Schema enforces flat comments only (no replies) by omitting any `parent_comment_id`.  
**Key**: `id` (PK)  
**Columns**: `article_id`, `user_id`, `body (TEXT)`, `created_at`, `updated_at`, `edited_at`, `edited_by_user_id`, `deleted_at`, `deleted_by_user_id`.  
**Notes**:
- Authentication required to create comments (app-level).
- Admins can edit/delete any comment and can also post comments.
- Soft delete via `deleted_at` and `deleted_by_user_id`; readers should filter `WHERE deleted_at IS NULL`.
- Suggested FKs:  
  - `comments.article_id → articles.id (ON DELETE CASCADE)`  
  - `comments.user_id → users.id (ON DELETE RESTRICT)`  
  - `comments.edited_by_user_id → users.id (ON DELETE SET NULL)`  
  - `comments.deleted_by_user_id → users.id (ON DELETE SET NULL)`
---

## Suggested Indexes & Constraints (minimal)
- `users(email)` **UNIQUE**
- `categories(code)` **UNIQUE**
- `tags(code)` **UNIQUE**
- `media_assets(url)` **UNIQUE** (or `url_hash` **UNIQUE**)
- `article_translations(article_id, language_code)` **UNIQUE**
- `article_translations(slug, language_code)` **UNIQUE**
- FULLTEXT `article_translations(title, excerpt, body)`
- `articles(status, published_at)` for public lists
- `article_tags(tag_id, article_id)` for tag→article queries
- `comments(article_id, created_at)` for fetching comments per article in chronological order
- `comments(user_id, created_at)` for user activity/history
- `comments(deleted_at)` to efficiently exclude soft-deleted comments

---

## Common Access Patterns (brief)
- **List articles**: join `articles` + `article_translations` by requested `language_code`, filter published, order by `published_at DESC`.
- **Read article**: find `article_translations` by `(slug, language_code)` and join `articles` to validate publish state.
- **Search**: FULLTEXT on `article_translations`, then join `articles` to filter publish state.
- **Tag filter**: join `article_tags` → `articles`, then join `article_translations` for titles/slugs.
- **Media**: fetch from `media_assets` by `url`/`url_hash`; attach to article in application layer or a lightweight link table if ordering is later required.
- **Comments**: list by `comments.article_id` with `deleted_at IS NULL`, order by `created_at ASC`; join `users` to display `display_name`.
