## API Endpoints

### Health Check
- **Endpoint**: `/api/health`
- **Method**: GET
- **Description**: Returns server uptime and database status
- **Response**: JSON object with server and database information

### Authentication Endpoints

#### Login
- **Endpoint**: `/auth/login`
- **Method**: POST
- **Description**: Authenticate user and return JWT token in response body and HttpOnly cookie
- **Request Body**: `{"email": "user@example.com", "password": "password"}`
- **Response**:
  ```json
  {
    "token": "jwt-token-string",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "display_name": "User Name",
      "role": "reader"
    }
  }
  ```
- **Security**: Rate limited to 10 attempts per 5 minutes per IP

#### Current User
- **Endpoint**: `/auth/me`
- **Method**: GET
- **Description**: Get current authenticated user information
- **Authentication**: Requires JWT token in Authorization header or access_token cookie
- **Response**:
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "display_name": "User Name",
    "role": "reader"
  }
  ```

#### Logout
- **Endpoint**: `/auth/logout`
- **Method**: POST
- **Description**: Clear authentication cookie
- **Response**: 204 No Content

## Testing the Health Endpoint

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

## Testing Authentication Endpoints

### Login
```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YOUR_PASSWORD"}' \
  http://localhost:3000/auth/login
```

### Current User (Cookie-based)
```bash
curl -b cookies.txt http://localhost:3000/auth/me
```

### Current User (Bearer token)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/auth/me
```

### Logout
```bash
curl -X POST -b cookies.txt http://localhost:3000/auth/logout -i
```