# API Documentation
**Authors:** Thilina Randew Kumarasinghe, Nikitha Vicum Bamunuarachchige


## 1. Introduction

This document provides a comprehensive reference for the RESTful API of the COS40006 Project B Backend Server. It is intended for developers who will be building client applications that interact with this API.

### 1.1. Base URL

All API endpoints are relative to the following base URL:

```
http://localhost:3000/api
```

### 1.2. Authentication

Most endpoints require a JSON Web Token (JWT) for authentication. To authenticate, include the token in the `Authorization` header of your request:

```
Authorization: Bearer <your_jwt_token>
```

Tokens can be obtained by using the `POST /auth/login` endpoint.

### 1.3. Roles and Permissions

-   **Admin:** Full access to all endpoints, including user management and system-wide settings.
-   **Editor:** Can create, edit, and manage articles, tags, and categories.
-   **Reader:** Can view public content and manage their own profile.

---

## 2. Endpoints

### 2.1. Health Check

#### GET /health

-   **Description:** Checks the health of the server and its database connection.
-   **Authentication:** None required.
-   **Success Response (200 OK):**
    ```json
    {
      "ok": true,
      "time": "2025-08-16T05:25:00.000Z",
      "uptimeSec": 123.45,
      "latencyMs": 10,
      "db": {
        "ok": true,
        "version": "8.0.26"
      }
    }
    ```

### 2.2. Admin

#### GET /admin/stats

-   **Description:** Retrieves system-wide statistics.
-   **Authentication:** Admin role required.
-   **Success Response (200 OK):**
    ```json
    {
      "ok": true,
      "stats": { ... }
    }
    ```

#### GET /admin/users/inactive

-   **Description:** Retrieves a list of all inactive users.
-   **Authentication:** Admin role required.
-   **Success Response (200 OK):**
    ```json
    {
      "ok": true,
      "users": [ ... ]
    }
    ```

#### GET /admin/content/orphaned

-   **Description:** Retrieves lists of orphaned content in the system.
-   **Authentication:** Admin role required.
-   **Success Response (200 OK):**
    ```json
    {
        "ok": true,
        "orphanedContent": { ... }
    }
    ```

#### POST /admin/cleanup

-   **Description:** Cleans up orphaned data in the system.
-   **Authentication:** Admin role required.
-   **Success Response (200 OK):**
    ```json
    {
      "ok": true,
      "message": "Orphaned data cleaned up successfully",
      "cleanupStats": { ... }
    }
    ```

### 2.3. Authentication

#### POST /auth/login

