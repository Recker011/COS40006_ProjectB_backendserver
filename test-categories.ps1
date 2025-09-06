# test-categories.ps1
# PowerShell script to test the GET /api/categories endpoint.
#
# PURPOSE:
# This script tests the GET /api/categories endpoint by:
# 1. Retrieving all categories
# 2. Verifying the response structure and status code
#
# PREREQUISITES:
# 1. Start the backend server: npm start or npm run dev
# 2. Ensure the server is running on http://localhost:3000
#
# HOW TO USE:
# 1. Save this script in the project root directory
# 2. Open PowerShell in the project directory
# 3. Run: .\test-categories.ps1
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

# Test 1: Get all categories (GET /api/categories)
Write-Host "TEST 1: GET /api/categories - Retrieve all categories" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/categories" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get All Categories" -StatusCode 200 -Response $response
    
    if ($response -is [System.Array]) {
        Write-Host "Verification successful: Response is an array. Found $($response.Length) categories." -ForegroundColor Green
        # Optional: Further checks on individual category objects if needed
        if ($response.Length -gt 0) {
            $firstCategory = $response[0]
            if ($firstCategory.id -and $firstCategory.name_en) {
                Write-Host "First category structure looks good (id, name_en found)." -ForegroundColor Green
            } else {
                Write-Host "Warning: First category missing expected properties (id, name_en)." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Verification failed: Response is not an array." -ForegroundColor Red
    }
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $statusCode = $errorResponse.StatusCode.Value__
        $errorMessage = $_.ErrorDetails.Message
        Write-Result -TestName "Get All Categories" -StatusCode $statusCode -Response $errorMessage
        Write-Host "Failed to retrieve categories. HTTP Status Code: $statusCode. Error: $errorMessage" -ForegroundColor Red
    } else {
        Write-Result -TestName "Get All Categories" -StatusCode 0 -Response $_.Exception.Message
        Write-Host "Failed to retrieve categories. No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Possible causes: Server not running, network issue." -ForegroundColor Red
    }
    exit 1
}

# Test 2: Get all categories with Bengali language (GET /api/categories?lang=bn)
Write-Host "TEST 2: GET /api/categories?lang=bn - Retrieve all categories in Bengali" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/categories?lang=bn" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get All Categories (Bengali)" -StatusCode 200 -Response $response
    
    if ($response -is [System.Array]) {
        Write-Host "Verification successful: Response is an array. Found $($response.Length) categories." -ForegroundColor Green
        if ($response.Length -gt 0) {
            $firstCategory = $response[0]
            if ($firstCategory.id -and $firstCategory.name_bn) {
                Write-Host "First category structure looks good (id, name_bn found)." -ForegroundColor Green
            } else {
                Write-Host "Warning: First category missing expected properties (id, name_bn)." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Verification failed: Response is not an array." -ForegroundColor Red
    }
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $statusCode = $errorResponse.StatusCode.Value__
        $errorMessage = $_.ErrorDetails.Message
        Write-Result -TestName "Get All Categories (Bengali)" -StatusCode $statusCode -Response $errorMessage
        Write-Host "Failed to retrieve categories in Bengali. HTTP Status Code: $statusCode. Error: $errorMessage" -ForegroundColor Red
    } else {
        Write-Result -TestName "Get All Categories (Bengali)" -StatusCode 0 -Response $_.Exception.Message
        Write-Host "Failed to retrieve categories in Bengali. No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Possible causes: Server not running, network issue." -ForegroundColor Red
    }
    exit 1
}

Write-Host "`nCategory API testing completed!" -ForegroundColor Green