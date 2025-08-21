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