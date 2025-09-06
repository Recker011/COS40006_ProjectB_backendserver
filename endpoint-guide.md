## API Endpoints

### Health Check
- **Endpoint**: `/api/health`
- **Method**: GET
- **Description**: Returns server uptime and database status
- **Response**: JSON object with server and database information

### Authentication
#### Login
- **Endpoint**: `/api/auth/login`
- **Method**: POST
- **Description**: Authenticate user with email and password
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "user_password"
}
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "reader"
  },
  "token": "jwt_token_string",
  "expiresIn": 86400
}
```
- **Error Responses**:
  - `400 Bad Request`: Missing email or password
  - `401 Unauthorized`: Invalid credentials
  - `500 Internal Server Error`: Server processing error

#### Change Password
- **Endpoint**: `/api/auth/password`
- **Method**: PUT
- **Description**: Allows an authenticated user to change their password.
- **Authentication:** Requires a valid JWT token in the `Authorization` header.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Request Body**:
```json
{
  "oldPassword": "current_password",
  "newPassword": "new_secure_password",
  "confirmNewPassword": "new_secure_password"
}
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "message": "Password updated successfully."
}
```
- **Error Responses**:
  - `400 Bad Request`: All password fields are required, New passwords do not match, New password must be at least 8 characters long, New password cannot be the same as the old password.
  - `401 Unauthorized`: Access token required, Invalid token, Token expired, Invalid old password.
  - `404 Not Found`: User not found (unlikely if authenticated).
  - `500 Internal Server Error`: Server processing error.

#### Register
- **Endpoint**: `/api/auth/register`
- **Method**: POST
- **Description**: Register a new user with email, password, and display name
- **Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "new_user_password",
  "displayName": "New User"
}
```
- **Success Response (201 Created)**:
```json
{
  "ok": true,
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "displayName": "New User",
    "role": "reader"
  },
  "token": "jwt_token_string",
  "expiresIn": 86400
}
```
- **Error Responses**:
  - `400 Bad Request`: Missing email, password, or displayName
  - `409 Conflict`: Email already registered
  - `500 Internal Server Error`: Server processing error

#### Logout
- **Endpoint**: `/api/auth/logout`
- **Method**: POST
- **Description**: Logs out the current user by instructing the client to clear its JWT token. This is a client-side token invalidation.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "message": "Logged out successfully. Please clear your token on the client side."
}
```
- **Error Responses**:
  - `500 Internal Server Error`: Server processing error

#### Get User Profile
- **Endpoint**: `/api/auth/profile`
- **Method**: GET
- **Description**: Retrieves the profile information of the currently authenticated user.
- **Authentication:** Requires a valid JWT token in the `Authorization` header.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "reader"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Access token required, Invalid token, or Token expired
  - `500 Internal Server Error`: Server processing error

#### Update User Profile
- **Endpoint**: `/api/auth/profile`
- **Method**: PUT
- **Description**: Updates the display name of the currently authenticated user.
- **Authentication:** Requires a valid JWT token in the `Authorization` header.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Request Body**:
```json
{
  "display_name": "NewDisplayName"
}
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "NewDisplayName",
    "role": "reader"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid input (e.g., display_name is missing, empty, too short, or too long)
  - `401 Unauthorized`: Access token required, Invalid token, or Token expired
  - `500 Internal Server Error`: Server processing error

