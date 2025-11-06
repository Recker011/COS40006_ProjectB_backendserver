# Project Handover Document

## 1. Introduction

**Project Name:** COS40006 Project B Backend Server
**Version:** 1.0.0
**Handover Date:** 2025-10-21
**Authors:** Thilina Randew Kumarasinghe, Nikitha Vicum Bamunuarachchige

This document provides a comprehensive handover of the backend server for COS40006 Project B. It is intended for the succeeding team who will maintain and further develop this project.

## 2. Project Overview

This project is an Express.js-based backend server that provides a RESTful API for a content management system. Key features include user authentication, article management, categories, tags, and search functionality.

## 3. Getting Started

### 3.1. Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### 3.2. Dependencies

#### Production Dependencies:
- `bcryptjs`: For hashing passwords.
- `cors`: To enable Cross-Origin Resource Sharing.
- `dotenv`: For managing environment variables.
- `express`: Web application framework.
- `helmet`: For securing HTTP headers.
- `jsonwebtoken`: For creating and verifying JSON Web Tokens.
- `morgan`: For logging HTTP requests.
- `mysql2`: MySQL client for Node.js.

#### Development Dependencies:
- `nodemon`: For automatically restarting the server during development.

### 3.3. Setup and Installation

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Database Setup:**
    - Obtain the `ca.pem` certificate file and place it in the `certs/` directory. This is required for a secure connection to the database.
    - Obtain the `db.js` file, which contains the database connection credentials, and place it in the project's root directory.
    - For security reasons, these files are not included in the repository and must be obtained from the original project team.

### 3.4. Running the Application

-   **Development Mode:**
    ```bash
    npm run dev
    ```
    This will start the server with `nodemon`, which automatically restarts on file changes. The server will be available at `http://localhost:3000`.

-   **Production Mode:**
    ```bash
    npm start
    ```

## 4. Project Structure

```
.
├── certs/
│   └── ca.pem           # Database certificate (not in repo)
├── src/
│   ├── controllers/     # Request handlers for routes
│   │   ├── searchController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── auth.js        # Authentication middleware
│   ├── routes/          # API route definitions
│   │   ├── admin.js
│   │   ├── articles.js
│   │   ├── auth.js
│   │   ├── categories.js
│   │   ├── search.js
│   │   ├── tags.js
│   │   ├── translations.js
│   │   └── users.js
│   ├── utils/
│   │   └── articleUtils.js
│   └── server.js        # Main server entry point
├── .env.example         # Example environment variables
├── db.js                # Database connection configuration (not in repo)
├── index.html           # Basic frontend for server status
├── package.json         # Project metadata and dependencies
└── README.md            # Original project README
```

## 5. API Endpoints

A detailed list of API endpoints can be found in the `endpoint-guide.md` and `Endpoint-List.md` files. These documents outline the available routes, the expected request format, and the corresponding responses.

## 6. Database

The application uses a MySQL database hosted on Aiven.

-   **Connection:** The database connection is managed by the `db.js` file and uses the `mysql2` library.
-   **Schema:** The database schema is documented in `schema.txt` and `db-documentation.md`.

## 7. Authentication and Authorization

-   **Authentication:** User authentication is handled using JSON Web Tokens (JWT). When a user logs in, a token is generated and must be included in the `Authorization` header for protected routes.
-   **Middleware:** The `src/middleware/auth.js` file contains the middleware for verifying JWTs and protecting routes.

## 8. Security Considerations

-   **CORS:** The `cors` middleware is configured to restrict requests to allowed origins.
-   **Helmet:** The `helmet` middleware is used to set various security-related HTTP headers.
-   **Password Hashing:** Passwords are hashed using `bcryptjs` before being stored in the database.
-   **Database Connection:** The connection to the database is secured using SSL/TLS encryption, requiring the `ca.pem` certificate.

## 9. Known Issues and Future Improvements

-   **Hardcoded Credentials:** The database connection details in `db.js` are hardcoded. These should be moved to environment variables for better security and flexibility.
-   **Error Handling:** While basic error handling is in place, it could be improved with a more robust and centralized error-handling mechanism.
-   **Testing:** The project has a suite of PowerShell (`.ps1`) scripts for testing various endpoints, but a more comprehensive automated testing suite (e.g., using Jest or Mocha) should be implemented.
-   **Logging:** The `morgan` logger is used for HTTP requests, but a more advanced logging solution could be integrated for better monitoring and debugging.

## 10. Contact Information

For any questions or clarifications, please contact the original project team or refer to the university's project coordinator.