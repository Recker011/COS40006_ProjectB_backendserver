# test-create-comments.ps1
# PowerShell script to test the POST /api/articles/:id/comments and DELETE /api/comments/:id endpoints
#
# PURPOSE:
# This script tests the functionality of creating comments on articles and deleting comments,
# ensuring proper authentication, authorization, and data handling.
#
# PREREQUISITES:
# 1. Start the backend server: npm start or npm run dev
# 2. Ensure the server is running on http://localhost:3000
# 3. An admin user must exist in the database (e.g., admin@example.com / admin)
#
# HOW TO USE:
# 1. Save this script in the project root directory
# 2. Open PowerShell in the project directory
# 3. Run: .\test-create-comments.ps1
#
# The script will output results for each test, showing:
# - Test name and timestamp
# - HTTP status code
# - Response body (if any)
# - Clear separation between tests

$baseUrl = "http://localhost:3000/api"
$headers = @{"Content-Type" = "application/json"}

# Function to display test results
function Write-TestResult {
    param([string]$TestName, [int]$ExpectedStatusCode, [int]$ActualStatusCode, [object]$Response, [string]$Message = "")
    $status = if ($ExpectedStatusCode -eq $ActualStatusCode) { "PASSED" } else { "FAILED" }
    $color = if ($ExpectedStatusCode -eq $ActualStatusCode) { "Green" } else { "Red" }
    
    Write-Host "--- TEST: $TestName ---" -ForegroundColor Cyan
    Write-Host "Expected Status: $ExpectedStatusCode, Actual Status: $ActualStatusCode - $status" -ForegroundColor $color
    if ($Message) {
        Write-Host "Message: $Message" -ForegroundColor Yellow
    }
    if ($Response) {
        Write-Host "Response:" -ForegroundColor White
        $Response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    }
    Write-Host "----------------------------------------`n"
    return $status
}

# --- Helper Function: Get Auth Token ---
function Get-AuthToken {
    param([string]$Email, [string]$Password)
    $token = $null
    
    Write-Host "Attempting to log in $Email..." -ForegroundColor Yellow
    
    $loginUser = @{
        email = $Email
        password = $Password
    }
    $loginBody = $loginUser | ConvertTo-Json
    $headers = @{"Content-Type" = "application/json"}
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -Headers $headers -ContentType "application/json"
        $token = $response.token
        Write-Host "Successfully logged in $Email." -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
        Write-Host "Login failed for $Email. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
    return $token
}

# --- Helper Function: Register User ---
function Register-User {
    param([string]$Email, [string]$Password, [string]$DisplayName, [string]$Role = "reader")
    $token = $null
    $userId = $null

    Write-Host "Attempting to register user $Email with role $Role..." -ForegroundColor Yellow
    
    $registerUser = @{
        email = $Email
        password = $Password
        displayName = $DisplayName
        role = $Role # Role is not directly settable on register, will be 'reader' by default
    }
    $registerBody = $registerUser | ConvertTo-Json
    $headers = @{"Content-Type" = "application/json"}

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -Headers $headers -ContentType "application/json"
        Write-Host "User registered successfully: $($response.user.email)" -ForegroundColor Green
        $token = $response.token
        $userId = $response.user.id
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
        if ($statusCode -eq 409) {
            Write-Host "User $Email already registered. Attempting to log in to get token." -ForegroundColor Yellow
            $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (ConvertTo-Json @{email=$Email; password=$Password}) -Headers $headers -ContentType "application/json"
            $token = $loginResponse.token
            $userId = $loginResponse.user.id
        } else {
            Write-Host "User registration failed unexpectedly. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
            exit 1
        }
    }
    return @{ Token = $token; UserId = $userId }
}

# --- Setup: Get Admin Token and Test User ---
Write-Host "--- Setup: Get Admin Token and Test User ---" -ForegroundColor DarkCyan

# Admin User Credentials (seeded in the database)
$adminEmail = "admin@example.com"
$adminPassword = "admin"

# Test Commenter User Credentials
$commenterEmail = "commenter_$(Get-Date -Format "yyyyMMddHHmmss")@example.com"
$commenterPassword = "commenterpassword123"
$commenterDisplayName = "Commenter User"

# Get Admin Token
$adminToken = Get-AuthToken -Email $adminEmail -Password $adminPassword
if (-not $adminToken) {
    Write-Host "Failed to obtain admin authentication token. Ensure the admin user ($adminEmail) exists and has the correct password." -ForegroundColor Red
    exit 1
}

# Register or Login Commenter User
$commenterUserResult = Register-User -Email $commenterEmail -Password $commenterPassword -DisplayName $commenterDisplayName
$commenterToken = $commenterUserResult.Token
$commenterUserId = $commenterUserResult.UserId