### User Management
#### List All Users
- **Endpoint**: `/api/users`
- **Method**: GET
- **Description**: Retrieves a list of all active users. This endpoint is restricted to admin users only.
- **Authentication:** Requires a valid JWT token in the `Authorization` header. User must have 'admin' role.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "users": [
    {
      "id": 1,
      "email": "admin@example.com",
      "displayName": "Admin User",
      "role": "admin",
      "createdAt": "2023-01-01T10:00:00Z",
      "updatedAt": "2023-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "email": "user@example.com",
      "displayName": "Regular User",
      "role": "reader",
      "createdAt": "2023-01-02T11:00:00Z",
      "updatedAt": "2023-01-02T11:00:00Z"
    }
  ]
}
```
- **Error Responses**:
  - `401 Unauthorized`: Access token required, Invalid token, or Token expired
  - `403 Forbidden`: Insufficient permissions (user is not an admin)
  - `500 Internal Server Error`: Server processing error

#### Get Specific User Details
- **Endpoint**: `/api/users/:id`
- **Method**: GET
- **Description**: Retrieves details for a specific user by their ID. Accessible by 'admin' and 'editor' roles.
- **Authentication:** Requires a valid JWT token in the `Authorization` header. User must have 'admin' or 'editor' role.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Path Parameters**:
  - `id`: The ID of the user to retrieve.
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "displayName": "Admin User",
    "role": "admin",
    "createdAt": "2023-01-01T10:00:00Z",
    "updatedAt": "2023-01-01T10:00:00Z"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Access token required, Invalid token, or Token expired
  - `403 Forbidden`: Insufficient permissions (user is not an admin or editor)
  - `404 Not Found`: User not found or inactive
  - `500 Internal Server Error`: Server processing error

#### Update User
- **Endpoint**: `/api/users/:id`
- **Method**: PUT
- **Description**: Updates the details of a specific user by their ID. Only accessible by 'admin' role.
- **Authentication:** Requires a valid JWT token in the `Authorization` header. User must have 'admin' role.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Path Parameters**:
  - `id`: The ID of the user to update.
- **Request Body**:
```json
{
  "displayName": "Updated Admin Name",
  "email": "updated_admin@example.com",
  "role": "editor"
}
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "message": "User updated successfully"
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid input (e.g., missing fields, invalid role)
  - `401 Unauthorized`: Access token required, Invalid token, or Token expired
  - `403 Forbidden`: Insufficient permissions (user is not an admin)
  - `404 Not Found`: User not found or inactive
  - `500 Internal Server Error`: Server processing error

#### Activate/Deactivate User
- **Endpoint**: `/api/users/:id/activate`
- **Method**: PUT
- **Description**: Activates or deactivates a user by their ID. Only accessible by 'admin' role.
- **Authentication:** Requires a valid JWT token in the `Authorization` header. User must have 'admin' role.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Path Parameters**:
  - `id`: The ID of the user to activate/deactivate.
- **Request Body**:
```json
{
  "isActive": true
}
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "message": "User activated successfully"
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid input (e.g., `isActive` is not a boolean)
  - `401 Unauthorized`: Access token required, Invalid token, or Token expired
  - `403 Forbidden`: Insufficient permissions (user is not an admin)
  - `404 Not Found`: User not found
  - `500 Internal Server Error`: Server processing error

#### Soft Delete User
- **Endpoint**: `/api/users/:id`
- **Method**: DELETE
- **Description**: Soft deletes a user by setting their `is_active` status to `0`. Only accessible by 'admin' role.
- **Authentication:** Requires a valid JWT token in the `Authorization` header. User must have 'admin' role.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Path Parameters**:
  - `id`: The ID of the user to soft delete.
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "message": "User soft-deleted successfully"
}
```
- **Error Responses**:
  - `401 Unauthorized`: Access token required, Invalid token, or Token expired
  - `403 Forbidden`: Insufficient permissions (user is not an admin)
  - `404 Not Found`: User not found or already deleted
  - `500 Internal Server Error`: Server processing error

