# System Architecture Document
**Authors:** Thilina Randew Kumarasinghe, Nikitha Vicum Bamunuarachchige

## 1. Introduction

This document provides a high-level overview of the system architecture for the COS40006 Project B Backend Server. It describes the main components, their responsibilities, and how they interact with each other. This architecture is designed to be a classic, layered (or tiered) web service architecture, which is a well-understood and common pattern for RESTful APIs.

## 2. Architectural Style

The backend server follows a **Layered Architecture** pattern. This architectural style organizes the code into distinct layers, each with a specific responsibility. This separation of concerns makes the system easier to develop, maintain, and test.

The primary layers in this application are:

1.  **Presentation Layer (Routes):** Handles HTTP requests and responses.
2.  **Business Logic Layer (Controllers):** Orchestrates application logic.
3.  **Data Access Layer (Database Module):** Manages all interactions with the database.
4.  **Cross-Cutting Concerns (Middleware):** Handles concerns that span multiple layers, such as authentication and logging.

## 3. System Components and Layers

The system is composed of three main parts: the Client, the Backend Server, and External Services.

-   **Client:** A web browser or mobile application that initiates requests to the backend.
-   **Backend Server:** An Express.js application responsible for handling requests, processing business logic, and interacting with the database. It is internally structured into several layers:
    1.  **Routes Layer:** Receives HTTP requests from the client.
    2.  **Middleware:** Intercepts requests for cross-cutting concerns like authentication.
    3.  **Controllers Layer:** Executes the core application logic.
    4.  **Data Access Layer:** Manages all communication with the database.
-   **External Services:** Includes the MySQL database hosted on Aiven, which stores all application data.

The flow is as follows: The Client sends an HTTP request to the Routes Layer. The request passes through Middleware, then to the Controllers Layer for processing. The Controllers Layer uses the Data Access Layer to execute SQL queries against the MySQL Database.

## 4. Component Descriptions

### 4.1. Routes Layer (`/src/routes`)

-   **Description:** This layer is the entry point for all incoming HTTP requests. It defines the API endpoints (e.g., `/api/articles`, `/api/users`) and maps them to the appropriate controller functions.
-   **Responsibilities:**
    -   Defining URL paths and the HTTP methods they respond to (GET, POST, PUT, DELETE).
    -   Passing requests to the middleware and then to the designated controller.
    -   Receiving processed data from the controller and sending it back as an HTTP response.

### 4.2. Middleware (`/src/middleware`)

-   **Description:** Middleware functions are executed between the request being received and the final route handler being called. They are used to implement cross-cutting concerns.
-   **Key Middleware:**
    -   `auth.js`: Implements authentication and authorization logic. It verifies JWTs and checks user roles to protect endpoints.
    -   **Express Middleware:** The server also uses standard Express middleware like `morgan` for logging, `helmet` for security headers, and `cors` for managing cross-origin requests.

### 4.3. Controllers Layer (`/src/controllers`)

-   **Description:** This layer contains the core business logic of the application. Each controller handles the logic related to a specific feature (e.g., `userController`, `searchController`).
-   **Responsibilities:**
    -   Receiving requests from the routes layer.
    -   Validating and sanitizing input data.
    -   Interacting with the Data Access Layer to fetch or update data.
    -   Implementing the application's rules and workflows.
    -   Formatting the data to be sent back in the response.

### 4.4. Data Access Layer (`db.js`)

-   **Description:** This layer abstracts all database interactions. It provides a simple, consistent interface for the rest of the application to interact with the database without needing to know the specific implementation details.
-   **Responsibilities:**
    -   Establishing and managing the connection to the MySQL database.
    -   Executing SQL queries to perform CRUD (Create, Read, Update, Delete) operations.
    -   Handling database transactions to ensure data integrity.

## 5. Data Flow

Here is the typical flow of an authenticated API request:

1.  A **client** sends an HTTP request (e.g., `GET /api/articles`) with a JWT in the `Authorization` header.
2.  The **Routes Layer** receives the request and directs it to the matching route handler.
3.  The **Authentication Middleware** intercepts the request, verifies the JWT, and attaches the authenticated user's information to the request object. If the token is invalid, it sends a `401 Unauthorized` response.
4.  The request proceeds to the **Controller**, which processes it, potentially calling the **Data Access Layer** to fetch data from the database.
5.  The **Data Access Layer** executes the necessary SQL query against the **MySQL Database**.
6.  The data is returned up through the layers, from the Data Access Layer to the Controller, and finally to the Route handler, which sends it back to the client as an HTTP response.

## 6. Technology Stack

-   **Backend Framework:** Express.js
-   **Runtime Environment:** Node.js
-   **Database:** MySQL (hosted on Aiven)
-   **Authentication:** JSON Web Tokens (JWT)
-   **Key Libraries:**
    -   `mysql2`: For database connectivity.
    -   `bcryptjs`: For password hashing.
    -   `jsonwebtoken`: For creating and verifying JWTs.
    -   `helmet`, `cors`, `morgan`: For security and logging.