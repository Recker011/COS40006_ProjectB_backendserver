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
- **Response**: Same structure as list endpoint

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