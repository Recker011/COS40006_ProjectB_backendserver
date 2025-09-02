# test-tags.ps1
# PowerShell script to test the tag management API endpoints, specifically the PUT /api/tags/:code endpoint.
#
# PURPOSE:
# This script tests the PUT /api/tags/:code endpoint by:
# 1. Creating a new tag (if it doesn't exist)
# 2. Updating the created tag
# 3. Verifying the update
# 4. Deleting the tag for cleanup
#
# PREREQUISITES:
# 1. Start the backend server: npm start or npm run dev
# 2. Ensure the server is running on http://localhost:3000
# 3. Run test-login.ps1 first to generate auth-token.txt with a valid JWT token (admin/editor role)
#
# HOW TO USE:
# 1. Save this script in the project root directory
# 2. Open PowerShell in the project directory
# 3. Run: .\test-tags.ps1
#
# The script will output results for each test, showing:
# - Test name and timestamp
# - HTTP status code
# - Response body (if any)
# - Clear separation between tests

$baseUrl = "http://localhost:3000/api"
$headers = @{"Content-Type" = "application/json"}

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

# Admin credentials
$adminEmail = "admin@example.com"
$adminPassword = "admin"
$loginUrl = "$baseUrl/auth/login"

# Function to perform login and get JWT token
function Get-AdminAuthToken {
    param(
        [string]$Email,
        [string]$Password,
        [string]$LoginUri
    )
    $loginBody = @{
        email = $Email
        password = $Password
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $LoginUri -Method Post -Body $loginBody -ContentType "application/json"
        if ($response.token) {
            Write-Host "Admin login successful. Token obtained." -ForegroundColor Green
            return $response.token
        } else {
            Write-Host "Admin login failed: No token received." -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Admin login failed. Status Code: $($_.Exception.Response.StatusCode.Value__). Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        exit 1
    }
}

# Obtain admin JWT token
$token = Get-AdminAuthToken -Email $adminEmail -Password $adminPassword -LoginUri $loginUrl

# Add Authorization header with JWT token
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$testTagCode = "testtag"
$initialNameEn = "Test Tag English"
$initialNameBn = "Test Tag Bengali"
$updatedNameEn = "Updated Test Tag English"
$updatedNameBn = "Updated Test Tag Bengali"

# Test 1: Create a new tag (POST /api/tags)
Write-Host "TEST 1: POST /api/tags - Create a new tag" -ForegroundColor Magenta
$tagData = @{
    code = $testTagCode
    name_en = $initialNameEn
    name_bn = $initialNameBn
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags" -Method Post -Headers $headers -Body $tagData
    Write-Result -TestName "Create Tag" -StatusCode 201 -Response $response
} catch {
    Write-Result -TestName "Create Tag" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    if ($_.Exception.Response.StatusCode.Value__ -eq 409) {
        Write-Host "Tag '$testTagCode' already exists. Proceeding with update test." -ForegroundColor Yellow
    } else {
        Write-Host "Failed to create tag. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Test 2: Update the tag (PUT /api/tags/:code)
Write-Host "TEST 2: PUT /api/tags/$testTagCode - Update the tag" -ForegroundColor Magenta
$updateTagData = @{
    name_en = $updatedNameEn
    name_bn = $updatedNameBn
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags/$testTagCode" -Method Put -Headers $headers -Body $updateTagData
    Write-Result -TestName "Update Tag" -StatusCode 200 -Response $response
} catch {
    Write-Result -TestName "Update Tag" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    Write-Host "Failed to update tag. Exiting." -ForegroundColor Red
    exit 1
}

# Test 3: Verify the updated tag (GET /api/tags/:code)
Write-Host "TEST 3: GET /api/tags/$testTagCode - Verify updated tag" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags/$testTagCode" -Method Get -Headers $headers
    Write-Result -TestName "Verify Updated Tag" -StatusCode 200 -Response $response
    if ($response.name_en -eq $updatedNameEn -and $response.name_bn -eq $updatedNameBn) {
        Write-Host "Verification successful: Tag names match updated values." -ForegroundColor Green
    } else {
        Write-Host "Verification failed: Tag names do not match updated values." -ForegroundColor Red
    }
} catch {
    Write-Result -TestName "Verify Updated Tag" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    Write-Host "Failed to verify updated tag. Exiting." -ForegroundColor Red
    exit 1
}

# Retrieve the tag ID for the new endpoint test
$tagId = $null
Write-Host "Retrieving tag ID for '$testTagCode'..." -ForegroundColor DarkYellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags/$testTagCode" -Method Get -Headers $headers
    $tagId = $response.id
    Write-Host "Tag ID for '$testTagCode': $tagId" -ForegroundColor Green
} catch {
    Write-Host "Failed to retrieve tag ID. Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Get articles by tag ID (GET /api/tags/:id/articles)
Write-Host "TEST 4: GET /api/tags/$tagId/articles - Get articles by tag ID" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags/$tagId/articles" -Method Get -Headers $headers
    Write-Result -TestName "Get Articles by Tag ID" -StatusCode 200 -Response $response
    if ($response.Length -gt 0) {
        Write-Host "Verification successful: Found $($response.Length) articles for tag ID $tagId." -ForegroundColor Green
    } else {
        Write-Host "Verification: No articles found for tag ID $tagId. This might be expected if no articles are tagged." -ForegroundColor Yellow
    }
} catch {
    Write-Result -TestName "Get Articles by Tag ID" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    Write-Host "Failed to get articles by tag ID. Exiting." -ForegroundColor Red
    exit 1
}

# NEW: Pre-Delete Check
Write-Host "PRE-DELETE CHECK: GET /api/tags/$testTagCode - Confirm tag exists before deletion" -ForegroundColor DarkYellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags/$testTagCode" -Method Get -Headers $headers
    Write-Result -TestName "Pre-Delete Check" -StatusCode 200 -Response $response
    Write-Host "Pre-delete check successful: Tag '$testTagCode' found. Proceeding with DELETE." -ForegroundColor Green
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $statusCode = $errorResponse.StatusCode.Value__
        $errorMessage = $_.ErrorDetails.Message
        Write-Result -TestName "Pre-Delete Check" -StatusCode $statusCode -Response $errorMessage
        Write-Host "Pre-delete check failed: Tag '$testTagCode' NOT found (Status Code: $statusCode). Cannot proceed with DELETE." -ForegroundColor Red
    } else {
        Write-Result -TestName "Pre-Delete Check" -StatusCode 0 -Response $_.Exception.Message
        Write-Host "Pre-delete check failed: No HTTP response received. Error: $($_.Exception.Message). Cannot proceed with DELETE." -ForegroundColor Red
    }
    Write-Host "Manual cleanup of tag '$testTagCode' may be required." -ForegroundColor Yellow
    exit 1 # Exit if tag not found before delete
}