#### Get User Statistics
- **Endpoint**: `/api/users/stats`
- **Method**: GET
- **Description**: Retrieves various statistics about users, including total users, active users, and users by role. Only accessible by 'admin' role.
- **Authentication:** Requires a valid JWT token in the `Authorization` header. User must have 'admin' role.
- **Request Headers**:
```
Authorization: Bearer <jwt_token>
```
- **Success Response (200 OK)**:
```json
{
  "ok": true,
  "stats": {
    "totalUsers": 5,
    "activeUsers": 3,
    "usersByRole": [
      { "role": "admin", "count": 1 },
      { "role": "editor", "count": 1 },
      { "role": "reader", "count": 3 }
    ]
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Access token required, Invalid token, or Token expired
  - `403 Forbidden`: Insufficient permissions (user is not an admin)
  - `500 Internal Server Error`: Server processing error

### Article Management

#### List/Search Articles
- **Endpoint**: `/api/articles`
- **Method**: GET
- **Query Params**:
  - `search`: (optional) Search term to filter articles
  - `lang`: (optional) Language code for the article content (`en` for English, `bn` for Bengali). Defaults to `en`.
  - `tag`: (optional) Tag name to filter articles (e.g., `technology`, `news`).
- **Response**:
```json
[
  {
    "id": "1",
    "title": "Sample Article",
    "content": "Article content...",
    "image_url": "https://example.com/image.jpg",
    "created_at": "2025-08-20T12:34:56.789Z",
    "updated_at": "2025-08-20T12:34:56.789Z",
    "language_code": "en",
    "tags": ["tech", "news"],
    "tags_names": ["Technology", "News"]
  }
]
```

#### Get Single Article
- **Endpoint**: `/api/articles/:id`
- **Method**: GET
- **Query Params**:
  - `lang`: (optional) Language code for the article content (`en` for English, `bn` for Bengali). Defaults to `en`.
- **Response**:
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "image_url": "string|null",
  "created_at": "ISO string",
  "updated_at": "ISO string",
  "language_code": "string",
  "tags": ["string"],
  "tags_names": ["string"]
}
```

#### Create Article (Admin/Editor only)
- **Endpoint**: `/api/articles`
- **Method**: POST
- **Request Body**:
```json
{
  "title": "New Article",
  "content": "Article content...",
  "image_url": "https://example.com/image.jpg",
  "language_code": "en", // Optional: 'en' or 'bn'. Defaults to 'en'.
  "tags": ["tech", "news"] // Optional: Array of tag slugs
}
```
- **Response**: Created article object (includes `language_code` and `tags` of the created translation)

#### Update Article (Admin/Editor only)
- **Endpoint**: `/api/articles/:id`
- **Method**: PUT
- **Request Body**:
```json
{
  "title": "Updated Title",
  "content": "New content...",
  "image_url": "https://example.com/image.jpg",
  "language_code": "en", // Optional: 'en' or 'bn'. Defaults to 'en'.
  "tags": ["tech", "news"] // Optional: Array of tag slugs
}
```
- **Response**: Updated article object (includes `language_code` and `tags` of the updated translation)

#### Delete Article (Admin/Editor only)
- **Endpoint**: `/api/articles/:id`
- **Method**: DELETE
- **Response**: 204 No Content

#### Admin Utilities
- **Endpoint**: `/api/articles` (DELETE) and `/api/articles/clear` (POST)
- **Method**: DELETE/POST
- **Description**: Clear all articles (Admin only)
- **Response**: 204 No Content

### Tag Management

#### List All Tags
- **Endpoint**: `/api/tags`
- **Method**: GET
- **Query Params**:
  - `lang`: (optional) Language code for tag names (`en` for English, `bn` for Bengali). Defaults to `en`.
- **Response**:
```json
[
  {
    "code": "string",
    "name_en": "string",
    "name_bn": "string"
  }
]
```

#### Get Single Tag by Code
- **Endpoint**: `/api/tags/:code`
- **Method**: GET
- **Response**:
```json
{
  "code": "string",
  "name_en": "string",
  "name_bn": "string"
}
```

#### Get Popular Tags
- **Endpoint**: `/api/tags/popular`
- **Method**: GET
- **Query Params**:
  - `limit`: (optional) Number of popular tags to return. Defaults to 10.
- **Response**:
```json
[
  {
    "code": "string",
    "name_en": "string",
    "name_bn": "string",
    "article_count": "number"
  }
]
```
- **Error Responses**:
  - `400 Bad Request`: If `limit` is not a positive number.
  - `500 Internal Server Error`: Server processing error.