-   **Description:** Authenticates a user and returns a JWT.
-   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "user_password"
    }
    ```
-   **Success Response (200 OK):**
    ```json
    {
      "ok": true,
      "user": { ... },
      "token": "jwt_token_string",
      "expiresIn": 86400
    }
    ```

#### POST /auth/register

-   **Description:** Registers a new user.
-   **Request Body:**
    ```json
    {
      "email": "newuser@example.com",
      "password": "new_user_password",
      "displayName": "New User"
    }
    ```
-   **Success Response (201 Created):**
    ```json
    {
      "ok": true,
      "user": { ... },
      "token": "jwt_token_string",
      "expiresIn": 86400
    }
    ```

#### POST /auth/logout

-   **Description:** Logs out the user. This is a client-side action; the server response is a confirmation.
-   **Authentication:** JWT required.
-   **Success Response (200 OK):**
    ```json
    {
        "ok": true,
        "message": "Logged out successfully. Please clear your token on the client side."
    }
    ```

#### GET /auth/profile

-   **Description:** Retrieves the profile of the authenticated user.
-   **Authentication:** JWT required.
-   **Success Response (200 OK):**
    ```json
    {
        "ok": true,
        "user": { ... }
    }
    ```

#### PUT /auth/profile

-   **Description:** Updates the authenticated user's profile.
-   **Authentication:** JWT required.
-   **Request Body:**
    ```json
    {
      "display_name": "NewDisplayName"
    }
    ```
-   **Success Response (200 OK):**
    ```json
    {
      "ok": true,
      "message": "Profile updated successfully",
      "user": { ... }
    }
    ```

#### PUT /auth/password

-   **Description:** Changes the authenticated user's password.
-   **Authentication:** JWT required.
-   **Request Body:**
    ```json
    {
      "oldPassword": "current_password",
      "newPassword": "new_secure_password",
      "confirmNewPassword": "new_secure_password"
    }
    ```
-   **Success Response (200 OK):**
    ```json
    {
      "ok": true,
      "message": "Password updated successfully."
    }
    ```

### 2.4. User Management

-   **GET /users:** Lists all active users (Admin only).
-   **GET /users/stats:** Retrieves user statistics (Admin only).
-   **GET /users/:id:** Retrieves a specific user's details (Admin/Editor).
-   **PUT /users/:id:** Updates a user's details (Admin only).
-   **PUT /users/:id/activate:** Activates or deactivates a user (Admin only).
-   **DELETE /users/:id:** Soft-deletes a user (Admin only).

### 2.5. Article Management

#### GET /articles

-   **Description:** Lists or searches for published articles. Supports filtering by language and tag.
-   **Query Parameters:** `search`, `lang`, `tag`.

#### GET /articles/drafts

-   **Description:** Lists draft articles. Admins/Editors see all drafts; Readers see their own.
-   **Authentication:** JWT required.

#### GET /articles/:id

-   **Description:** Retrieves a single published article.
-   **Query Parameters:** `lang`.

#### POST /articles

-   **Description:** Creates a new article.
-   **Authentication:** Admin/Editor role required.

#### PUT /articles/:id

-   **Description:** Updates an existing article.
-   **Authentication:** Admin/Editor role required.

#### DELETE /articles/:id

-   **Description:** Deletes an article.
-   **Authentication:** Admin/Editor role required.

#### PUT /articles/:id/status

-   **Description:** Changes an article's status (`draft`, `published`, `hidden`).
-   **Authentication:** Admin/Editor role required.

#### POST /articles/:id/duplicate

-   **Description:** Duplicates an article.
-   **Authentication:** Admin/Editor role required.

### 2.6. Article Translations

-   **GET /articles/:id/translations:** Gets all published translations for an article.
-   **POST /articles/:id/translations:** Adds a new translation to an article (Admin/Editor).
-   **PUT /articles/:id/translations/:lang:** Updates a specific language translation (Admin/Editor).
-   **DELETE /articles/:id/translations/:lang:** Deletes a translation (Admin/Editor).

### 2.7. Comments

-   **GET /articles/:id/comments:** Lists all comments for a specific article.
-   **POST /articles/:id/comments:** Creates a new comment on an article (Authenticated users).
-   **PUT /articles/comments/:id:** Edits a comment (Admin only).
-   **DELETE /articles/comments/:id:** Deletes a comment (Admin only).

### 2.8. Categories

-   **GET /categories:** Lists all categories.
-   **GET /categories/:id:** Retrieves a specific category.
-   **POST /categories:** Creates a new category (Admin/Editor).
-   **PUT /categories/:id:** Updates a category (Admin/Editor).
-   **DELETE /categories/:id:** Deletes a category (Admin/Editor).
-   **GET /categories/:id/articles:** Lists all articles in a specific category.

### 2.9. Tags

-   **GET /tags:** Lists all tags.
-   **GET /tags/popular:** Retrieves a list of popular tags.
-   **GET /tags/:code:** Retrieves a specific tag by its code.
-   **POST /tags:** Creates a new tag (Admin/Editor).
-   **PUT /tags/:code:** Updates a tag (Admin/Editor).
-   **DELETE /tags/:code:** Deletes a tag (Admin/Editor).
-   **GET /tags/:id/articles:** Lists all articles with a specific tag.

### 2.10. Search

-   **GET /search:** Performs a global search across articles, categories, and tags.
-   **GET /search/suggestions:** Provides autocomplete suggestions for search queries.

### 2.11. Article Utilities
-   **GET /articles/recent:** Lists recent articles from the last 7 or 30 days.
-   **GET /articles/by-author/:userId:** Retrieves articles by a specific author.
-   **GET /articles/tags/lang/:langCode:** Lists articles grouped by tag for a specific language.

### 2.11. Translations

-   **GET /translations/languages:** Retrieves a list of available languages.
-   **GET /translations/missing:** Retrieves a list of articles missing translations.
-   **GET /translations/status:** Retrieves statistics about translation completion.


-   **Error Response (400 Bad Request):**
    ```json
    {
        "ok": false,
        "error": "Email and password are required"
    }
    ```
-   **Error Response (401 Unauthorized):**
    ```json
    {
        "ok": false,
        "error": "Invalid credentials"
    }
    ```

#### GET /articles
-   **Description:** Retrieves a list of all published articles. Articles can be filtered by language, tag, or a search term.
-   **Authentication:** None required.
-   **Query Parameters:**
    -   `lang` (optional): The language of the articles to retrieve. Can be `en` (English) or `bn` (Bengali). Defaults to `en`.
    -   `tag` (optional): The category of the articles to retrieve.
    -   `search` (optional): A search term to filter articles by title or content.
-   **Success Response (200 OK):**
    ```json
    [
        {
            "id": "1",
            "title": "Example Article Title",
            "content": "This is the content of the article.",
            "created_at": "2025-10-21T00:20:32.735Z",
            "updated_at": "2025-10-21T00:20:32.735Z",
            "tags": ["tech", "news"],
            "tags_names": ["Technology", "News"],
            "media_urls": ["http://example.com/image.jpg"],
            "image_urls": ["http://example.com/image.jpg"],
            "video_urls": []
        }
    ]
    ```

#### GET /articles/:id
-   **Description:** Retrieves a single published article by its ID.
-   **Authentication:** None required.
-   **URL Parameters:**
    -   `id` (required): The ID of the article to retrieve.
-   **Query Parameters:**
    -   `lang` (optional): The language of the article to retrieve. Can be `en` or `bn`. Defaults to `en`.
-   **Success Response (200 OK):**
    ```json
    {
        "id": "1",
        "title": "Example Article Title",
        "content": "This is the content of the article.",
        "created_at": "2025-10-21T00:20:32.735Z",
        "updated_at": "2025-10-21T00:20:32.735Z",
        "tags": ["tech", "news"],
        "tags_names": ["Technology", "News"],
        "media_urls": ["http://example.com/image.jpg"],
        "image_urls": ["http://example.com/image.jpg"],
        "video_urls": []
    }
    ```
-   **Error Response (404 Not Found):**
    ```json
    {
        "error": "Article not found in the requested language"
    }
    ```

#### POST /articles
-   **Description:** Creates a new article. By default, the article is created as published.
-   **Authentication:** `Admin` or `Editor` role required.
-   **Request Body:**
    ```json
    {
        "title": "New Article Title",
        "content": "Content of the new article.",
        "media_urls": ["http://example.com/image.jpg"],
        "category_id": 1,
        "tags": ["new-tag", "featured"]
    }
    ```
-   **Success Response (201 Created):**
    ```json
    {
        "id": "2",
        "title": "New Article Title",
        "content": "Content of the new article.",
        "media_urls": ["http://example.com/image.jpg"],
        "image_urls": ["http://example.com/image.jpg"],
        "video_urls": [],
        "language_code": "en",
        "tags": ["new-tag", "featured"],
        "created_at": "2025-10-21T00:20:32.735Z",
        "updated_at": "2025-10-21T00:20:32.735Z"
    }
    ```

#### PUT /articles/:id
-   **Description:** Updates an existing article.
-   **Authentication:** `Admin` or `Editor` role required.
-   **URL Parameters:**
    -   `id` (required): The ID of the article to update.
-   **Request Body:**
    ```json
    {
        "title": "Updated Article Title",
        "content": "Updated content of the article.",
        "media_urls": ["http://example.com/new_image.jpg"],
        "tags": ["updated-tag"]
    }
    ```
-   **Success Response (200 OK):**
    ```json
    {
        "id": "1",
        "title": "Updated Article Title",
        "content": "Updated content of the article.",
        "media_urls": ["http://example.com/new_image.jpg"],
        "image_urls": ["http://example.com/new_image.jpg"],
        "video_urls": [],
        "language_code": "en",
        "tags": ["updated-tag"],
        "created_at": "2025-10-21T00:20:32.735Z",
        "updated_at": "2025-10-21T00:20:32.735Z"
    }
    ```
-   **Error Response (404 Not Found):**
    ```json
    {
        "error": "Published article not found"
    }
    ```

#### DELETE /articles/:id
-   **Description:** Deletes an article.
-   **Authentication:** `Admin` or `Editor` role required.
-   **URL Parameters:**
    -   `id` (required): The ID of the article to delete.
-   **Success Response (204 No Content):** The server returns an empty response.
-   **Error Response (404 Not Found):**
    ```json
    {
        "error": "Published article not found"
    }
    ```

### 2.6. Article Translations

#### PUT /articles/:id/translations/:lang
-   **Description:** Updates a specific language translation for an article.
-   **Authentication:** `Admin` or `Editor` role required.
-   **URL Parameters:**
    -   `id` (required): The ID of the article.
    -   `lang` (required): The language code of the translation to update (`en` or `bn`).
-   **Request Body:**
    ```json
    {
        "title": "Updated Translated Title",
        "content": "Updated translated content.",
        "excerpt": "Updated translated excerpt."
    }
    ```
-   **Success Response (200 OK):**
    ```json
    {
        "ok": true,
        "article_id": "1",
        "language_code": "bn",
        "title": "Updated Translated Title",
        "slug": "updated-translated-title-bn",
        "excerpt": "Updated translated excerpt.",
        "body": "Updated translated content.",
        "updated_at": "2025-10-21T00:20:32.735Z"
    }
    ```
-   **Error Response (404 Not Found):**
    ```json
    {
        "error": "Translation not found for specified language"
    }
    ```

### 2.7. Comments

#### POST /articles/:articleId/comments
-   **Description:** Adds a new comment to an article.
-   **Authentication:** Any authenticated user.
-   **URL Parameters:**
    -   `articleId` (required): The ID of the article to comment on.
-   **Request Body:**
    ```json
    {
        "body": "This is a new comment."
    }
    ```
-   **Success Response (201 Created):**
    ```json
    {
        "id": "3",
        "article_id": "1",
        "user_id": "2",
        "author_display_name": "Commenter Name",
        "body": "This is a new comment.",
        "created_at": "2025-10-21T00:20:32.735Z",
        "updated_at": "2025-10-21T00:20:32.735Z",
        "edited_at": null,
        "edited_by_user_id": null,
        "deleted_at": null,
        "deleted_by_user_id": null
    }
    ```
-   **Error Response (404 Not Found):**
    ```json
    {
        "error": "Article not found or not published"
    }
    ```

#### DELETE /articles/comments/:commentId
-   **Description:** Deletes a comment. This is a soft delete.
-   **Authentication:** `Admin` role required.
-   **URL Parameters:**
    -   `commentId` (required): The ID of the comment to delete.
-   **Success Response (204 No Content):** The server returns an empty response.
-   **Error Response (404 Not Found):**
    ```json
    {
        "error": "Comment not found or already deleted"
    }
    ```
