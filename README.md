# COS40006 Project B Backend Server

This is the starting point of the Express JS backend server just set up enough to start working on it

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Dependencies

This project requires the following npm packages:

### Production Dependencies
- `express` - Web framework for Node.js
- `cors` - Cross-Origin Resource Sharing middleware
- `helmet` - Security middleware
- `morgan` - HTTP request logger
- `mysql2` - MySQL client for Node.js

### Development Dependencies
- `nodemon` - Utility for automatically restarting the server when files change

## Setup Instructions

1. Clone the repository (if applicable) or navigate to the project directory

2. Install the required dependencies:
   ```bash
   npm install
   ```

3. Obtain the database certificate and database config file:
   - The `ca.pem` file is required for database connection
   - This file is not included in the repository for security reasons
   - Contact the project team on Discord to obtain the necessary certificate file
   - Place the `ca.pem` file in the `certs/` directory
   - The `db.js` file is required for database authentication
   - That too needs to be gotten from the project team on Discord, it will be available to download in the relevant text channel shortly
   - Place the `db.js` in the root folder with index.html

4. Start the server:
   ```bash
   npm start
   ```
   
   Or for development with auto-restart (recommended):
   ```bash
   npm run dev
   ```

## Accessing the Dashboard

Once the server is running, you can access the dashboard by opening your browser and navigating to:
```
http://localhost:3000
```

The dashboard will automatically poll the health endpoint every second and display server status information.

`

## Project Structure

```
.
├── src/
│   └── server.js      # Main server file
├── certs/
│   ├── ca.pem         # Database certificate (not in repo)
│   └── README.md      # Certificate instructions
├── index.html         # Dashboard frontend
├── db.js              # Database connection
├── package.json       # Project dependencies and scripts
└── README.md          # This file
```

## NPM Scripts

- `npm start` - Start the server
- `npm run dev` - Start the server with nodemon for development

## Database Configuration

The server connects to a MySQL database hosted on Aiven. The connection details are hardcoded in `db.js` for development convenience, but should be rotated for production use.

## Security

The server implements several security measures:
- CORS middleware for cross-origin requests
- Helmet middleware for secure HTTP headers
- Content Security Policy configuration
- HTTPS database connections with certificate verification
## Auth env vars

- `PORT`: The port number the server will listen on (default: 3000)
- `NODE_ENV`: The environment mode (development, production, etc.)
- `DB_HOST`: The hostname of the MySQL database server
- `DB_PORT`: The port number of the MySQL database server (default: 3306)
- `DB_USER`: The username for database authentication
- `DB_PASSWORD`: The password for database authentication
- `DB_NAME`: The name of the database to connect to
- `WEB_ORIGIN`: The exact origin URL for CORS validation (e.g., http://localhost:5173)
- `JWT_SECRET`: The secret key used to sign JWT tokens (must be long and random)
- `JWT_EXPIRES_IN`: The expiration time for JWT tokens in seconds (e.g., 3600 = 1 hour)
- `COOKIE_DOMAIN`: The domain for which the auth cookie is valid (optional, set in production)
- `COOKIE_SECURE`: Whether the auth cookie should only be sent over HTTPS (set to true in production)
## Auth quick test

To test the authentication system:

1. Create a `.env` file based on `.env.example` with your configuration:
```
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=your_password
DB_NAME=cos40006
WEB_ORIGIN=http://localhost:5173
JWT_SECRET=your_long_random_string_here
JWT_EXPIRES_IN=3600
COOKIE_DOMAIN=
COOKIE_SECURE=false
```

2. Start the server:
```bash
npm run dev
```

3. Test authentication endpoints with curl:

Login (capture cookie + token):
```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YOUR_PASSWORD"}' \
  http://localhost:3000/auth/login
```

Who am I (cookie-based):
```bash
curl -b cookies.txt http://localhost:3000/auth/me
```

Who am I (Bearer token):
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/auth/me
```

Logout (clears cookie):
```bash
curl -X POST -b cookies.txt http://localhost:3000/auth/logout -i
```

**Production notes:**
- Set `COOKIE_SECURE=true` in production
- `WEB_ORIGIN` must match the exact site origin
- HTTPS is required for secure cookies in production