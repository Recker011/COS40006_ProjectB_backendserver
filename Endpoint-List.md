## **Endpoint List**

### **1. User Management Endpoints**

**Currently available:**
- `POST /api/auth/login` ✅

**Additions:**
- `POST /api/auth/register` - User registration with email/password✅
- `POST /api/auth/logout` - Logout (blacklist token or clear session)✅(Goofy asf because client side token validation, but its fine because this endpoint is needed for the sake of completeness)
- `GET /api/auth/profile` - Get current user profile ✅
- `PUT /api/auth/profile` - Update user profile (display_name)✅
- `PUT /api/auth/password` - Change password ✅
- `GET /api/users` - List all users (admin only) ✅
- `GET /api/users/:id` - Get specific user details (admin/editor) ✅
- `PUT /api/users/:id` - Update user (admin only) ✅
- `PUT /api/users/:id/activate` - Activate/deactivate user (admin only) ✅
- `DELETE /api/users/:id` - Soft delete user (admin only) ✅
- `GET /api/users/stats` - User statistics (total, by role, active) ✅

### **2. Enhanced Article Management**

**Currently available:**
- `GET /api/articles` ✅
- `GET /api/articles/:id` ✅
- `POST /api/articles` ✅
- `PUT /api/articles/:id` ✅
- `DELETE /api/articles/:id` ✅

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
- `GET /api/categories` - List all categories ✅
- `GET /api/categories/:id` - Get specific category ✅
- `POST /api/categories` - Create new category (admin/editor) ✅
- `PUT /api/categories/:id` - Update category (admin/editor)
- `DELETE /api/categories/:id` - Delete category (admin/editor) ✅
- `GET /api/categories/:id/articles` - Articles in specific category
- `GET /api/categories/stats` - Category statistics (article count per category)

### **4. Tag Management**

**Additions:**
- `GET /api/tags` - List all tags✅
- `GET /api/tags/:id` - Get specific tag✅
- `POST /api/tags` - Create new tag (admin/editor)✅
- `PUT /api/tags/:id` - Update tag (admin/editor)
- `DELETE /api/tags/:id` - Delete tag (admin/editor)
- `GET /api/tags/:id/articles` - Articles with specific tag ✅
- `GET /api/tags/popular` - Most used tags ✅
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

**Additions:**
- `GET /api/search` - Global search across articles, categories, tags
- `GET /api/search/suggestions` - Search suggestions/autocomplete
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

## **Implementation Priority Recommendations**

### **High Priority (Core Functionality):**
1. User registration and profile management
2. Category management (CRUD operations)
3. Tag management (CRUD operations)
4. Media asset management
5. Enhanced article status management

### **Medium Priority (Enhanced Features):**
1. Search and analytics endpoints
2. Content organization features
3. System administration tools
4. Multilingual support enhancements

### **Low Priority (Nice to Have):**
1. Advanced analytics
2. Content recommendations
3. Backup and maintenance utilities
4. SEO-related endpoints

All these endpoints can be implemented using the existing database schema without any modifications. The schema is well-designed with proper relationships and supports multilingual content, role-based access control, and comprehensive content management.