#### Create Tag (Admin/Editor only)
- **Endpoint**: `/api/tags`
- **Method**: POST
- **Authentication**: Required (JWT Token)
- **Authorization**: User must have `role: 'admin'` or `role: 'editor'`
- **Request Body**:
```json
{
  "code": "string (required, lowercase, no spaces)",
  "name_en": "string (required)",
  "name_bn": "string (optional)"
}
```
- **Success Response (201 Created)**:
```json
{
  "code": "string",
  "name_en": "string",
  "name_bn": "string"
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid or missing `code` or `name_en`.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `403 Forbidden`: Insufficient permissions (user role is not 'admin' or 'editor').
  - `409 Conflict`: Tag with this code already exists.
  - `500 Internal Server Error`: Server processing error.

#### Update Tag (Admin/Editor only)
- **Endpoint**: `/api/tags/:code`
- **Method**: PUT
- **Authentication**: Required (JWT Token)
- **Authorization**: User must have `role: 'admin'` or `role: 'editor'`
- **Request Body**:
```json
{
  "name_en": "string (required)",
  "name_bn": "string (optional)"
}
```
- **Success Response (200 OK)**:
```json
{
  "code": "string",
  "name_en": "string",
  "name_bn": "string"
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid or missing `name_en`.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `403 Forbidden`: Insufficient permissions.
  - `404 Not Found`: Tag with the specified code does not exist.
  - `500 Internal Server Error`: Server processing error.

#### Delete Tag (Admin/Editor only)
- **Endpoint**: `/api/tags/:code`
- **Method**: DELETE
- **Authentication**: Required (JWT Token)
- **Authorization**: User must have `role: 'admin'` or `role: 'editor'`
- **Response**:
  - `204 No Content`: Tag successfully deleted.
- **Error Responses**:
  - `400 Bad Request`: Invalid tag code.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `403 Forbidden`: Insufficient permissions.
  - `404 Not Found`: Tag with the specified code does not exist.
  - `500 Internal Server Error`: Server processing error.

### Category Management

#### List All Categories
- **Endpoint**: `/api/categories`
- **Method**: GET
- **Description**: Retrieves a list of all categories with multilingual support.
- **Query Params**:
  - `lang`: (optional) Language code for category names (`en` for English, `bn` for Bengali). Defaults to `en`.
- **Response**:
```json
[
  {
    "id": "number",
    "name_en": "string",
    "name_bn": "string"
  }
]
```
- **Error Responses**:
  - `500 Internal Server Error`: Server processing error.

#### Get Specific Category by ID
- **Endpoint**: `/api/categories/:id`
- **Method**: GET
- **Description**: Retrieves details for a specific category by its ID.
- **Path Parameters**:
  - `id`: The ID of the category to retrieve.
- **Response**:
```json
{
  "id": "number",
  "name_en": "string",
  "name_bn": "string"
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid category ID.
  - `404 Not Found`: Category not found.
  - `500 Internal Server Error`: Server processing error.

### Testing Tag Endpoints

#### Create Tag (No Authentication)
To test the `POST /api/tags` endpoint without authentication (if the `authenticate` middleware is temporarily removed or for initial setup), use the `test-post-tags-no-auth.ps1` script:

```powershell
.\test-post-tags-no-auth.ps1
```

#### Create Tag (With Authentication)
To test the `POST /api/tags` endpoint with JWT authentication, use the `test-post-tags-with-auth.ps1` script. This script will first generate a JWT token and then use it in the request.

**Prerequisites:**
*   Node.js must be installed.
*   The `jsonwebtoken` npm package must be installed in your project (`npm install jsonwebtoken`).
*   Ensure your `.env` file's `JWT_SECRET` matches the one in `generate-jwt.js`.
*   Ensure `userId: 1` in `generate-jwt.js` corresponds to an active user in your database with an 'admin' or 'editor' role.

```powershell
.\test-post-tags-with-auth.ps1
```

### Testing Article Endpoints

#### List Articles
```bash
curl -X GET "http://localhost:3000/api/articles?lang=en&tag=tech"
```

A successful response will look like:
```json
[
  {
    "id": "1",
    "title": "Emergency Preparedness Guide",
    "content": "Comprehensive guide for emergency situations...",
    "image_url": "https://example.com/emergency.jpg",
    "created_at": "2025-08-20T12:34:56.789Z",
    "updated_at": "2025-08-20T12:34:56.789Z",
    "language_code": "en",
    "tags": ["tech", "news"],
    "tags_names": ["Technology", "News"]
  }
]
```

#### Search Articles
```bash
curl -X GET "http://localhost:3000/api/articles?search=emergency&lang=en&tag=tech"
```

Response structure matches list endpoint with filtered results, including `tags` and `tags_names`.

#### Get Single Article
```bash
curl -X GET "http://localhost:3000/api/articles/1?lang=bn"
```

Successful response:
```json
{
  "id": "1",
  "title": "জরুরী প্রস্তুতি নির্দেশিকা",
  "content": "জরুরী পরিস্থিতির জন্য বিস্তারিত নির্দেশিকা...",
  "image_url": "https://example.com/emergency.jpg",
  "created_at": "2025-08-20T12:34:56.789Z",
  "updated_at": "2025-08-21T07:20:30.264Z",
  "language_code": "bn",
  "tags": ["tech", "news"],
  "tags_names": ["Technology", "News"]
}
```

#### Create Article (Authenticated)
```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"নতুন নিবন্ধ","content":"নিবন্ধের বিষয়বস্তু...","image_url":"https://example.com/image.jpg","language_code":"bn","tags":["bangla","news"]}'
```

Success response (201 Created):
```json
{
  "id": "2",
  "title": "নতুন নিবন্ধ",
  "content": "নিবন্ধের বিষয়বস্তু...",
  "image_url": "https://example.com/image.jpg",
  "language_code": "bn",
  "tags": ["bangla", "news"],
  "created_at": "2025-08-21T07:20:30.264Z",
  "updated_at": "2025-08-21T07:20:30.264Z"
}
```

#### Update Article (Authenticated)
```bash
curl -X PUT http://localhost:3000/api/articles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"আপডেট করা শিরোনাম","content":"নতুন বিষয়বস্তু...","language_code":"bn","tags":["bangla","urgent"]}'
```

Success response shows updated values:
```json
{
  "id": "1",
  "title": "আপডেট করা শিরোনাম",
  "content": "নতুন বিষয়বস্তু...",
  "image_url": "https://example.com/emergency.jpg",
  "language_code": "bn",
  "tags": ["bangla", "urgent"],
  "created_at": "2025-08-20T12:34:56.789Z",
  "updated_at": "2025-08-21T07:20:30.264Z"
}
```

#### Delete Article (Authenticated)
```bash
curl -X DELETE http://localhost:3000/api/articles/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Successful deletion returns 204 No Content.

