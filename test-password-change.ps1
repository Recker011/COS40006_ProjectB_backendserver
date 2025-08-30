# test-password-change.ps1
# PowerShell script to test the PUT /api/auth/password endpoint

# Base configuration
$baseUrl = "http://localhost:3000"
$passwordChangeUrl = "$baseUrl/api/auth/password"
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
$testEmail = "passwordchange_testuser_$(Get-Date -Format "yyyyMMddHHmmss")@example.com"
$testPassword = "password123"
$initialDisplayName = "Password Change User"

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

# --- Test 1: Change Password (Successful) ---
Write-Host "TEST 1: PUT /api/auth/password (Successful Change)" -ForegroundColor Magenta
$newPassword = "newpassword123"
$passwordChangeBody = @{
    oldPassword = $testPassword
    newPassword = $newPassword
    confirmNewPassword = $newPassword
} | ConvertTo-Json

$passwordChangeHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $authToken"
}

try {
    $response = Invoke-RestMethod -Uri $passwordChangeUrl -Method Put -Body $passwordChangeBody -Headers $passwordChangeHeaders -ContentType "application/json"
    Write-TestResult -TestName "Change password with valid credentials" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully changed password."
    $testPassword = $newPassword # Update test password for subsequent tests
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Change password with valid credentials" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to change password with valid input."
}

# --- Test 2: Change Password (Invalid Old Password) ---
Write-Host "TEST 2: PUT /api/auth/password (Invalid Old Password)" -ForegroundColor Magenta
$invalidOldPassword = "wrongpassword"
$passwordChangeBodyInvalidOld = @{
    oldPassword = $invalidOldPassword
    newPassword = "anothernewpassword"
    confirmNewPassword = "anothernewpassword"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $passwordChangeUrl -Method Put -Body $passwordChangeBodyInvalidOld -Headers $passwordChangeHeaders -ContentType "application/json"
    Write-TestResult -TestName "Change password with invalid old password" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (password changed with invalid old password)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Change password with invalid old password" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly rejected invalid old password."
}

# --- Test 3: Change Password (New Passwords Mismatch) ---
Write-Host "TEST 3: PUT /api/auth/password (New Passwords Mismatch)" -ForegroundColor Magenta
$passwordChangeBodyMismatch = @{
    oldPassword = $testPassword
    newPassword = "mismatch1"
    confirmNewPassword = "mismatch2"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $passwordChangeUrl -Method Put -Body $passwordChangeBodyMismatch -Headers $passwordChangeHeaders -ContentType "application/json"
    Write-TestResult -TestName "Change password with new passwords mismatch" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response -Message "Expected 400, but got 200 (password changed with mismatching new passwords)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Change password with new passwords mismatch" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly rejected mismatching new passwords."
}

# --- Test 4: Change Password (New Password Too Short) ---
Write-Host "TEST 4: PUT /api/auth/password (New Password Too Short)" -ForegroundColor Magenta
$passwordChangeBodyTooShort = @{
    oldPassword = $testPassword
    newPassword = "short"
    confirmNewPassword = "short"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $passwordChangeUrl -Method Put -Body $passwordChangeBodyTooShort -Headers $passwordChangeHeaders -ContentType "application/json"
    Write-TestResult -TestName "Change password with new password too short" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response -Message "Expected 400, but got 200 (password changed with too short new password)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Change password with new password too short" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly rejected too short new password."
}

# --- Test 5: Change Password (New Password Same as Old) ---
Write-Host "TEST 5: PUT /api/auth/password (New Password Same as Old)" -ForegroundColor Magenta
$passwordChangeBodySameAsOld = @{
    oldPassword = $testPassword
    newPassword = $testPassword
    confirmNewPassword = $testPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $passwordChangeUrl -Method Put -Body $passwordChangeBodySameAsOld -Headers $passwordChangeHeaders -ContentType "application/json"
    Write-TestResult -TestName "Change password with new password same as old" -ExpectedStatusCode 400 -ActualStatusCode 200 -Response $response -Message "Expected 400, but got 200 (password changed to same as old)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Change password with new password same as old" -ExpectedStatusCode 400 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly rejected new password same as old."
}

# --- Test 6: Change Password (Unauthenticated - No Token) ---
Write-Host "TEST 6: PUT /api/auth/password (Unauthenticated - No Token)" -ForegroundColor Magenta
$unauthBody = @{
    oldPassword = "anypassword"
    newPassword = "newunauthpassword"
    confirmNewPassword = "newunauthpassword"
} | ConvertTo-Json
$unauthHeaders = @{"Content-Type" = "application/json"} # No Authorization header

try {
    $response = Invoke-RestMethod -Uri $passwordChangeUrl -Method Put -Body $unauthBody -Headers $unauthHeaders -ContentType "application/json"
    Write-TestResult -TestName "Change password without token" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (password changed without token)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Change password without token" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access without token."
}

# --- Test 7: Change Password (Unauthenticated - Invalid Token) ---
Write-Host "TEST 7: PUT /api/auth/password (Unauthenticated - Invalid Token)" -ForegroundColor Magenta
$invalidToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMCwiaWF0IjoxNTE2MjM5MDIyfQ.invalidSignature"
$invalidTokenHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = $invalidToken
}
$invalidTokenBody = @{
    oldPassword = "anypassword"
    newPassword = "newinvalidtokenpassword"
    confirmNewPassword = "newinvalidtokenpassword"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $passwordChangeUrl -Method Put -Body $invalidTokenBody -Headers $invalidTokenHeaders -ContentType "application/json"
    Write-TestResult -TestName "Change password with invalid token" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (password changed with invalid token)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Change password with invalid token" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access with invalid token."
}

Write-Host "`nAll PUT /api/auth/password tests completed." -ForegroundColor Green