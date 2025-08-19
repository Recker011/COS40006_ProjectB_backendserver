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