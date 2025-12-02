# Health-Info Platform: Unified Frontend & Backend Documentation

**Project:** Health-Info Website  
**Frontend Framework:** React 18.2.0  
**Backend Framework:** Express.js with Node.js  
**Database:** MySQL (hosted on Aiven)  
**Last Updated:** December 2, 2025  
**Frontend Port:** 3001  
**Backend API Port:** 3000  

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Authentication & Authorization](#authentication--authorization)
9. [Data Flow](#data-flow)
10. [Multi-Language Support](#multi-language-support)
11. [Running the Application](#running-the-application)
12. [Known Issues & Limitations](#known-issues--limitations)
13. [Future Enhancements](#future-enhancements)
14. [Troubleshooting](#troubleshooting)

---

## Project Overview

Health-Info is a modern, responsive health information platform that provides articles across multiple categories (Health, Technology, Sport). The application features user authentication, multi-language support (English/Bangla), and a clean, professional UI designed for optimal user experience.

### Key Objectives
- Provide health-related articles and information
- Support bilingual content (English and Bangla)
- Implement user authentication and authorization
- Create a responsive, mobile-first design
- Deliver a seamless content management experience

### System Components
- **Frontend:** React-based single-page application (SPA)
- **Backend:** RESTful API server with Express.js
- **Database:** MySQL database with comprehensive content management schema
- **Authentication:** JWT-based authentication with role-based access control

---

## System Architecture

The Health-Info platform follows a **Layered Architecture** pattern with clear separation between frontend and backend:

### Frontend Architecture
- **Presentation Layer:** React components with styled-components and CSS modules
- **State Management:** React Context API for authentication and language
- **Service Layer:** API service modules for backend communication
- **Routing:** React Router for client-side navigation

### Backend Architecture
- **Presentation Layer (Routes):** Express.js routes handling HTTP requests
- **Business Logic Layer (Controllers):** Core application logic implementation
- **Data Access Layer:** Database module managing MySQL interactions
- **Cross-Cutting Concerns (Middleware):** Authentication, logging, security

### Data Flow
1. **Client Request:** React app sends HTTP request to backend API
2. **Route Handling:** Express routes direct request to appropriate controller
3. **Authentication:** JWT middleware verifies user identity (if required)
4. **Business Logic:** Controller processes request and interacts with database
5. **Database Query:** MySQL executes query and returns data
6. **Response:** Data flows back through layers to React frontend
7. **UI Update:** React components re-render with new data

---

## Technology Stack

### Frontend Technologies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.8.1",
  "styled-components": "^5.3.11",
  "react-icons": "^5.5.0",
  "react-scripts": "^5.0.1",
  "web-vitals": "^2.1.4"
}
```

### Backend Technologies
```json
{
  "express": "^5.1.0",
  "mysql2": "^3.14.3",
  "bcryptjs": "^3.0.2",
  "jsonwebtoken": "^9.0.2",
  "cors": "^2.8.5",
  "helmet": "^8.1.0",
  "morgan": "^1.10.1",
  "dotenv": "^17.2.1"
}
```

### Development Tools
- **Frontend:** Create React App, styled-components, React Icons
- **Backend:** Nodemon for development, ESLint for code quality
- **Database:** MySQL hosted on Aiven cloud platform
- **Authentication:** JWT tokens with bcrypt password hashing

---

## Project Structure

### Frontend Structure
```
Health-Info/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Admin/           # Admin panel components
│   │   ├── ArticleDetail/   # Article display component
│   │   ├── Footer/          # Footer component
│   │   ├── ForgotPassword/  # Password recovery
│   │   ├── Header/          # Navigation header
│   │   ├── HealthPage/      # Health category page
│   │   ├── Home/            # Homepage component
│   │   ├── LanguageToggle/  # Language switcher
│   │   ├── Login/           # Login component
│   │   ├── Register/        # Registration component
│   │   ├── SportPage/       # Sport category page
│   │   └── TechnologyPage/  # Technology category page
│   ├── contexts/
│   │   ├── AuthContext.js   # Authentication state
│   │   └── LanguageContext.js # Language state
│   ├── hooks/
│   │   ├── useTranslation.js # Translation hook
│   │   └── useSearchSuggestions.js # Search hook
│   ├── services/
│   │   ├── searchService.js # Search API calls
│   │   ├── tagService.js    # Tag API calls
│   │   ├── categoryService.js # Category API calls
│   │   └── commentsService.js # Comments API calls
│   ├── data/
│   │   ├── config.js        # Configuration
│   │   └── mockData.js      # Mock data (removed in production)
│   ├── App.js               # Main app component
│   ├── index.js             # App entry point
│   └── index.css            # Global styles
├── package.json
└── README.md
```

### Backend Structure
```
backend/
├── src/
│   ├── controllers/
│   │   ├── searchController.js  # Search logic
│   │   └── userController.js    # User management
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── admin.js             # Admin routes
│   │   ├── articles.js          # Article routes
│   │   ├── auth.js              # Authentication routes
│   │   ├── categories.js        # Category routes
│   │   ├── search.js            # Search routes
│   │   ├── tags.js              # Tag routes
│   │   ├── translations.js      # Translation routes
│   │   └── users.js             # User routes
│   ├── utils/
│   │   └── articleUtils.js      # Article utilities
│   └── server.js                # Express server setup
├── certs/
│   └── ca.pem                   # SSL certificate for Aiven
├── db.js                        # Database connection
├── package.json
└── .env.example                 # Environment variables template
```

---

## Database Schema

The MySQL database follows a relational model with comprehensive support for multilingual content:

### Core Tables

#### Users Table
Stores user account information for authentication and authorization:
- `id` (PK): Unique identifier
- `email` (UK): User email for login
- `password_hash`: Hashed password
- `display_name`: Public display name
- `role`: User role (admin, editor, reader)
- `is_active`: Account status flag
- `created_at`, `updated_at`: Timestamps
- `last_login_at`: Last login timestamp

#### Categories Table
Defines primary content taxonomy:
- `id` (PK): Unique identifier
- `code` (UK): URL-friendly code
- `name_en`: English category name
- `name_bn`: Bengali category name
- `created_at`: Creation timestamp

#### Articles Table
Core content container:
- `id` (PK): Unique identifier
- `category_id` (FK): Primary category
- `author_user_id` (FK): Article author
- `status`: Publication status (draft, published, hidden)
- `published_at`: Publication timestamp
- `created_at`, `updated_at`: Timestamps

#### Article_Translations Table
Stores language-specific content:
- `id` (PK): Unique identifier
- `article_id` (FK): Parent article
- `language_code`: Language (en, bn)
- `title`: Article title
- `slug`: URL-friendly slug
- `excerpt`: Article summary
- `body`: Full article content
- `created_at`, `updated_at`: Timestamps

#### Tags Table
Flexible content classification:
- `id` (PK): Unique identifier
- `code` (UK): URL-friendly code
- `name_en`: English tag name
- `name_bn`: Bengali tag name
- `created_at`: Creation timestamp

#### Article_Tags Table (Junction)
Many-to-many relationship between articles and tags:
- `article_id` (PK, FK): Article reference
- `tag_id` (PK, FK): Tag reference

#### Media_Assets Table
Media file registry:
- `id` (PK): Unique identifier
- `type`: Media type (image, video)
- `url` (UK): Media URL
- `url_hash`: URL hash for deduplication
- `mime_type`: File MIME type
- `uploaded_by` (FK): Uploading user
- `created_at`: Upload timestamp

#### Article_Media Table (Junction)
Many-to-many relationship between articles and media:
- `article_id` (PK, FK): Article reference
- `media_asset_id` (PK, FK): Media reference

#### Comments Table
User comments on articles:
- `id` (PK): Unique identifier
- `article_id` (FK): Commented article
- `user_id` (FK): Comment author
- `body`: Comment content
- `created_at`, `updated_at`: Timestamps
- `edited_at`: Edit timestamp
- `edited_by_user_id` (FK): Editor
- `deleted_at`: Soft delete timestamp
- `deleted_by_user_id` (FK): Deleter

---

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### POST /auth/login
Authenticates user and returns JWT token:
```json
Request: { "email": "user@example.com", "password": "password" }
Response: { 
  "ok": true, 
  "user": { "id": 1, "email": "...", "displayName": "...", "role": "..." },
  "token": "jwt_token",
  "expiresIn": 86400
}
```

#### POST /auth/register
Registers new user:
```json
Request: { "email": "new@example.com", "password": "password", "displayName": "Name" }
Response: { 
  "ok": true, 
  "user": { "id": 2, "email": "...", "displayName": "...", "role": "reader" },
  "token": "jwt_token",
  "expiresIn": 86400
}
```

#### GET /auth/profile
Gets current user profile (requires JWT):
```json
Headers: Authorization: Bearer <token>
Response: { "ok": true, "user": { "id": 1, "email": "...", "displayName": "...", "role": "..." } }
```

#### PUT /auth/profile
Updates user profile (requires JWT):
```json
Headers: Authorization: Bearer <token>
Request: { "display_name": "New Name" }
Response: { "ok": true, "message": "Profile updated", "user": {...} }
```

#### PUT /auth/password
Changes user password (requires JWT):
```json
Headers: Authorization: Bearer <token>
Request: { "oldPassword": "...", "newPassword": "...", "confirmNewPassword": "..." }
Response: { "ok": true, "message": "Password updated" }
```

### Article Endpoints

#### GET /articles/:lang
Gets published articles by language:
```json
Params: lang (en|bn)
Response: [{ "id": "1", "title": "...", "content": "...", "tags": [...], "image_url": "...", ... }]
```

#### GET /articles/:id
Gets specific article:
```json
Params: id (article ID)
Query: lang (en|bn)
Response: { "id": "1", "title": "...", "content": "...", "tags": [...], ... }
```

#### POST /articles
Creates new article (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Request: { "title": "...", "content": "...", "category_id": 1, "tags": ["tag1"], "media_urls": ["..."] }
Response: { "id": "2", "title": "...", "content": "...", ... }
```

#### PUT /articles/:id
Updates existing article (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Request: { "title": "...", "content": "...", "tags": ["tag1"] }
Response: { "id": "1", "title": "...", "content": "...", ... }
```

#### DELETE /articles/:id
Deletes article (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Response: 204 No Content
```

### Category Endpoints

#### GET /categories
Gets all categories:
```json
Query: lang (en|bn)
Response: [{ "id": 1, "name_en": "...", "name_bn": "..." }]
```

#### GET /categories/:id
Gets specific category:
```json
Params: id (category ID)
Response: { "id": 1, "name_en": "...", "name_bn": "..." }
```

#### GET /categories/:id/articles
Gets articles in category:
```json
Params: id (category ID)
Query: lang (en|bn)
Response: [{ "id": "1", "title": "...", "content": "...", ... }]
```

#### POST /categories
Creates new category (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Request: { "name_en": "...", "name_bn": "..." }
Response: { "id": 3, "name_en": "...", "name_bn": "...", "code": "..." }
```

#### PUT /categories/:id
Updates category (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Request: { "name_en": "...", "name_bn": "..." }
Response: { "id": 1, "name_en": "...", "name_bn": "...", "code": "..." }
```

#### DELETE /categories/:id
Deletes category (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Response: 204 No Content
```

### Tag Endpoints

#### GET /tags
Gets all tags:
```json
Query: lang (en|bn)
Response: [{ "id": 1, "code": "...", "name_en": "...", "name_bn": "..." }]
```

#### POST /tags
Creates new tag (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Request: { "code": "...", "name_en": "...", "name_bn": "..." }
Response: { "id": 1, "code": "...", "name_en": "...", "name_bn": "..." }
```

#### PUT /tags/:code
Updates tag (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Request: { "name_en": "...", "name_bn": "..." }
Response: { "id": 1, "code": "...", "name_en": "...", "name_bn": "..." }
```

#### DELETE /tags/:code
Deletes tag (requires Admin/Editor role):
```json
Headers: Authorization: Bearer <token>
Response: 204 No Content
```

### Search Endpoints

#### GET /search
Global search across content:
```json
Query: q (search term), lang (en|bn), types (articles,categories,tags)
Response: { "articles": [...], "categories": [...], "tags": [...] }
```

#### GET /search/suggestions
Autocomplete suggestions:
```json
Query: q (partial term), lang (en|bn), limit (max results)
Response: { "suggestions": [...] }
```

### User Management Endpoints (Admin)

#### GET /users
Lists all users (requires Admin role):
```json
Headers: Authorization: Bearer <token>
Response: [{ "id": 1, "email": "...", "displayName": "...", "role": "...", "isActive": true }]
```

#### PUT /users/:id
Updates user (requires Admin role):
```json
Headers: Authorization: Bearer <token>
Request: { "displayName": "...", "email": "...", "role": "..." }
Response: { "id": 1, "email": "...", "displayName": "...", "role": "..." }
```

#### PUT /users/:id/activate
Activates/deactivates user (requires Admin role):
```json
Headers: Authorization: Bearer <token>
Request: { "isActive": true/false }
Response: { "ok": true, "message": "User status updated" }
```

#### DELETE /users/:id
Soft deletes user (requires Admin role):
```json
Headers: Authorization: Bearer <token>
Response: 204 No Content
```

### Admin Endpoints

#### GET /admin/stats
Gets system statistics (requires Admin role):
```json
Headers: Authorization: Bearer <token>
Response: { "ok": true, "stats": { "users": 10, "articles": 25, "categories": 3 } }
```

#### GET /admin/users/inactive
Gets inactive users (requires Admin role):
```json
Headers: Authorization: Bearer <token>
Response: { "ok": true, "users": [...] }
```

#### GET /admin/content/orphaned
Gets orphaned content (requires Admin role):
```json
Headers: Authorization: Bearer <token>
Response: { "ok": true, "orphanedContent": {...} }
```

#### POST /admin/cleanup
Cleans up orphaned data (requires Admin role):
```json
Headers: Authorization: Bearer <token>
Response: { "ok": true, "message": "Cleanup completed", "cleanupStats": {...} }
```

---

## Frontend Components

### Core Components

#### App.js
Root component with routing configuration:
- Context providers (Auth, Language)
- Route definitions including admin routes
- Protected route wrapper
- Admin route wrapper with role-based access
- Conditional header rendering

#### Header Component
Navigation and user interface:
- Navigation links (Health, Technology, Sport)
- Search functionality with suggestions
- Language toggle
- Authentication buttons (Login/Logout/Sign Up)
- Mobile hamburger menu
- User state display

#### Home Component
Homepage with article display:
- Fetches articles from backend API
- Displays "Most Popular" articles
- Language-aware content loading
- Image URL resolution
- Loading and error states

#### Category Pages (HealthPage, TechnologyPage, SportPage)
Category-specific article displays:
- Category-specific article fetching
- Empty state handling
- Backend connection indicators
- Responsive layouts

#### ArticleDetail Component
Full article display:
- Complete article content
- Comments section
- Video upload functionality (protected)
- Related articles
- Social sharing buttons

### Authentication Components

#### Login Component
User authentication:
- Email/password form
- Form validation
- Error handling
- Redirect after successful login
- Backend API integration

#### Register Component
New user registration:
- Registration form
- Input validation
- Error handling
- Automatic login after registration

#### ForgotPassword Component
Password recovery:
- Email input form
- Recovery instructions
- Error handling

### Admin Components

#### AdminLayout Component
Admin interface wrapper:
- Consistent admin layout
- Admin navigation sidebar
- Responsive design

#### AdminHome Component
Admin dashboard:
- System statistics
- Article counts by category
- Quick access cards
- Overview of system content

#### AdminUsers Component
User management:
- Complete user CRUD operations
- Role-based filtering
- User activation/deactivation
- Search functionality
- Tab-based interface

#### AdminTags Component
Tag management:
- Tag CRUD operations
- Bilingual tag support
- Tag code validation
- Search and filter functionality

#### AdminCategories Component
Category management:
- Category CRUD operations
- Bilingual category support
- Category code generation
- Search functionality

#### AdminArticles Component
Article management:
- Article creation and editing
- Category and tag assignment
- Bilingual content management

### Utility Components

#### LanguageToggle Component
Language switching:
- Toggle between English and Bangla
- Visual loading indicator
- Disabled state during translation
- Tooltip with language name

#### Footer Component
Site footer:
- Consistent footer across pages
- Links and information
- Responsive design

---

## Authentication & Authorization

### Authentication Flow

1. **User Login**
   - Frontend sends credentials to `POST /api/auth/login`
   - Backend validates credentials against database
   - Backend generates JWT token with user ID
   - Backend returns token and user information
   - Frontend stores token in localStorage
   - Frontend updates AuthContext with user data

2. **Token Validation**
   - Frontend includes token in Authorization header: `Bearer <token>`
   - Backend middleware validates token on protected routes
   - Middleware extracts user ID from token
   - Middleware fetches user from database
   - Middleware attaches user to request object
   - Request proceeds to controller if valid

3. **User Logout**
   - Frontend clears token from localStorage
   - Frontend resets AuthContext
   - Optional: Frontend calls `POST /api/auth/logout` for tracking

### Authorization Roles

#### Reader (Default)
- View published articles
- Manage own profile
- Post comments
- Search content

#### Editor
- All Reader permissions
- Create and edit articles
- Manage categories and tags
- View draft articles

#### Admin
- All Editor permissions
- Manage users
- System administration
- Access admin dashboard
- Content moderation

### Frontend Authentication Implementation

#### AuthContext
Global authentication state management:
```javascript
{
  isAuthenticated: boolean,
  user: object | null,
  token: string | null
}
```

#### Protected Routes
Route guards for authenticated content:
```javascript
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" />;
};
```

#### Admin Routes
Role-based route protection:
```javascript
const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user?.role === 'admin' ? children : <Navigate to="/" />;
};
```

### Backend Authentication Implementation

#### JWT Middleware
Token verification and user attachment:
```javascript
const authenticate = async (req, res, next) => {
  // Extract token from Authorization header
  // Verify token with JWT_SECRET
  // Fetch user from database
  // Attach user to request object
  // Proceed to next middleware or controller
};
```

#### Role-Based Access Control
Permission checking middleware:
```javascript
const requireRole = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

---

## Data Flow

### Article Display Flow

1. **Frontend Request**
   - User navigates to category page
   - Component mounts and triggers data fetch
   - API call made to `GET /api/articles/:lang` or `GET /api/categories/:id/articles`

2. **Backend Processing**
   - Route handler receives request
   - Controller builds SQL query with language filter
   - Database executes query and returns article data
   - Controller formats response with image URLs and tags

3. **Frontend Rendering**
   - Component receives article data
   - Image URLs resolved for display
   - Articles rendered in responsive layout
   - Loading states cleared

### Article Creation Flow

1. **Frontend Submission**
   - User fills article creation form
   - Form validation on client side
   - API call to `POST /api/articles` with JWT token

2. **Backend Processing**
   - Authentication middleware validates token
   - Role middleware checks admin/editor permissions
   - Controller validates article data
   - Database transaction creates article and translations
   - Media assets processed and linked

3. **Frontend Response**
   - Success response with new article ID
   - User redirected to article or admin list
   - UI updated to reflect new content

### Search Flow

1. **Frontend Search**
   - User types in search box
   - Debounced search hook triggers after delay
   - API call to `GET /search/suggestions` for autocomplete

2. **Backend Search**
   - Search controller builds multi-table query
   - Full-text search across articles, categories, tags
   - Results ranked by relevance
   - Language-specific results returned

3. **Frontend Display**
   - Suggestions displayed in dropdown
   - User selects suggestion or submits search
   - Full search results displayed on search page

---

## Multi-Language Support

### Frontend Implementation

#### Language Context
Global language state management:
```javascript
{
  currentLanguage: 'en' | 'bn',
  isTranslating: boolean,
  isEnglish: boolean,
  isBangla: boolean
}
```

#### Language Toggle
Interactive language switching:
- Toggle button in header
- Language preference saved in localStorage
- Visual feedback during translation
- Automatic content reload

#### Translation Hook
DOM element reference for translation:
```javascript
const useTranslation = () => {
  // Returns ref for DOM elements
  // Handles Google Translate integration
  // Manages translation state
};
```

### Backend Implementation

#### Database Schema
Multilingual content storage:
- Separate tables for translations (article_translations)
- Language-specific fields in categories and tags
- Language code enumeration ('en', 'bn')

#### API Language Support
Language-aware endpoints:
- Language parameter in most endpoints
- Fallback to English if translation missing
- Consistent language response format

#### Content Translation
Article translation workflow:
- Create article in primary language
- Add translations via separate endpoint
- Link translations to base article
- Maintain translation status

### Translation Process

1. **Content Creation**
   - Article created with primary language content
   - Translation records created for each language
   - Language-specific fields populated

2. **Content Retrieval**
   - API requests include language parameter
   - Database queries filter by language code
   - Fallback logic for missing translations

3. **UI Translation**
   - Client-side translation for UI elements
   - Google Translate integration for dynamic content
   - Language-specific CSS for Bangla typography

---

## Running the Application

### Prerequisites
- Node.js (v14 or higher)
- MySQL database (Aiven cloud configuration)
- npm or yarn package manager

### Backend Setup

1. **Clone Repository**
```bash
git clone <backend-repository-url>
cd COS40006_ProjectB_backendserver
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
Create `.env` file:
```bash
DB_HOST=cos40006-projectb-cleaningdb-eaca.c.aivencloud.com
DB_PORT=11316
DB_USER=avnadmin
DB_PASSWORD=AVNS_aEf_73ImCqt_JMyVyAD
DB_NAME=defaultdb
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

4. **Start Backend Server**
```bash
npm start
# or for development with auto-reload:
npm run dev
```

Backend will be available at `http://localhost:3000`

### Frontend Setup

1. **Clone Repository**
```bash
git clone <frontend-repository-url>
cd Health-Info
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
Create `.env` file:
```bash
REACT_APP_API_BASE_URL=http://localhost:3000/api
```

4. **Start Frontend Server**
```bash
npm start
```

Frontend will be available at `http://localhost:3001`

### Database Setup

1. **Aiven Configuration**
   - MySQL database hosted on Aiven
   - SSL certificate in `certs/ca.pem`
   - Connection details in environment variables

2. **Schema Initialization**
   - Database schema created from documentation
   - Tables with proper relationships and indexes
   - Sample data for testing (optional)

### Verification

1. **Health Check**
```bash
curl http://localhost:3000/api/health
```

2. **Frontend Access**
   - Open browser to `http://localhost:3001`
   - Verify homepage loads with articles
   - Test language toggle functionality

3. **Admin Access**
   - Register new user or use existing admin account
   - Login and access admin panel
   - Verify user management and content creation

---

## Known Issues & Limitations

### Backend Issues

1. **Comments API**
   - Comments API not working properly
   - Comments disappear on page reload
   - Backend implementation needs investigation

2. **Media Handling**
   - Limited media upload functionality
   - No image processing or optimization
   - Media storage not fully implemented

3. **Search Performance**
   - Full-text search may be slow with large datasets
   - No search result caching
   - Limited search analytics

4. **Database Optimization**
   - Missing indexes for complex queries
   - No query optimization for large datasets
   - Limited database connection pooling

### Frontend Issues

1. **Translation Implementation**
   - Client-side translation using Google Translate
   - Translation quality may vary
   - Some UI elements marked with `data-no-translate`

2. **Audio/Video Support**
   - API to fetch video not implemented
   - Audio output issues in Bangla for some browsers
   - Limited media format support

3. **Admin Panel Limitations**
   - Cannot upload both English and Bangla articles simultaneously
   - Workflow requires separate uploads for each language
   - Limited bulk operations

4. **Performance Concerns**
   - No code splitting or lazy loading
   - Large bundle size may affect initial load
   - No image lazy loading

### Cross-Platform Issues

1. **Browser Compatibility**
   - Bangla audio playback issues in certain browsers
   - CSS Grid/Flexbox compatibility in older browsers
   - ES6+ features may need polyfills

2. **Mobile Responsiveness**
   - Touch interactions need improvement
   - Mobile menu could be enhanced
   - Performance on lower-end devices

3. **Security Considerations**
   - JWT tokens stored in localStorage
   - No token refresh mechanism
   - Limited input sanitization

---

## Future Enhancements

### Backend Improvements

1. **API Enhancements**
   - Implement comprehensive comments API
   - Add media upload and processing endpoints
   - Create advanced search with filtering
   - Add analytics and reporting endpoints

2. **Database Optimization**
   - Add proper indexing for performance
   - Implement database query optimization
   - Add connection pooling improvements
   - Consider read replicas for scaling

3. **Security Enhancements**
   - Implement token refresh mechanism
   - Add rate limiting for API endpoints
   - Implement CSRF protection
   - Add input sanitization and validation

4. **Performance Improvements**
   - Add response caching
   - Implement database query caching
   - Add API response compression
   - Consider GraphQL for efficient data fetching

### Frontend Improvements

1. **Performance Optimization**
   - Implement code splitting with React.lazy()
   - Add image lazy loading
   - Optimize bundle size
   - Add service worker for offline support

2. **Enhanced Features**
   - Add article bookmarking and favorites
   - Implement user profiles with avatars
   - Add social media integration
   - Create comment reactions and replies

3. **UX Improvements**
   - Add skeleton loaders
   - Implement infinite scroll
   - Add dark mode support
   - Improve mobile navigation

4. **Internationalization**
   - Implement robust i18n solution (react-i18next)
   - Add support for more languages
   - Implement RTL language support
   - Add date/time localization

### System Enhancements

1. **Sub-Category Implementation**
   - Add hierarchical category structure
   - Implement sub-category navigation
   - Update content organization
   - Enhance search with sub-categories

2. **Content Management**
   - Add content scheduling
   - Implement content workflow
   - Add content versioning
   - Create content analytics

3. **Admin Features**
   - Enhanced admin dashboard
   - Add audit logging
   - Implement bulk operations
   - Add import/export functionality

4. **Integration Features**
   - Add email notifications
   - Implement social sharing
   - Add RSS feed support
   - Create API for third-party integration

---

## Troubleshooting

### Common Issues

#### Backend Issues

1. **Database Connection Failed**
```bash
Error: Database connection failed
```
**Solutions:**
- Verify Aiven database credentials
- Check SSL certificate in certs/ca.pem
- Verify network connectivity
- Check database service status

2. **JWT Token Issues**
```bash
Error: Token expired or invalid
```
**Solutions:**
- Check JWT_SECRET in environment
- Verify token format in Authorization header
- Implement token refresh mechanism
- Clear localStorage and re-authenticate

3. **Port Already in Use**
```bash
Error: Port 3000 already in use
```
**Solutions:**
```bash
# Find process using port
netstat -ano | findstr :3000
# Kill process
taskkill /PID <PID> /F
# Or change port in .env
PORT=3001
```

#### Frontend Issues

1. **API Connection Failed**
```bash
Error: Failed to load articles. Please check your backend connection.
```
**Solutions:**
- Verify backend server is running
- Check REACT_APP_API_BASE_URL in .env
- Verify CORS configuration on backend
- Check network connectivity

2. **Translation Not Working**
```bash
Issue: Content not translating when language is switched
```
**Solutions:**
- Check browser console for errors
- Verify Google Translate API access
- Ensure elements have proper ref from useTranslation
- Check data-no-translate attributes

3. **Images Not Loading**
```bash
Issue: Article images showing placeholder
```
**Solutions:**
- Verify backend is serving images correctly
- Check image URL format in API response
- Verify CORS headers for image requests
- Check browser console for 404 errors

### Debug Mode

#### Backend Debugging
Enable detailed logging:
```javascript
// Add to controller
console.log('Request params:', req.params);
console.log('Request body:', req.body);
console.log('Database query:', sql);
console.log('Query results:', results);
```

#### Frontend Debugging
Enable React DevTools:
```javascript
// Add to component
useEffect(() => {
  console.log('Component State:', { loading, error, data });
}, [loading, error, data]);
```

### Performance Monitoring

#### Backend Performance
Monitor API response times:
```javascript
const startTime = Date.now();
// ... API processing
const duration = Date.now() - startTime;
console.log(`API call took ${duration}ms`);
```

#### Frontend Performance
Monitor component render times:
```javascript
const startTime = performance.now();
// ... component rendering
const endTime = performance.now();
console.log(`Component render took ${endTime - startTime}ms`);
```

### Browser DevTools

#### Chrome DevTools
- **React DevTools:** Inspect component state and props
- **Network Tab:** Monitor API calls and responses
- **Console:** Check for errors and warnings
- **Application Tab:** Inspect localStorage and session data

#### Backend Monitoring
- **Database Logs:** Monitor query performance
- **Server Logs:** Track API requests and errors
- **Performance Metrics:** Monitor memory and CPU usage
- **Error Tracking:** Implement error logging service

---

## Contact & Support

### Development Team
- **Frontend Lead:** [Frontend Team Contact]
- **Backend Lead:** Thilina Randew Kumarasinghe, Nikitha Vicum Bamunuarachchige
- **Project Manager:** [PM Contact]

### Documentation
- **API Documentation:** API-Documentation.md
- **Database Documentation:** db-documentation.md
- **System Architecture:** System-Architecture.md
- **Deployment Guide:** Deployment-and-Operations-Guide.md

### Resources
- **Frontend Repository:** [Frontend GitHub/GitLab URL]
- **Backend Repository:** [Backend GitHub/GitLab URL]
- **Staging Environment:** [Staging URL]
- **Production Environment:** [Production URL]

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | Nov 2025 | Initial unified documentation | Backend Team |
| 1.1.0 | Dec 2025 | Added comprehensive API documentation | Backend Team |
| 1.2.0 | Dec 2025 | Integrated frontend handover document | Frontend Team |

---

**Last Updated:** December 2, 2025
**Document Version:** 1.2.0
**Status:** Unified Frontend & Backend Documentation