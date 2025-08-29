# test-profile.ps1
# PowerShell script to test the GET /api/auth/profile endpoint

# Base configuration
$baseUrl = "http://localhost:3000"
$profileUrl = "$baseUrl/api/auth/profile"
$loginUrl = "$baseUrl/api/auth/login" # Needed to get a fresh token if auth-token.txt is missing or expired

# Function to display test results (copied from test-login.ps1)
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
    if (Test-Path "auth-token.txt") {
        $token = Get-Content "auth-token.txt" -Raw
        Write-Host "Using token from auth-token.txt" -ForegroundColor DarkGreen
    } else {
        Write-Host "auth-token.txt not found or empty. Attempting to log in..." -ForegroundColor Yellow
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
            Write-Host "Successfully logged in and saved new token to auth-token.txt" -ForegroundColor Green
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.Value__
            $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
            Write-Host "Login failed to get token. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
            exit 1
        }
    }
    return $token
}

# --- Test 1: Get User Profile (Authenticated) ---
Write-Host "TEST 1: GET /api/auth/profile (Authenticated)" -ForegroundColor Magenta

# Replace with actual test user credentials for login if auth-token.txt is missing
$testEmail = "testuser_$(Get-Date -Format "yyyyMMddHHmmss")@example.com" # Use a unique email for registration
$testPassword = "password123"

# First, ensure a user is registered and logged in to get a token
# This part is adapted from test-login.ps1 to ensure a token exists
$registerUrl = "$baseUrl/api/auth/register"
$registerUser = @{
    email = $testEmail
    password = $testPassword
    displayName = "Profile Test User"
}
$registerBody = $registerUser | ConvertTo-Json
$registerHeaders = @{"Content-Type" = "application/json"}

Write-Host "Attempting to register a new user for testing..." -ForegroundColor DarkYellow
try {
    $response = Invoke-RestMethod -Uri $registerUrl -Method Post -Body $registerBody -Headers $registerHeaders -ContentType "application/json"
    Write-Host "User registered successfully: $($response.user.email)" -ForegroundColor Green
    $authToken = $response.token
    $authToken | Out-File -FilePath "auth-token.txt" -Encoding UTF8
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    if ($statusCode -eq 409) {
        Write-Host "User already registered. Attempting to log in to get token." -ForegroundColor Yellow
        $authToken = Get-AuthToken -Email $testEmail -Password $testPassword
    } else {
        Write-Host "Registration failed unexpectedly. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
}

if (-not $authToken) {
    Write-Host "Failed to obtain an authentication token. Exiting." -ForegroundColor Red
    exit 1
}

$profileHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $authToken"
}

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Get -Headers $profileHeaders -ContentType "application/json"
    Write-TestResult -TestName "Get user profile with valid token" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully retrieved user profile."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Get user profile with valid token" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to retrieve user profile with valid token."
}

# --- Test 2: Get User Profile (Unauthenticated - No Token) ---
Write-Host "TEST 2: GET /api/auth/profile (Unauthenticated - No Token)" -ForegroundColor Magenta
$unauthHeaders = @{"Content-Type" = "application/json"} # No Authorization header

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Get -Headers $unauthHeaders -ContentType "application/json"
    Write-TestResult -TestName "Get user profile without token" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (access granted without token)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Get user profile without token" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access without token."
}

# --- Test 3: Get User Profile (Unauthenticated - Invalid Token) ---
Write-Host "TEST 3: GET /api/auth/profile (Unauthenticated - Invalid Token)" -ForegroundColor Magenta
$invalidToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMCwiaWF0IjoxNTE2MjM5MDIyfQ.invalidSignature"
$invalidHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = $invalidToken
}

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Get -Headers $invalidHeaders -ContentType "application/json"
    Write-TestResult -TestName "Get user profile with invalid token" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (access granted with invalid token)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Get user profile with invalid token" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access with invalid token."
}

Write-Host "`nAll profile endpoint tests completed." -ForegroundColor Green