# test-update-profile.ps1
# PowerShell script to test the PUT /api/auth/profile endpoint

# Base configuration
$baseUrl = "http://localhost:3000"
$profileUrl = "$baseUrl/api/auth/profile"
$loginUrl = "$baseUrl/api/auth/login"
$registerUrl = "$baseUrl/api/auth/register"

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

# --- Setup: Register and Login a Test User ---
Write-Host "--- Setup: Register and Login a Test User ---" -ForegroundColor DarkCyan
$testEmail = "updateprofile_testuser_$(Get-Date -Format "yyyyMMddHHmmss")@example.com"
$testPassword = "password123"
$initialDisplayName = "Initial Display Name"

$registerUser = @{
    email = $testEmail
    password = $testPassword
    displayName = $initialDisplayName
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

Write-Host "Setup complete. Proceeding with tests.`n"

# --- Test 1: Update User Profile (Successful) ---
Write-Host "TEST 1: PUT /api/auth/profile (Successful Update)" -ForegroundColor Magenta
$newDisplayName = "Updated Display Name"
$updateBody = @{
    display_name = $newDisplayName
} | ConvertTo-Json

$updateHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $authToken"
}

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Put -Body $updateBody -Headers $updateHeaders -ContentType "application/json"
    Write-TestResult -TestName "Update user profile with valid display_name" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully updated display_name."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Update user profile with valid display_name" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to update display_name with valid input."
}

# --- Test 2: Update User Profile (Invalid Input - Empty display_name) ---
Write-Host "TEST 2: PUT /api/auth/profile (Invalid Input - Empty display_name)" -ForegroundColor Magenta
$invalidDisplayNameEmpty = ""
$updateBodyEmpty = @{
    display_name = $invalidDisplayNameEmpty
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Put -Body $updateBodyEmpty -Headers $updateHeaders -ContentType "application/json"
    Write-TestResult -TestName "Update user profile with empty display_name" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response -Message "Expected 400, but got 200 (updated with empty display_name)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Update user profile with empty display_name" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly rejected empty display_name."
}

# --- Test 3: Update User Profile (Invalid Input - Too Short display_name) ---
Write-Host "TEST 3: PUT /api/auth/profile (Invalid Input - Too Short display_name)" -ForegroundColor Magenta
$invalidDisplayNameShort = "ab" # Less than 3 characters
$updateBodyShort = @{
    display_name = $invalidDisplayNameShort
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Put -Body $updateBodyShort -Headers $updateHeaders -ContentType "application/json"
    Write-TestResult -TestName "Update user profile with too short display_name" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response -Message "Expected 400, but got 200 (updated with too short display_name)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Update user profile with too short display_name" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly rejected too short display_name."
}

# --- Test 4: Update User Profile (Invalid Input - Too Long display_name) ---
Write-Host "TEST 4: PUT /api/auth/profile (Invalid Input - Too Long display_name)" -ForegroundColor Magenta
$invalidDisplayNameLong = "a" * 51 # More than 50 characters
$updateBodyLong = @{
    display_name = $invalidDisplayNameLong
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Put -Body $updateBodyLong -Headers $updateHeaders -ContentType "application/json"
    Write-TestResult -TestName "Update user profile with too long display_name" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response -Message "Expected 400, but got 200 (updated with too long display_name)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Update user profile with too long display_name" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly rejected too long display_name."
}

# --- Test 5: Update User Profile (Unauthenticated - No Token) ---
Write-Host "TEST 5: PUT /api/auth/profile (Unauthenticated - No Token)" -ForegroundColor Magenta
$unauthBody = @{
    display_name = "Unauthorized Name"
} | ConvertTo-Json
$unauthHeaders = @{"Content-Type" = "application/json"} # No Authorization header

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Put -Body $unauthBody -Headers $unauthHeaders -ContentType "application/json"
    Write-TestResult -TestName "Update user profile without token" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (access granted without token)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Update user profile without token" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access without token."
}

# --- Test 6: Update User Profile (Unauthenticated - Invalid Token) ---
Write-Host "TEST 6: PUT /api/auth/profile (Unauthenticated - Invalid Token)" -ForegroundColor Magenta
$invalidToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMCwiaWF0IjoxNTE2MjM5MDIyfQ.invalidSignature"
$invalidTokenHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = $invalidToken
}
$invalidTokenBody = @{
    display_name = "Invalid Token Name"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $profileUrl -Method Put -Body $invalidTokenBody -Headers $invalidTokenHeaders -ContentType "application/json"
    Write-TestResult -TestName "Update user profile with invalid token" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (access granted with invalid token)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Update user profile with invalid token" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access with invalid token."
}

Write-Host "`nAll PUT /api/auth/profile tests completed." -ForegroundColor Green