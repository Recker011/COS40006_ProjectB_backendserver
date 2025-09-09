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

# Get a category ID for testing GET /api/categories/:id
$testCategoryId = $null
Write-Host "Attempting to retrieve a category ID for testing..." -ForegroundColor DarkYellow
try {
    $allCategories = Invoke-RestMethod -Uri "$baseUrl/categories" -Method Get -Headers $headers -ErrorAction Stop
    if ($allCategories -is [System.Array] -and $allCategories.Length -gt 0) {
        $testCategoryId = $allCategories[0].id
        Write-Host "Successfully retrieved category ID: $testCategoryId" -ForegroundColor Green
    } else {
        Write-Host "No categories found to test GET /api/categories/:id. Skipping test." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to retrieve categories to get an ID. Error: $($_.Exception.Message)" -ForegroundColor Red
}

if ($testCategoryId) {
    # Test 3: Get specific category by ID (GET /api/categories/:id)
    Write-Host "TEST 3: GET /api/categories/$testCategoryId - Retrieve specific category by ID" -ForegroundColor Magenta
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/categories/$testCategoryId" -Method Get -Headers $headers -ErrorAction Stop
        Write-Result -TestName "Get Specific Category by ID" -StatusCode 200 -Response $response
        
        if ($response.id -eq $testCategoryId) {
            Write-Host "Verification successful: Retrieved category ID matches requested ID." -ForegroundColor Green
        } else {
            Write-Host "Verification failed: Retrieved category ID does not match requested ID." -ForegroundColor Red
        }
    } catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $statusCode = $errorResponse.StatusCode.Value__
            $errorMessage = $_.ErrorDetails.Message
            Write-Result -TestName "Get Specific Category by ID" -StatusCode $statusCode -Response $errorMessage
            Write-Host "Failed to retrieve specific category. HTTP Status Code: $statusCode. Error: $errorMessage" -ForegroundColor Red
        } else {
            Write-Result -TestName "Get Specific Category by ID" -StatusCode 0 -Response $_.Exception.Message
            Write-Host "Failed to retrieve specific category. No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Possible causes: Server not running, network issue." -ForegroundColor Red
        }
    }

    # Test 4: Get non-existent category by ID (GET /api/categories/:id)
    $nonExistentId = 99999 # Assuming this ID does not exist
    Write-Host "TEST 4: GET /api/categories/$nonExistentId - Retrieve non-existent category by ID" -ForegroundColor Magenta
    try {
        Invoke-RestMethod -Uri "$baseUrl/categories/$nonExistentId" -Method Get -Headers $headers -ErrorAction Stop
        Write-Result -TestName "Get Non-Existent Category by ID" -StatusCode 200 -Response "Unexpected success"
        Write-Host "Verification failed: Expected 404 Not Found, but got 200 OK." -ForegroundColor Red
    } catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $statusCode = $errorResponse.StatusCode.Value__
            $errorMessage = $_.ErrorDetails.Message
            Write-Result -TestName "Get Non-Existent Category by ID" -StatusCode $statusCode -Response $errorMessage
            if ($statusCode -eq 404) {
                Write-Host "Verification successful: Received 404 Not Found for non-existent category." -ForegroundColor Green
            } else {
                Write-Host "Verification failed: Expected 404 Not Found, but got $statusCode." -ForegroundColor Red
            }
        } else {
            Write-Result -TestName "Get Non-Existent Category by ID" -StatusCode 0 -Response $_.Exception.Message
            Write-Host "Verification failed: No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    # Test 5: Get category with invalid ID (GET /api/categories/:id)
    $invalidId = "abc"
    Write-Host "TEST 5: GET /api/categories/$invalidId - Retrieve category with invalid ID" -ForegroundColor Magenta
    try {
        Invoke-RestMethod -Uri "$baseUrl/categories/$invalidId" -Method Get -Headers $headers -ErrorAction Stop
        Write-Result -TestName "Get Category with Invalid ID" -StatusCode 200 -Response "Unexpected success"
        Write-Host "Verification failed: Expected 400 Bad Request, but got 200 OK." -ForegroundColor Red
    } catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $statusCode = $errorResponse.StatusCode.Value__
            $errorMessage = $_.ErrorDetails.Message
            Write-Result -TestName "Get Category with Invalid ID" -StatusCode $statusCode -Response $errorMessage
            if ($statusCode -eq 400) {
                Write-Host "Verification successful: Received 400 Bad Request for invalid ID." -ForegroundColor Green
            } else {
                Write-Host "Verification failed: Expected 400 Bad Request, but got $statusCode." -ForegroundColor Red
            }
        } else {
            Write-Result -TestName "Get Category with Invalid ID" -StatusCode 0 -Response $_.Exception.Message
            Write-Host "Verification failed: No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

$uniqueId = (Get-Date -Format "yyyyMMddHHmmssfff")
$testCategoryNameEn = "Test Category English $uniqueId"
$testCategoryNameBn = "Test Category Bengali $uniqueId"
$createdCategoryId = $null

# Test 6: Create a new category (POST /api/categories)
Write-Host "TEST 6: POST /api/categories - Create a new category" -ForegroundColor Magenta
$categoryData = @{
    name_en = $testCategoryNameEn
    name_bn = $testCategoryNameBn
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/categories" -Method Post -Headers $headers -Body $categoryData -ErrorAction Stop
    Write-Result -TestName "Create Category" -StatusCode 201 -Response $response
    
    if ($response.id -and $response.name_en -eq $testCategoryNameEn) {
        Write-Host "Verification successful: Category created with ID $($response.id) and correct English name." -ForegroundColor Green
        $createdCategoryId = $response.id
    } else {
        Write-Host "Verification failed: Category not created as expected." -ForegroundColor Red
    }
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $statusCode = $errorResponse.StatusCode.Value__
        $errorMessage = $_.ErrorDetails.Message
        Write-Result -TestName "Create Category" -StatusCode $statusCode -Response $errorMessage
        if ($statusCode -eq 409) {
            Write-Host "Category '$testCategoryNameEn' already exists. Skipping creation and attempting to find existing for cleanup." -ForegroundColor Yellow
            # Attempt to find the existing category for cleanup
            try {
                $existingCategories = Invoke-RestMethod -Uri "$baseUrl/categories" -Method Get -Headers $headers -ErrorAction Stop
                $existingCategory = $existingCategories | Where-Object { $_.name_en -eq $testCategoryNameEn }
                if ($existingCategory) {
                    $createdCategoryId = $existingCategory.id
                    Write-Host "Found existing category ID: $createdCategoryId for cleanup." -ForegroundColor Green
                }
            } catch {
                Write-Host "Failed to find existing category for cleanup. Error: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "Failed to create category. HTTP Status Code: $statusCode. Error: $errorMessage" -ForegroundColor Red
        }
    } else {
        Write-Result -TestName "Create Category" -StatusCode 0 -Response $_.Exception.Message
        Write-Host "Failed to create category. No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 7: Update the created category (PUT /api/categories/:id)
if ($createdCategoryId) {
    Write-Host "TEST 7: PUT /api/categories/$createdCategoryId - Update the created category" -ForegroundColor Magenta
    $updatedCategoryNameEn = "Updated Category English $uniqueId"
    $updatedCategoryNameBn = "Updated Category Bengali $uniqueId"
    $updateCategoryData = @{
        name_en = $updatedCategoryNameEn
        name_bn = $updatedCategoryNameBn
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/categories/$createdCategoryId" -Method Put -Headers $headers -Body $updateCategoryData -ErrorAction Stop
        Write-Result -TestName "Update Category" -StatusCode 200 -Response $response
        
        if ($response.id -eq $createdCategoryId -and $response.name_en -eq $updatedCategoryNameEn) {
            Write-Host "Verification successful: Category ID $($response.id) updated with new English name." -ForegroundColor Green
        } else {
            Write-Host "Verification failed: Category not updated as expected." -ForegroundColor Red
        }
    } catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $statusCode = $errorResponse.StatusCode.Value__
            $errorMessage = $_.ErrorDetails.Message
            Write-Result -TestName "Update Category" -StatusCode $statusCode -Response $errorMessage
            Write-Host "Failed to update category. HTTP Status Code: $statusCode. Error: $errorMessage" -ForegroundColor Red
        } else {
            Write-Result -TestName "Update Category" -StatusCode 0 -Response $_.Exception.Message
            Write-Host "Failed to update category. No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    # Optional: Verify the update with a GET request
    Write-Host "Verifying update with GET /api/categories/$createdCategoryId" -ForegroundColor DarkYellow
    try {
        $getResponse = Invoke-RestMethod -Uri "$baseUrl/categories/$createdCategoryId" -Method Get -Headers $headers -ErrorAction Stop
        if ($getResponse.name_en -eq $updatedCategoryNameEn) {
            Write-Host "GET verification successful: Retrieved category has the updated English name." -ForegroundColor Green
        } else {
            Write-Host "GET verification failed: Retrieved category does not have the updated English name." -ForegroundColor Red
        }
    } catch {
        Write-Host "GET verification failed. Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Skipping update test as no category was created or found." -ForegroundColor Yellow
}
# Test 7: Delete the created category (DELETE /api/categories/:id)
if ($createdCategoryId) {
    Write-Host "TEST 8: DELETE /api/categories/$createdCategoryId - Delete the created category" -ForegroundColor Magenta
    try {
        Invoke-RestMethod -Uri "$baseUrl/categories/$createdCategoryId" -Method Delete -Headers $headers -ErrorAction Stop
        Write-Result -TestName "Delete Category" -StatusCode 204 -Response "Category successfully deleted."
        Write-Host "Verification successful: Category '$createdCategoryId' successfully deleted (expected 204 No Content)." -ForegroundColor Green
    } catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $statusCode = $errorResponse.StatusCode.Value__
            $errorMessage = $_.ErrorDetails.Message
            Write-Result -TestName "Delete Category" -StatusCode $statusCode -Response $errorMessage
            Write-Host "Failed to delete category. HTTP Status Code: $statusCode. Error: $errorMessage" -ForegroundColor Red
        } else {
            Write-Result -TestName "Delete Category" -StatusCode 0 -Response $_.Exception.Message
            Write-Host "Failed to delete category. No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Skipping deletion test as no category was created or found." -ForegroundColor Yellow
}

# Test 8: Delete a non-existent category (DELETE /api/categories/:id)
$nonExistentDeleteId = 99999 # Assuming this ID does not exist
Write-Host "TEST 9: DELETE /api/categories/$nonExistentDeleteId - Delete non-existent category" -ForegroundColor Magenta
try {
    Invoke-RestMethod -Uri "$baseUrl/categories/$nonExistentDeleteId" -Method Delete -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Delete Non-Existent Category" -StatusCode 200 -Response "Unexpected success (expected 404)"
    Write-Host "Verification failed: Expected 404 Not Found, but got 200 OK." -ForegroundColor Red
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $statusCode = $errorResponse.StatusCode.Value__
        $errorMessage = $_.ErrorDetails.Message
        Write-Result -TestName "Delete Non-Existent Category" -StatusCode $statusCode -Response $errorMessage
        if ($statusCode -eq 404) {
            Write-Host "Verification successful: Received 404 Not Found for non-existent category deletion." -ForegroundColor Green
        } else {
            Write-Host "Verification failed: Expected 404 Not Found, but got $statusCode." -ForegroundColor Red
        }
    } else {
        Write-Result -TestName "Delete Non-Existent Category" -StatusCode 0 -Response $_.Exception.Message
        Write-Host "Verification failed: No HTTP response received. Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nCategory API testing completed!" -ForegroundColor Green