# Test 4: Delete the tag (DELETE /api/tags/:code) - Cleanup
Write-Host "TEST 4: DELETE /api/tags/$testTagCode - Cleanup: Delete the tag" -ForegroundColor Magenta
try {
    Invoke-RestMethod -Uri "$baseUrl/tags/$testTagCode" -Method Delete -Headers $headers
    $deleteStatusCode = 204
    Write-Result -TestName "Delete Tag (Cleanup)" -StatusCode $deleteStatusCode -Response "Tag successfully deleted."
    Write-Host "Tag '$testTagCode' successfully deleted." -ForegroundColor Green

} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $statusCode = $errorResponse.StatusCode.Value__
        $errorMessage = $_.ErrorDetails.Message
        Write-Result -TestName "Delete Tag (Cleanup)" -StatusCode $statusCode -Response $errorMessage
        Write-Host "Failed to delete tag during cleanup. HTTP Status Code: $statusCode. Error: $errorMessage" -ForegroundColor Red
    } else {
        Write-Result -TestName "Delete Tag (Cleanup)" -StatusCode 0 -Response $_.Exception.Message
        Write-Host "Failed to delete tag during cleanup. No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Possible causes: Server not running, network issue, or server crashed." -ForegroundColor Red
    }
    Write-Host "Manual cleanup of tag '$testTagCode' may be required." -ForegroundColor Yellow
}

# Test 5: Get popular tags (GET /api/tags/popular) - Default limit
Write-Host "TEST 5: GET /api/tags/popular - Get popular tags (default limit)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags/popular" -Method Get -Headers $headers
    Write-Result -TestName "Get Popular Tags (Default)" -StatusCode 200 -Response $response
    if ($response.Length -gt 0) {
        Write-Host "Verification successful: Found $($response.Length) popular tags." -ForegroundColor Green
    } else {
        Write-Host "Verification: No popular tags found. This might be expected if no articles are tagged." -ForegroundColor Yellow
    }
} catch {
    Write-Result -TestName "Get Popular Tags (Default)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    Write-Host "Failed to get popular tags (default limit). Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Get popular tags with a specific limit (GET /api/tags/popular?limit=3)
Write-Host "TEST 6: GET /api/tags/popular?limit=3 - Get popular tags (limit 3)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags/popular?limit=3" -Method Get -Headers $headers
    Write-Result -TestName "Get Popular Tags (Limit 3)" -StatusCode 200 -Response $response
    if ($response.Length -eq 3) {
        Write-Host "Verification successful: Found 3 popular tags as expected." -ForegroundColor Green
    } elseif ($response.Length -lt 3) {
        Write-Host "Verification: Found $($response.Length) popular tags (less than 3, possibly due to fewer available tags)." -ForegroundColor Yellow
    } else {
        Write-Host "Verification failed: Expected 3 tags, but got $($response.Length)." -ForegroundColor Red
    }
} catch {
    Write-Result -TestName "Get Popular Tags (Limit 3)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    Write-Host "Failed to get popular tags (limit 3). Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Get popular tags with an invalid limit (GET /api/tags/popular?limit=0)
Write-Host "TEST 7: GET /api/tags/popular?limit=0 - Get popular tags (invalid limit 0)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tags/popular?limit=0" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get Popular Tags (Invalid Limit 0)" -StatusCode 200 -Response $response
    Write-Host "Verification failed: Expected 400 Bad Request, but got 200 OK." -ForegroundColor Red
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $statusCode = $errorResponse.StatusCode.Value__
        $errorMessage = $_.ErrorDetails.Message
        Write-Result -TestName "Get Popular Tags (Invalid Limit 0)" -StatusCode $statusCode -Response $errorMessage
        if ($statusCode -eq 400) {
            Write-Host "Verification successful: Received 400 Bad Request for invalid limit." -ForegroundColor Green
        } else {
            Write-Host "Verification failed: Expected 400 Bad Request, but got $statusCode." -ForegroundColor Red
        }
    } else {
        Write-Result -TestName "Get Popular Tags (Invalid Limit 0)" -StatusCode 0 -Response $_.Exception.Message
        Write-Host "Verification failed: No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTag API testing completed!" -ForegroundColor Green