## Testing the Endpoints

### Testing the Health Endpoint
You can test the server health endpoint using CURL with the following command:

```bash
curl -X GET http://localhost:3000/api/health
```

A successful response will look like:
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

If there's an error, the response will look like:
```json
{
  "ok": false,
  "time": "2025-08-16T05:25:00.000Z",
  "uptimeSec": 123.45,
  "latencyMs": 15,
  "db": {
    "ok": false,
    "error": "Database connection failed"
  }
}
```

### Testing the Login Endpoint
You can test the login endpoint using CURL with the following command:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

A successful response will look like:
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "test@example.com",
    "displayName": "Test User",
    "role": "reader"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTcyMzY5MjgwMCwiZXhwIjoxNzIzNzc5MjAwfQ.5XQ1vZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJ",
  "expiresIn": 86400
}
```

## Frontend Implementation Guide

### React
```javascript
// Login function
const login = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (data.ok) {
      // Store token (use sessionStorage for security)
      sessionStorage.setItem('authToken', data.token);
      return data;
    }
    
    throw new Error(data.error);
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Authenticated request
const apiRequest = async (endpoint, options = {}) => {
  const token = sessionStorage.getItem('authToken');
  
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  return response.json();
};
```

### Flutter
```dart
// Login function
Future<Map<String, dynamic>> login(String email, String password) async {
  final response = await http.post(
    Uri.parse('http://localhost:3000/api/auth/login'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'email': email, 'password': password}),
  );

  final data = jsonDecode(response.body);
  
  if (data['ok']) {
    // Store token securely
    final storage = FlutterSecureStorage();
    await storage.write(key: 'authToken', value: data['token']);
  }
  
  return data;
}

// Authenticated request
Future<dynamic> apiRequest(String endpoint, {String method = 'GET', dynamic body}) async {
  final storage = FlutterSecureStorage();
  final token = await storage.read(key: 'authToken');
  
  final headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token'
  };
  
  final response = await http.request(
    Uri.parse('http://localhost:3000/api$endpoint'),
    method: method,
    headers: headers,
    body: body != null ? jsonEncode(body) : null,
  );
  
  return jsonDecode(response.body);
}