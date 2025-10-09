# test-articles-media.ps1
# PowerShell script to test the article management API endpoints with media (images/videos)
#
# PURPOSE:
# This script tests all endpoints of the article management API, including
# both unauthenticated and authenticated requests, with a focus on the new
# media_urls functionality.
#
# PREREQUISITES:
# 1. Start the backend server: npm start or npm run dev
# 2. Ensure the server is running on http://localhost:3000
# 3. For authenticated endpoint tests, a valid JWT token is required in auth-token.txt
# 4. Ensure the database schema has been updated with the 'article_media' table.
#
# HOW TO USE:
# 1. Save this script in the project root directory
# 2. Open PowerShell in the project directory
# 3. Run: .\test-articles-media.ps1
#
# The script will output results for each test, showing:
# - Test name and timestamp
# - HTTP status code
# - Response body (if any)
# - Clear separation between tests

$baseUrl = "http://localhost:3000/api"
$headers = @{"Content-Type" = "application/json"}
$articleId = $null # To store the ID of the created article for subsequent tests

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

# --- Initial Cleanup (Authenticated) ---
Write-Host "--- Initial Cleanup: Deleting all articles ---" -ForegroundColor DarkYellow
$token = Get-Content -Path "auth-token.txt" -Raw | ForEach-Object { $_.Trim() }
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}
try {
    Invoke-RestMethod -Uri "$baseUrl/articles" -Method Delete -Headers $authHeaders -ErrorAction Stop
    Write-Result -TestName "Initial Cleanup: Delete all articles" -StatusCode 204 -Response "All articles deleted."
} catch {
    Write-Result -TestName "Initial Cleanup: Delete all articles" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 1: Get all articles (should return empty array initially)
Write-Host "TEST 1: GET /api/articles" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get all articles (initial)" -StatusCode 200 -Response $response
} catch {
    Write-Result -TestName "Get all articles (initial)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 2: Create article with authentication and multiple media URLs
Write-Host "TEST 2: POST /api/articles (authenticated, with media)" -ForegroundColor Magenta
$articleData = @{
    title = "Article with Media"
    content = "This article features both an image and a video."
    media_urls = @(
        "https://example.com/image1.jpg",
        "https://example.com/video1.mp4",
        "https://example.com/image2.png"
    )
    category_code = "media-test"
    language_code = "en"
    tags = @("media", "example")
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Post -Headers $authHeaders -Body $articleData -ErrorAction Stop
    $articleId = $response.id
    Write-Result -TestName "Create article (authenticated, with media)" -StatusCode 201 -Response $response
} catch {
    Write-Result -TestName "Create article (authenticated, with media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 3: Get the newly created article by ID and verify media URLs
if ($articleId) {
    Write-Host "TEST 3: GET /api/articles/$articleId (verify media)" -ForegroundColor Magenta
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Get -Headers $headers -ErrorAction Stop
        Write-Result -TestName "Get article by ID (verify media)" -StatusCode 200 -Response $response
        if ($response.media_urls.Count -eq 3) {
            Write-Host "  Media URLs count is correct." -ForegroundColor Green
        } else {
            Write-Host "  ERROR: Media URLs count is incorrect. Expected 3, got $($response.media_urls.Count)" -ForegroundColor Red
        }
    } catch {
        Write-Result -TestName "Get article by ID (verify media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    }
}

# Test 4: Update existing article with authentication and new media URLs
if ($articleId) {
    Write-Host "TEST 4: PUT /api/articles/$articleId (authenticated, update media)" -ForegroundColor Magenta
    $updateData = @{
        title = "Updated Article with New Media"
        content = "This article now has updated content and different media."
        media_urls = @(
            "https://example.com/new-image.gif",
            "https://example.com/new-video.mov"
        )
        tags = @("updated", "media")
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Put -Headers $authHeaders -Body $updateData -ErrorAction Stop
        Write-Result -TestName "Update article (authenticated, update media)" -StatusCode 200 -Response $response
    } catch {
        Write-Result -TestName "Update article (authenticated, update media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    }
}

# Test 5: Get the updated article by ID and verify new media URLs
if ($articleId) {
    Write-Host "TEST 5: GET /api/articles/$articleId (verify updated media)" -ForegroundColor Magenta
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Get -Headers $headers -ErrorAction Stop
        Write-Result -TestName "Get updated article by ID (verify updated media)" -StatusCode 200 -Response $response
        if ($response.media_urls.Count -eq 2) {
            Write-Host "  Updated Media URLs count is correct." -ForegroundColor Green
        } else {
            Write-Host "  ERROR: Updated Media URLs count is incorrect. Expected 2, got $($response.media_urls.Count)" -ForegroundColor Red
        }
        if ($response.media_urls -contains "https://example.com/new-image.gif" -and $response.media_urls -contains "https://example.com/new-video.mov") {
            Write-Host "  Updated Media URLs are correct." -ForegroundColor Green
        } else {
            Write-Host "  ERROR: Updated Media URLs do not match expected values." -ForegroundColor Red
        }
    } catch {
        Write-Result -TestName "Get updated article by ID (verify updated media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    }
}

# Test 6: Create article with no media URLs
Write-Host "TEST 6: POST /api/articles (authenticated, no media)" -ForegroundColor Magenta
$articleDataNoMedia = @{
    title = "Article with No Media"
    content = "This article should have no associated media."
    category_code = "no-media"
    language_code = "en"
    tags = @("no-media")
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Post -Headers $authHeaders -Body $articleDataNoMedia -ErrorAction Stop
    $articleIdNoMedia = $response.id
    Write-Result -TestName "Create article (authenticated, no media)" -StatusCode 201 -Response $response
} catch {
    Write-Result -TestName "Create article (authenticated, no media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Test 7: Get article with no media URLs and verify empty array
if ($articleIdNoMedia) {
    Write-Host "TEST 7: GET /api/articles/$articleIdNoMedia (verify no media)" -ForegroundColor Magenta
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/articles/$articleIdNoMedia" -Method Get -Headers $headers -ErrorAction Stop
        Write-Result -TestName "Get article by ID (verify no media)" -StatusCode 200 -Response $response
        if ($response.media_urls.Count -eq 0) {
            Write-Host "  Media URLs array is empty, as expected." -ForegroundColor Green
        } else {
            Write-Host "  ERROR: Media URLs array is not empty. Expected 0, got $($response.media_urls.Count)" -ForegroundColor Red
        }
    } catch {
        Write-Result -TestName "Get article by ID (verify no media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    }
}

# Test 8: Delete article with media (authenticated)
if ($articleId) {
    Write-Host "TEST 8: DELETE /api/articles/$articleId (authenticated, with media)" -ForegroundColor Magenta
    try {
        Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Delete -Headers $authHeaders -ErrorAction Stop
        Write-Result -TestName "Delete article (authenticated, with media)" -StatusCode 204 -Response "Article $articleId deleted."
    } catch {
        Write-Result -TestName "Delete article (authenticated, with media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    }
}

# Test 9: Verify deleted article is no longer accessible
if ($articleId) {
    Write-Host "TEST 9: GET /api/articles/$articleId (verify deletion)" -ForegroundColor Magenta
    try {
        Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Get -Headers $headers -ErrorAction Stop
        Write-Result -TestName "Verify deleted article" -StatusCode 200 -Response "ERROR: Article still found after deletion."
    } catch {
        if ($_.Exception.Response.StatusCode.Value__ -eq 404) {
            Write-Result -TestName "Verify deleted article" -StatusCode 404 -Response "Article not found, as expected."
        } else {
            Write-Result -TestName "Verify deleted article" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
        }
    }
}

# Test 10: Delete article with no media (authenticated)
if ($articleIdNoMedia) {
    Write-Host "TEST 10: DELETE /api/articles/$articleIdNoMedia (authenticated, no media)" -ForegroundColor Magenta
    try {
        Invoke-RestMethod -Uri "$baseUrl/articles/$articleIdNoMedia" -Method Delete -Headers $authHeaders -ErrorAction Stop
        Write-Result -TestName "Delete article (authenticated, no media)" -StatusCode 204 -Response "Article $articleIdNoMedia deleted."
    } catch {
        Write-Result -TestName "Delete article (authenticated, no media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    }
}

Write-Host "API testing completed!" -ForegroundColor Green