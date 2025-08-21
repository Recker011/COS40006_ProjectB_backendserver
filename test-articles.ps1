# test-articles.ps1
# PowerShell script to test the article management API endpoints
#
# PURPOSE:
# This script tests all endpoints of the article management API, including
# both unauthenticated and authenticated requests.
#
# PREREQUISITES:
# 1. Start the backend server: npm start or npm run dev
# 2. Ensure the server is running on http://localhost:3000
# 3. For authenticated endpoint tests, a valid JWT token is required
#
# HOW TO USE:
# 1. Save this script in the project root directory
# 2. Open PowerShell in the project directory
# 3. Run: .\test-articles.ps1
#
# The script will output results for each test, showing:
# - Test name and timestamp
# - HTTP status code
# - Response body (if any)
# - Clear separation between tests

$baseUrl = "http://localhost:3000/api"
$headers = @{"Content-Type" = "application/json"}
#    $headers = @{
#        "Content-Type" = "application/json"
#        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1NTc1NzQ0OSwiZXhwIjoxNzU1ODQzODQ5fQ.HOLv7LtONmJig-cJLOI8YxCkx1yEJlTv6EoYedaxbt4"
#    }

# Function to display test results
function Write-Result {
    param([string]$TestName, [int]$StatusCode, [object]$Response)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $TestName" -ForegroundColor Cyan
    Write-Host "Status Code: $StatusCode" -ForegroundColor Yellow
    
    if ($Response) {
        Write-Host "Response:" -ForegroundColor Green
        $Response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    }
    Write-Host "----------------------------------------`n"
}

# Test 1: Get all articles (should return empty array initially)
Write-Host "TEST 1: GET /api/articles" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Get -Headers $headers
    Write-Result -TestName "Get all articles" -StatusCode 200 -Response $response
} catch {
    Write-Result -TestName "Get all articles" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 2: Search articles without search term (should return 400)
Write-Host "TEST 2: GET /api/articles?search=" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles?search=" -Method Get -Headers $headers
    Write-Result -TestName "Search articles (no term)" -StatusCode 200 -Response $response
} catch {
    Write-Result -TestName "Search articles (no term)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 3: Search articles with search term (should return 400 since no articles exist)
Write-Host "TEST 3: GET /api/articles?search=test" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles?search=test" -Method Get -Headers $headers
    Write-Result -TestName "Search articles (with term)" -StatusCode 200 -Response $response
} catch {
    Write-Result -TestName "Search articles (with term)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 4: Get non-existent article (should return 404)
Write-Host "TEST 4: GET /api/articles/999" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/999" -Method Get -Headers $headers
    Write-Result -TestName "Get non-existent article" -StatusCode 200 -Response $response
} catch {
    Write-Result -TestName "Get non-existent article" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 5: Create article without authentication (should return 401)
Write-Host "TEST 5: POST /api/articles (unauthenticated)" -ForegroundColor Magenta
$articleData = @{
    title = "Test Article"
    content = "This is a test article content"
    image_url = "https://example.com/image.jpg"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Post -Headers $headers -Body $articleData
    Write-Result -TestName "Create article (unauthenticated)" -StatusCode 201 -Response $response
} catch {
    Write-Result -TestName "Create article (unauthenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 6: Update non-existent article without authentication (should return 401)
Write-Host "TEST 6: PUT /api/articles/999 (unauthenticated)" -ForegroundColor Magenta
$updateData = @{
    title = "Updated Test Article"
    content = "This is updated test article content"
    image_url = "https://example.com/updated-image.jpg"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/999" -Method Put -Headers $headers -Body $updateData
    Write-Result -TestName "Update article (unauthenticated)" -StatusCode 200 -Response $response
} catch {
    Write-Result -TestName "Update article (unauthenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 7: Delete non-existent article without authentication (should return 401)
Write-Host "TEST 7: DELETE /api/articles/999 (unauthenticated)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/999" -Method Delete -Headers $headers
    Write-Result -TestName "Delete article (unauthenticated)" -StatusCode 204 -Response $response
} catch {
    Write-Result -TestName "Delete article (unauthenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 8: Clear all articles without authentication (should return 401)
Write-Host "TEST 8: DELETE /api/articles (unauthenticated)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Delete -Headers $headers
    Write-Result -TestName "Clear all articles (unauthenticated)" -StatusCode 204 -Response $response
} catch {
    Write-Result -TestName "Clear all articles (unauthenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Read JWT token from auth-token.txt
$token = Get-Content -Path "auth-token.txt" -Raw | ForEach-Object { $_.Trim() }

# Add Authorization header with JWT token
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

# Test 9: Create article with authentication
Write-Host "TEST 9: POST /api/articles (authenticated)" -ForegroundColor Magenta
$articleData = @{
    title = "Test Article"
    content = "This is a test article content"
    image_url = "https://example.com/image.jpg"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Post -Headers $headers -Body $articleData
    Write-Result -TestName "Create article (authenticated)" -StatusCode 201 -Response $response
} catch {
    Write-Result -TestName "Create article (authenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 10: Update existing article with authentication
# First, get all articles to find an existing one
try {
    $articles = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Get -Headers $headers
    if ($articles.Count -gt 0) {
        $articleId = $articles[0].id
        Write-Host "TEST 10: PUT /api/articles/$articleId (authenticated)" -ForegroundColor Magenta
        $updateData = @{
            title = "Updated Test Article"
            content = "This is updated test article content"
            image_url = "https://example.com/updated-image.jpg"
        } | ConvertTo-Json

        try {
            $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Put -Headers $headers -Body $updateData
            Write-Result -TestName "Update article (authenticated)" -StatusCode 200 -Response $response
        } catch {
            Write-Result -TestName "Update article (authenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
        }
    } else {
        Write-Host "TEST 10: PUT /api/articles (authenticated)" -ForegroundColor Magenta
        Write-Host "No articles found to update" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error retrieving articles for update test: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 11: Delete article with authentication
# Use the same article ID from the previous test
if (Test-Path variable:articleId) {
    Write-Host "TEST 11: DELETE /api/articles/$articleId (authenticated)" -ForegroundColor Magenta
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Delete -Headers $headers
        Write-Result -TestName "Delete article (authenticated)" -StatusCode 204 -Response $response
    } catch {
        Write-Result -TestName "Delete article (authenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    }
}

# Test 12: Clear all articles with authentication
Write-Host "TEST 12: DELETE /api/articles (authenticated)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Delete -Headers $headers
    Write-Result -TestName "Clear all articles (authenticated)" -StatusCode 204 -Response $response
} catch {
    Write-Result -TestName "Clear all articles (authenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 13: Alternative clear endpoint with authentication
Write-Host "TEST 13: POST /api/articles/clear (authenticated)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles/clear" -Method Post -Headers $headers
    Write-Result -TestName "Clear articles via POST (authenticated)" -StatusCode 204 -Response $response
} catch {
    Write-Result -TestName "Clear articles via POST (authenticated)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

Write-Host "API testing completed!" -ForegroundColor Green
Write-Host "All tests completed, including authenticated endpoints." -ForegroundColor Green