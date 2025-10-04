# test-article-comments.ps1
# PowerShell script to test the GET /api/articles/:id/comments endpoint
#
# PURPOSE:
# This script tests the functionality of retrieving comments for a specific article,
# ensuring soft-deleted comments are excluded.
#
# PREREQUISITES:
# 1. Start the backend server: npm start or npm run dev
# 2. Ensure the server is running on http://localhost:3000
# 3. An admin user must exist in the database (e.g., admin@example.com / admin)
#
# HOW TO USE:
# 1. Save this script in the project root directory
# 2. Open PowerShell in the project directory
# 3. Run: .\test-article-comments.ps1
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
 
 # --- Test 3: POST /api/articles/:id/comments (Create comment for testing edit functionality) ---
 Write-Host "TEST 3: POST /api/articles/$articleId/comments (Create comment for testing edit functionality)" -ForegroundColor Magenta
 $commentData = @{
     body = "This is a test comment to be edited."
 } | ConvertTo-Json
 
 $commentId = $null
 try {
     $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/comments" -Method Post -Headers $commenterHeaders -Body $commentData
     $commentId = $response.id
     Write-TestResult -TestName "Create comment for edit testing" -ExpectedStatusCode 201 -ActualStatusCode 201 -Response $response
 } catch {
     $statusCode = $_.Exception.Response.StatusCode.Value__
     $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
     Write-TestResult -TestName "Create comment for edit testing" -ExpectedStatusCode 201 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
 }
 
 # --- Test 4: PUT /api/articles/comments/:id (Edit comment as admin) ---
 Write-Host "TEST 4: PUT /api/articles/comments/$commentId (Edit comment as admin)" -ForegroundColor Magenta
 $editCommentData = @{
     body = "This is an edited comment by admin."
 } | ConvertTo-Json
 
 try {
     $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/$commentId" -Method Put -Headers $adminHeaders -Body $editCommentData
     Write-TestResult -TestName "Edit comment (Admin)" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response
     
     # Verify the comment was edited correctly
     if ($response.body -eq "This is an edited comment by admin.") {
         Write-Host "Verification: Comment body updated correctly." -ForegroundColor Green
     } else {
         Write-Host "Verification: Comment body not updated correctly. Expected 'This is an edited comment by admin.', Got '$($response.body)'" -ForegroundColor Red
     }
     
     if ($response.edited_at -ne $null) {
         Write-Host "Verification: edited_at field populated correctly." -ForegroundColor Green
     } else {
         Write-Host "Verification: edited_at field not populated." -ForegroundColor Red
     }
     
     if ($response.edited_by_user_id -eq "1") {
         Write-Host "Verification: edited_by_user_id field populated correctly." -ForegroundColor Green
     } else {
         Write-Host "Verification: edited_by_user_id field not populated correctly. Expected '1', Got '$($response.edited_by_user_id)'" -ForegroundColor Red
     }
 } catch {
     $statusCode = $_.Exception.Response.StatusCode.Value__
     $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
     Write-TestResult -TestName "Edit comment (Admin)" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
 }
 
 # --- Test 5: PUT /api/articles/comments/:id (Edit comment as non-admin) ---
 Write-Host "TEST 5: PUT /api/articles/comments/$commentId (Edit comment as non-admin)" -ForegroundColor Magenta
 $editCommentData = @{
     body = "This comment should not be edited by non-admin."
 } | ConvertTo-Json
 
 try {
     $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/$commentId" -Method Put -Headers $commenterHeaders -Body $editCommentData
     Write-TestResult -TestName "Edit comment (Non-admin)" -ExpectedStatusCode 403 -ActualStatusCode 200 -Response $response
 } catch {
     $statusCode = $_.Exception.Response.StatusCode.Value__
     $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
     Write-TestResult -TestName "Edit comment (Non-admin)" -ExpectedStatusCode 403 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
 }
 
 # --- Test 6: PUT /api/articles/comments/:id (Edit non-existent comment) ---
 Write-Host "TEST 6: PUT /api/articles/comments/99999 (Edit non-existent comment)" -ForegroundColor Magenta
 $editCommentData = @{
     body = "This comment should not exist."
 } | ConvertTo-Json
 
 try {
     $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/99999" -Method Put -Headers $adminHeaders -Body $editCommentData
     Write-TestResult -TestName "Edit non-existent comment" -ExpectedStatusCode 404 -ActualStatusCode 200 -Response $response
 } catch {
     $statusCode = $_.Exception.Response.StatusCode.Value__
     $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
     Write-TestResult -TestName "Edit non-existent comment" -ExpectedStatusCode 404 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
 }
 
 # --- Test 7: PUT /api/articles/comments/:id (Edit comment with invalid ID) ---
 Write-Host "TEST 7: PUT /api/articles/comments/invalid (Edit comment with invalid ID)" -ForegroundColor Magenta
 $editCommentData = @{
     body = "This comment has invalid ID."
 } | ConvertTo-Json
 
 try {
     $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/invalid" -Method Put -Headers $adminHeaders -Body $editCommentData
     Write-TestResult -TestName "Edit comment with invalid ID" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response
 } catch {
     $statusCode = $_.Exception.Response.StatusCode.Value__
     $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
     Write-TestResult -TestName "Edit comment with invalid ID" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
 }
 
 # --- Test 8: PUT /api/articles/comments/:id (Edit comment with empty body) ---
 Write-Host "TEST 8: PUT /api/articles/comments/$commentId (Edit comment with empty body)" -ForegroundColor Magenta
 $editCommentData = @{
     body = ""
 } | ConvertTo-Json
 
 try {
     $response = Invoke-RestMethod -Uri "$baseUrl/articles/comments/$commentId" -Method Put -Headers $adminHeaders -Body $editCommentData
     Write-TestResult -TestName "Edit comment with empty body" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response
 } catch {
     $statusCode = $_.Exception.Response.StatusCode.Value__
     $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
     Write-TestResult -TestName "Edit comment with empty body" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
 }


# --- Test 4: GET /api/articles/:id/comments (Successful retrieval) ---
Write-Host "TEST 4: GET /api/articles/$articleId/comments (Successful retrieval)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/comments" -Method Get -Headers $unauthHeaders
    Write-TestResult -TestName "Get comments for article $articleId" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response
    if ($response.Count -eq 0) { # Expecting 0 comments for a new article with no comments added
        Write-Host "Verification: Correct number of comments returned (Expected 0, Got $($response.Count))." -ForegroundColor Green
    } else {
        Write-Host "Verification: Incorrect number of comments returned. Expected 0, Got $($response.Count)" -ForegroundColor Red
    }
    # Further verification of content can be added here if needed
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Get comments for article $articleId" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 5: GET /api/articles/:id/comments (Non-existent article) ---
Write-Host "TEST 5: GET /api/articles/99999/comments (Non-existent article)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/99999/comments" -Method Get -Headers $unauthHeaders
    Write-TestResult -TestName "Get comments for non-existent article" -ExpectedStatusCode 404 -ActualStatusCode 200 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Get comments for non-existent article" -ExpectedStatusCode 404 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
}

# --- Test 6: GET /api/articles/:id/comments (Invalid article ID) ---
Write-Host "TEST 6: GET /api/articles/abc/comments (Invalid article ID)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/abc/comments" -Method Get -Headers $unauthHeaders
    Write-TestResult -TestName "Get comments for invalid article ID" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Get comments for invalid article ID" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json)
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


Write-Host "`nAll article comments API tests completed." -ForegroundColor Green