Write-Host "Setup complete. Proceeding with tests.`n"

# --- Common Headers ---
$adminHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $adminToken"
}
$commenterHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $commenterToken"
}
$unauthHeaders = @{"Content-Type" = "application/json"}

# --- Test 1: Clear all articles (Admin) ---
Write-Host "TEST 1: DELETE /api/articles (Admin - Clear all articles)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Delete -Headers $adminHeaders
    Write-TestResult -TestName "Clear all articles" -ExpectedStatusCode 204 -ActualStatusCode 204 -Response $null
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Clear all articles" -ExpectedStatusCode 204 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 2: Create a test article (Admin) ---
Write-Host "TEST 2: POST /api/articles (Admin - Create test article)" -ForegroundColor Magenta
$articleData = @{
    title = "Test Article for Comments"
    content = "This article is for testing comments."
    image_url = "https://example.com/comment-test-image.jpg"
    category_code = "general"
} | ConvertTo-Json

$articleId = $null
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Post -Headers $adminHeaders -Body $articleData
    $articleId = $response.id
    Write-TestResult -TestName "Create test article" -ExpectedStatusCode 201 -ActualStatusCode 201 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Create test article" -ExpectedStatusCode 201 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
    exit 1 # Exit if article creation fails
}

# --- Test 3: POST /api/articles/:id/comments (Unauthenticated) ---
Write-Host "TEST 3: POST /api/articles/$articleId/comments (Unauthenticated)" -ForegroundColor Magenta
$commentData = @{
    body = "This is a test comment from an unauthenticated user."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/comments" -Method Post -Headers $unauthHeaders -Body $commentData
    Write-TestResult -TestName "Create comment (Unauthenticated)" -ExpectedStatusCode 401 -ActualStatusCode 201 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Create comment (Unauthenticated)" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 4: POST /api/articles/:id/comments (Authenticated Commenter) ---
Write-Host "TEST 4: POST /api/articles/$articleId/comments (Authenticated Commenter)" -ForegroundColor Magenta
$commentData = @{
    body = "This is a test comment from an authenticated user."
} | ConvertTo-Json

$commentId = $null
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/comments" -Method Post -Headers $commenterHeaders -Body $commentData
    $commentId = $response.id
    Write-TestResult -TestName "Create comment (Authenticated Commenter)" -ExpectedStatusCode 201 -ActualStatusCode 201 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Create comment (Authenticated Commenter)" -ExpectedStatusCode 201 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 5: POST /api/articles/:id/comments (Authenticated Admin) ---
Write-Host "TEST 5: POST /api/articles/$articleId/comments (Authenticated Admin)" -ForegroundColor Magenta
$commentData = @{
    body = "This is a test comment from an admin user."
} | ConvertTo-Json

$adminCommentId = $null
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/comments" -Method Post -Headers $adminHeaders -Body $commentData
    $adminCommentId = $response.id
    Write-TestResult -TestName "Create comment (Authenticated Admin)" -ExpectedStatusCode 201 -ActualStatusCode 201 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Create comment (Authenticated Admin)" -ExpectedStatusCode 201 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 6: POST /api/articles/:id/comments (Invalid Article ID) ---
Write-Host "TEST 6: POST /api/articles/invalid/comments (Invalid Article ID)" -ForegroundColor Magenta
$commentData = @{
    body = "This is a test comment."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/invalid/comments" -Method Post -Headers $commenterHeaders -Body $commentData
    Write-TestResult -TestName "Create comment (Invalid Article ID)" -ExpectedStatusCode 400 -ActualStatusCode 201 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Create comment (Invalid Article ID)" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 7: POST /api/articles/:id/comments (Non-existent Article) ---
Write-Host "TEST 7: POST /api/articles/99999/comments (Non-existent Article)" -ForegroundColor Magenta
$commentData = @{
    body = "This is a test comment."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/99999/comments" -Method Post -Headers $commenterHeaders -Body $commentData
    Write-TestResult -TestName "Create comment (Non-existent Article)" -ExpectedStatusCode 404 -ActualStatusCode 201 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Create comment (Non-existent Article)" -ExpectedStatusCode 404 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 8: POST /api/articles/:id/comments (Empty Comment Body) ---
Write-Host "TEST 8: POST /api/articles/$articleId/comments (Empty Comment Body)" -ForegroundColor Magenta
$commentData = @{
    body = ""
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/comments" -Method Post -Headers $commenterHeaders -Body $commentData
    Write-TestResult -TestName "Create comment (Empty Comment Body)" -ExpectedStatusCode 400 -ActualStatusCode 201 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Create comment (Empty Comment Body)" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 9: GET /api/articles/:id/comments (Verify Comments Created) ---
Write-Host "TEST 9: GET /api/articles/$articleId/comments (Verify Comments Created)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/comments" -Method Get -Headers $unauthHeaders
    Write-TestResult -TestName "Get comments for article $articleId" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response
    if ($response.Count -eq 2) { # Expecting 2 comments
        Write-Host "Verification: Correct number of comments returned (Expected 2, Got $($response.Count))." -ForegroundColor Green
    } else {
        Write-Host "Verification: Incorrect number of comments returned. Expected 2, Got $($response.Count)" -ForegroundColor Red
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Get comments for article $articleId" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 10: DELETE /api/articles/comments/:id (Unauthenticated) ---
Write-Host "TEST 10: DELETE /api/articles/comments/$commentId (Unauthenticated)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/$commentId" -Method Delete -Headers $unauthHeaders
    Write-TestResult -TestName "Delete comment (Unauthenticated)" -ExpectedStatusCode 401 -ActualStatusCode 204 -Response $null
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Delete comment (Unauthenticated)" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 11: DELETE /api/articles/comments/:id (Authenticated Non-Admin) ---
Write-Host "TEST 11: DELETE /api/articles/comments/$commentId (Authenticated Non-Admin)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/$commentId" -Method Delete -Headers $commenterHeaders
    Write-TestResult -TestName "Delete comment (Authenticated Non-Admin)" -ExpectedStatusCode 403 -ActualStatusCode 204 -Response $null
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Delete comment (Authenticated Non-Admin)" -ExpectedStatusCode 403 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 12: DELETE /api/articles/comments/:id (Authenticated Admin) ---
Write-Host "TEST 12: DELETE /api/articles/comments/$commentId (Authenticated Admin)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/$commentId" -Method Delete -Headers $adminHeaders
    Write-TestResult -TestName "Delete comment (Authenticated Admin)" -ExpectedStatusCode 204 -ActualStatusCode 204 -Response $null
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Delete comment (Authenticated Admin)" -ExpectedStatusCode 204 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 13: DELETE /api/articles/comments/:id (Invalid Comment ID) ---
Write-Host "TEST 13: DELETE /api/articles/comments/invalid (Invalid Comment ID)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/invalid" -Method Delete -Headers $adminHeaders
    Write-TestResult -TestName "Delete comment (Invalid Comment ID)" -ExpectedStatusCode 400 -ActualStatusCode 204 -Response $null
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Delete comment (Invalid Comment ID)" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 14: DELETE /api/articles/comments/:id (Non-existent Comment) ---
Write-Host "TEST 14: DELETE /api/articles/comments/99999 (Non-existent Comment)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/99999" -Method Delete -Headers $adminHeaders
    Write-TestResult -TestName "Delete comment (Non-existent Comment)" -ExpectedStatusCode 404 -ActualStatusCode 204 -Response $null
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Delete comment (Non-existent Comment)" -ExpectedStatusCode 404 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 15: GET /api/articles/:id/comments (Verify Comment Deleted) ---
Write-Host "TEST 15: GET /api/articles/$articleId/comments (Verify Comment Deleted)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/comments" -Method Get -Headers $unauthHeaders
    Write-TestResult -TestName "Get comments for article $articleId" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response
    if ($response.Count -eq 1) { # Expecting 1 comment (admin's comment)
        Write-Host "Verification: Correct number of comments returned (Expected 1, Got $($response.Count))." -ForegroundColor Green
        # Verify it's the admin's comment
        if ($response[0].body -eq "This is a test comment from an admin user.") {
            Write-Host "Verification: Correct comment content returned." -ForegroundColor Green
        } else {
            Write-Host "Verification: Incorrect comment content returned." -ForegroundColor Red
        }
    } else {
        Write-Host "Verification: Incorrect number of comments returned. Expected 1, Got $($response.Count)" -ForegroundColor Red
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Get comments for article $articleId" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Cleanup: Delete test article (Admin) ---
Write-Host "--- Cleanup: DELETE /api/articles/$articleId (Admin - Delete test article) ---" -ForegroundColor DarkCyan
if ($articleId) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Delete -Headers $adminHeaders
        Write-TestResult -TestName "Delete test article $articleId" -ExpectedStatusCode 204 -ActualStatusCode 204 -Response $null
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
        Write-TestResult -TestName "Delete test article $articleId" -ExpectedStatusCode 204 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
    }
}

Write-Host "`nAll comment creation and deletion API tests completed." -ForegroundColor Green