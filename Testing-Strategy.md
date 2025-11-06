# Testing Strategy Document
**Authors:** Thilina Randew Kumarasinghe, Nikitha Vicum Bamunuarachchige


## 1. Introduction

This document outlines the testing strategy for the COS40006 Project B Backend Server. It describes the current testing methodologies, the tools used, and provides recommendations for future improvements to ensure the application's quality and reliability.

## 2. Current Testing Approach

The current testing strategy relies on a suite of **manual integration tests** executed via PowerShell scripts. These scripts are located in the root directory of the project and are designed to test the functionality of various API endpoints.

This approach serves as a baseline for verifying the core features of the application, but it has limitations in terms of automation and coverage.

### 2.1. Test Scripts

The following PowerShell (`.ps1`) scripts are available for testing:

-   `test-articles.ps1`: Tests the main article endpoints.
-   `test-articles-advanced.ps1`: Tests more advanced article features.
-   `test-categories.ps1`: Tests the category management endpoints.
-   `test-tags.ps1`: Tests the tag management endpoints.
-   `test-auth.ps1` (or similar for login/profile): Tests authentication and user profile endpoints.
-   And others for specific features like search, comments, etc.

### 2.2. How to Run Tests

To run a test script, open a PowerShell terminal, navigate to the project's root directory, and execute the desired script. For example:

```powershell
.\test-articles.ps1
```

**Prerequisites:**

-   The backend server must be running.
-   The test scripts may require a valid JWT token, which can be obtained by running the login test first or by generating one manually.

## 3. Recommended Future Testing Strategy

To improve the robustness and maintainability of the application, a more structured and automated testing strategy is recommended. The following layers of testing should be implemented.

### 3.1. Unit Tests

-   **Objective:** To test individual functions and components (e.g., utility functions, individual controller methods) in isolation.
-   **Recommended Tools:**
    -   **Jest:** A popular JavaScript testing framework.
    -   **Mocha & Chai:** Another powerful combination for running tests and making assertions.
-   **Implementation:**
    -   Create a `__tests__` directory within `src`.
    -   For each component, create a corresponding `.test.js` file (e.g., `src/utils/articleUtils.test.js`).
    -   Write tests that mock any external dependencies (like database calls) to ensure the unit is tested in isolation.

### 3.2. Integration Tests

-   **Objective:** To test the interaction between different components of the application, such as the flow from a route to a controller and then to the database.
-   **Recommended Tools:**
    -   **Supertest:** A library for testing HTTP-based APIs. It allows you to make requests to your Express server without needing it to be running on a separate port.
    -   **Jest** or **Mocha** as the test runner.
-   **Implementation:**
    -   Set up a separate test database to avoid interfering with development data.
    -   Write test files (e.g., `articles.integration.test.js`) that make real API requests to the server and assert the responses and database state.

### 3.3. End-to-End (E2E) Tests

-   **Objective:** To simulate a full user workflow from the client's perspective. While this is often more relevant for frontend applications, a basic form of E2E testing for the backend would involve running a series of API calls in a sequence that mimics a real-world use case.
-   **Note:** The existing PowerShell scripts are a form of E2E testing. These could be migrated to a more robust framework if desired.

## 4. Continuous Integration (CI)

-   **Objective:** To automatically run all tests whenever new code is pushed to the repository. This helps to catch regressions and bugs early in the development process.
-   **Recommended Tools:**
    -   **GitHub Actions:** A CI/CD platform integrated directly with GitHub.
    -   **GitLab CI/CD:** A similar platform for projects hosted on GitLab.
-   **Implementation:**
    -   Create a CI pipeline configuration file (e.g., `.github/workflows/ci.yml`).
    -   Define a workflow that:
        1.  Checks out the code.
        2.  Installs dependencies (`npm install`).
        3.  Runs all tests (`npm test`).
    -   Configure the pipeline to run on every push and pull request to the main branches.

## 5. Summary of Recommendations

1.  **Adopt a Testing Framework:** Integrate Jest or Mocha as the primary testing framework.
2.  **Write Unit Tests:** Start by writing unit tests for all utility functions and controller logic.
3.  **Implement Integration Tests:** Use Supertest to create integration tests for all API endpoints, ensuring they interact correctly.
4.  **Automate with CI:** Set up a Continuous Integration pipeline using GitHub Actions or a similar tool to run tests automatically.