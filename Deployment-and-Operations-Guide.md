# Deployment and Operations Guide
**Authors:** Thilina Randew Kumarasinghe, Nikitha Vicum Bamunuarachchige


## 1. Introduction

This guide provides instructions for deploying and operating the COS40006 Project B Backend Server. It covers environment setup, deployment procedures, and ongoing operational tasks such as monitoring and troubleshooting.

## 2. Environment Setup

### 2.1. Prerequisites

-   Node.js (version 14 or higher)
-   npm (Node Package Manager)
-   Access to the project's MySQL database (credentials and certificate)

### 2.2. Installation

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd cos40006_projectb_backendserver
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```
    This will install all production and development dependencies listed in `package.json`.

### 2.3. Environment Variables

The server requires a `.env` file in the root directory for configuration. Create this file by copying the `.env.example` file and filling in the appropriate values.

```bash
cp .env.example .env
```

The following variables must be set in the `.env` file:

-   `DB_HOST`: The hostname of the MySQL database.
-   `DB_PORT`: The port for the MySQL database (e.g., 3306).
-   `DB_NAME`: The name of the database.
-   `DB_USER`: The username for database access.
-   `DB_PASS`: The password for the database user.
-   `PORT`: The port on which the server will run (e.g., 3000).
-   `JWT_SECRET`: A secret key for signing JSON Web Tokens. This should be a long, random string.

### 2.4. Database Certificate

A CA certificate is required for a secure SSL/TLS connection to the database.

1.  Obtain the `ca.pem` file from the project administrator.
2.  Place the file in the `certs/` directory at the root of the project.

## 3. Deployment

### 3.1. Development

For development, the server should be run using the `dev` script, which uses `nodemon` to automatically restart the server on file changes.

```bash
npm run dev
```

The server will be accessible at `http://localhost:3000` (or the port specified in your `.env` file).

### 3.2. Production

For a production environment, it is recommended to use a process manager like PM2 to ensure the server runs continuously and restarts automatically if it crashes.

1.  **Install PM2 Globally:**
    ```bash
    npm install pm2 -g
    ```

2.  **Start the Application with PM2:**
    ```bash
    pm2 start src/server.js --name "cos40006-backend"
    ```

3.  **Save the Process List:**
    To ensure the application restarts on server reboot, save the PM2 process list:
    ```bash
    pm2 save
    ```

## 4. Operations

### 4.1. Monitoring

-   **Application Logs:** PM2 provides tools for log management. To view the logs for the application:
    ```bash
    pm2 logs cos40006-backend
    ```
    The application also uses `morgan` to log HTTP requests to the console, which will be captured by PM2.

-   **Server Status:** The health of the server can be checked via the `/api/health` endpoint. This can be integrated with an external monitoring service to check for uptime and database connectivity.

### 4.2. Process Management (with PM2)

-   **List Processes:**
    ```bash
    pm2 list
    ```
-   **Stop the Application:**
    ```bash
    pm2 stop cos40006-backend
    ```
-   **Restart the Application:**
    ```bash
    pm2 restart cos40006-backend
    ```
-   **Delete the Process:**
    ```bash
    pm2 delete cos40006-backend
    ```

### 4.3. Backup and Recovery

-   **Database:** The database is hosted on Aiven, which provides its own backup and recovery mechanisms. Refer to the Aiven documentation for procedures on backing up and restoring the database.
-   **Application Code:** The application code should be backed up using version control (e.g., Git). Regular pushes to a remote repository (like GitHub or GitLab) are essential.

### 4.4. Troubleshooting

-   **"Failed to connect to database":** This error usually indicates an issue with the database credentials, the `ca.pem` certificate, or network connectivity to the Aiven database. Verify the `.env` file settings and ensure the `ca.pem` file is correctly placed.
-   **"Invalid JWT Token":** This occurs when a request to a protected endpoint is made with a missing, expired, or invalid token. Ensure the client is correctly obtaining and sending the token.