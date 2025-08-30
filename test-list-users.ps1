# test-list-users.ps1
# PowerShell script to test the GET /api/users endpoint

# Base configuration
$baseUrl = "http://localhost:3000"
$usersUrl = "$baseUrl/api/users"
$loginUrl = "$baseUrl/api/auth/login"
$registerUrl = "$baseUrl/api/auth/register"

# Function to display test results (copied from other test scripts)
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
        $response = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $loginBody -Headers $headers -ContentType "application/json"
        $token = $response.token
        $token | Out-File -FilePath "auth-token.txt" -Encoding UTF8
        Write-Host "Successfully logged in $Email and saved new token to auth-token.txt" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
        Write-Host "Login failed for $Email. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
    return $token
}

# --- Setup: Get Admin and Regular User Tokens ---
Write-Host "--- Setup: Get Admin and Regular User Tokens ---" -ForegroundColor DarkCyan

# Admin User Credentials (seeded in the database)
$adminEmail = "admin@example.com"
$adminPassword = "admin"

# Regular User Credentials (will be registered if not exists)
$regularUserEmail = "regular_testuser_$(Get-Date -Format "yyyyMMddHHmmss")@example.com"
$regularUserPassword = "regularpassword123"
$regularUserDisplayName = "Regular Test User"

# Get Admin Token
Write-Host "Attempting to get admin token for $adminEmail..." -ForegroundColor DarkYellow
$adminToken = Get-AuthToken -Email $adminEmail -Password $adminPassword

if (-not $adminToken) {
    Write-Host "Failed to obtain admin authentication token. Ensure the admin user ($adminEmail) exists and has the correct password." -ForegroundColor Red
    exit 1
}

# Register or Login Regular User to get a token for non-admin tests
Write-Host "Attempting to register or log in a regular user for testing..." -ForegroundColor DarkYellow
$registerRegularUser = @{
    email = $regularUserEmail
    password = $regularUserPassword
    displayName = $regularUserDisplayName
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $registerUrl -Method Post -Body $registerRegularUser -Headers @{"Content-Type" = "application/json"} -ContentType "application/json"
    Write-Host "Regular user registered successfully: $($response.user.email)" -ForegroundColor Green
    $regularUserToken = $response.token
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    if ($statusCode -eq 409) {
        Write-Host "Regular user already registered. Attempting to log in to get token." -ForegroundColor Yellow
        $regularUserToken = Get-AuthToken -Email $regularUserEmail -Password $regularUserPassword
    } else {
        Write-Host "Regular user registration failed unexpectedly. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
}

if (-not $regularUserToken) {
    Write-Host "Failed to obtain a regular user authentication token. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "Setup complete. Proceeding with tests.`n"

if (-not $adminToken) {
    Write-Host "Failed to obtain an admin authentication token. Ensure an admin user exists and credentials are correct." -ForegroundColor Red
    exit 1
}

Write-Host "Setup complete. Proceeding with tests.`n"

# --- Test 1: List Users (Authenticated as Admin) ---
Write-Host "TEST 1: GET /api/users (Authenticated as Admin)" -ForegroundColor Magenta
$adminHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $adminToken"
}

try {
    $response = Invoke-RestMethod -Uri $usersUrl -Method Get -Headers $adminHeaders -ContentType "application/json"
    Write-TestResult -TestName "List users as admin" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully listed users as admin."
    if ($response.users.Count -gt 0) {
        Write-Host "Found $($response.users.Count) users." -ForegroundColor Green
    } else {
        Write-Host "No users found." -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "List users as admin" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to list users as admin."
}

# --- Test 2: List Users (Authenticated as Non-Admin) ---
Write-Host "TEST 2: GET /api/users (Authenticated as Non-Admin)" -ForegroundColor Magenta
$regularUserHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $regularUserToken"
}

try {
    $response = Invoke-RestMethod -Uri $usersUrl -Method Get -Headers $regularUserHeaders -ContentType "application/json"
    Write-TestResult -TestName "List users as non-admin" -ExpectedStatusCode 403 -ActualStatusCode 200 -Response $response -Message "Expected 403, but got 200 (access granted to non-admin)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "List users as non-admin" -ExpectedStatusCode 403 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access to non-admin."
}

# --- Test 3: List Users (Unauthenticated - No Token) ---
Write-Host "TEST 3: GET /api/users (Unauthenticated - No Token)" -ForegroundColor Magenta
$unauthHeaders = @{"Content-Type" = "application/json"} # No Authorization header

try {
    $response = Invoke-RestMethod -Uri $usersUrl -Method Get -Headers $unauthHeaders -ContentType "application/json"
    Write-TestResult -TestName "List users without token" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (access granted without token)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "List users without token" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access without token."
}

# --- Test 4: List Users (Unauthenticated - Invalid Token) ---
Write-Host "TEST 4: GET /api/users (Unauthenticated - Invalid Token)" -ForegroundColor Magenta
$invalidToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMCwiaWF0IjoxNTE2MjM5MDIyfQ.invalidSignature"
$invalidHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = $invalidToken
}

try {
    $response = Invoke-RestMethod -Uri $usersUrl -Method Get -Headers $invalidHeaders -ContentType "application/json"
    Write-TestResult -TestName "List users with invalid token" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (access granted with invalid token)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "List users with invalid token" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access with invalid token."
}

Write-Host "`nAll GET /api/users endpoint tests completed." -ForegroundColor Green