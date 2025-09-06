## **Endpoint List**

### **1. User Management Endpoints**

**Currently available:**
- `POST /api/auth/login` ✅
- `POST /api/auth/register` ✅
- `POST /api/auth/logout` ✅
- `GET /api/auth/profile` ✅
- `PUT /api/auth/profile` ✅
- `PUT /api/auth/password` ✅
- `GET /api/users` ✅
- `GET /api/users/:id` ✅
- `PUT /api/users/:id` ✅
- `PUT /api/users/:id/activate` ✅
- `DELETE /api/users/:id` ✅
- `GET /api/users/stats` ✅

### **2. Enhanced Article Management**

**Currently available:**
- `GET /api/articles` ✅
- `GET /api/articles/:id` ✅
- `POST /api/articles` ✅
- `PUT /api/articles/:id` ✅
- `DELETE /api/articles/:id` ✅
- `DELETE /api/articles` ✅
- `POST /api/articles/clear` ✅

**Additions:**
- `GET /api/articles/drafts` - List draft articles (author/admin/editor)
- `GET /api/articles/hidden` - List hidden articles (admin/editor)
- `PUT /api/articles/:id/status` - Change article status (draft/published/hidden)
- `POST /api/articles/:id/duplicate` - Duplicate article
- `GET /api/articles/:id/translations` - Get all translations for an article
- `POST /api/articles/:id/translations` - Add new translation
- `PUT /api/articles/:id/translations/:lang` - Update specific language translation
- `DELETE /api/articles/:id/translations/:lang` - Delete translation
- `GET /api/articles/by-author/:userId` - Articles by specific author
- `GET /api/articles/recent` - Recent articles (last 7/30 days)
- `GET /api/articles/popular` - Most viewed articles (if tracking views)
- `GET /api/articles/stats` - Article statistics

### **3. Category Management**

**Additions:**
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get specific category
- `POST /api/categories` - Create new category (admin/editor)
- `PUT /api/categories/:id` - Update category (admin/editor)
- `DELETE /api/categories/:id` - Delete category (admin/editor)
- `GET /api/categories/:id/articles` - Articles in specific category
- `GET /api/categories/stats` - Category statistics (article count per category)

### **4. Tag Management**

**Currently available:**
- `GET /api/tags` ✅
- `GET /api/tags/:code` ✅
- `GET /api/tags/:id/articles` ✅
- `GET /api/tags/popular` ✅
- `POST /api/tags` ✅
- `PUT /api/tags/:code` ✅
- `DELETE /api/tags/:code` ✅

**Additions:**
- `GET /api/tags/search` - Search tags by name
- `GET /api/tags/stats` - Tag statistics

### **5. Media Asset Management**

**Additions:**
- `GET /api/media` - List all media assets
- `GET /api/media/:id` - Get specific media asset
- `POST /api/media` - Upload/create media asset
- `PUT /api/media/:id` - Update media metadata
- `DELETE /api/media/:id` - Delete media asset
- `GET /api/media/by-type/:type` - Filter by type (image/video)
- `GET /api/media/orphaned` - Media not linked to articles
- `GET /api/media/stats` - Media statistics

### **6. Search & Analytics**

**Currently available:**
- `GET /api/search` - Global search across articles, categories, tags ✅
- `GET /api/search/suggestions` - Search suggestions/autocomplete ✅

**Additions:**
- `POST /api/analytics/view` - Track article views
- `GET /api/analytics/articles/:id` - Article analytics
- `GET /api/analytics/dashboard` - Overall platform analytics
- `GET /api/analytics/trends` - Content trends

### **7. System Administration**

**Additions:**
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users/inactive` - Inactive users
- `GET /api/admin/content/orphaned` - Orphaned content
- `POST /api/admin/cleanup` - Clean up orphaned data
- `GET /api/admin/activity` - Recent system activity
- `POST /api/admin/backup` - Trigger data backup
- `GET /api/admin/health/detailed` - Detailed system health

### **8. Content Organization**

**Additions:**
- `GET /api/content/featured` - Featured content
- `GET /api/content/trending` - Trending content
- `GET /api/content/related/:id` - Related articles
- `GET /api/content/sitemap` - Site structure for SEO
- `GET /api/content/feed` - RSS/JSON feed
- `GET /api/content/timeline` - Content timeline

### **9. Multilingual Support**

**Additions:**
- `GET /api/languages` - Available languages
- `GET /api/translations/missing` - Articles missing translations
- `GET /api/translations/status` - Translation completion status

### **10. Utility & Maintenance**

**Currently available:**
- `GET /api/health` ✅
- `DELETE /api/articles` ✅
- `POST /api/articles/clear` ✅

**Additions:**
- `GET /api/status` - Detailed system status
- `POST /api/cache/clear` - Clear application cache
- `GET /api/version` - API version information
- `POST /api/maintenance/on` - Enable maintenance mode
- `POST /api/maintenance/off` - Disable maintenance mode
