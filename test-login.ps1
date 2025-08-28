# test-login.ps1
# PowerShell script to test the login endpoint of the Information Dissemination Platform

# Base configuration
$baseUrl = "http://localhost:3000"
$loginUrl = "$baseUrl/api/auth/login"

# Test credentials - replace with actual test user credentials
# Base configuration
$baseUrl = "http://localhost:3000"
$loginUrl = "$baseUrl/api/auth/login"
$registerUrl = "$baseUrl/api/auth/register"
$logoutUrl = "$baseUrl/api/auth/logout"
$protectedArticleUrl = "$baseUrl/api/articles" # A protected endpoint to test token invalidation

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

# --- Test 1: User Registration (Success) ---
$uniqueEmail = "testuser_$(Get-Date -Format "yyyyMMddHHmmss")@example.com"
$registerUser = @{
    email = $uniqueEmail
    password = "password123"
    displayName = "Test User"
}
$registerBody = $registerUser | ConvertTo-Json
$registerHeaders = @{"Content-Type" = "application/json"}

Write-Host "TEST 1: POST /api/auth/register (Successful Registration)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri $registerUrl -Method Post -Body $registerBody -Headers $registerHeaders -ContentType "application/json"
    $registerToken = $response.token
    Write-TestResult -TestName "Register new user" -ExpectedStatusCode 201 -ActualStatusCode 201 -Response $response -Message "User registered successfully."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Register new user" -ExpectedStatusCode 201 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Registration failed unexpectedly."
    exit 1 # Exit if registration fails, as subsequent tests depend on it
}

# --- Test 2: User Registration (Duplicate Email) ---
Write-Host "TEST 2: POST /api/auth/register (Duplicate Email)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri $registerUrl -Method Post -Body $registerBody -Headers $registerHeaders -ContentType "application/json"
    Write-TestResult -TestName "Register duplicate user" -ExpectedStatusCode 409 -ActualStatusCode 201 -Response $response -Message "Expected 409, but got 201."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Register duplicate user" -ExpectedStatusCode 409 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly rejected duplicate email."
}

# --- Test 3: User Login (Success) ---
$loginUser = @{
    email = $uniqueEmail
    password = "password123"
}
$loginBody = $loginUser | ConvertTo-Json

Write-Host "TEST 3: POST /api/auth/login (Successful Login)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $loginBody -Headers $registerHeaders -ContentType "application/json"
    $authToken = $response.token
    $authToken | Out-File -FilePath "auth-token.txt" -Encoding UTF8
    Write-TestResult -TestName "Login with registered user" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Login successful. Token saved to auth-token.txt"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Login with registered user" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Login failed unexpectedly."
    exit 1 # Exit if login fails, as subsequent tests depend on it
}

# --- Test 4: User Logout ---
Write-Host "TEST 4: POST /api/auth/logout" -ForegroundColor Magenta
$logoutHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $authToken"
}
try {
    $response = Invoke-RestMethod -Uri $logoutUrl -Method Post -Headers $logoutHeaders -ContentType "application/json"
    $authToken = $null # Simulate client-side token removal
    # Remove-Item -Path "auth-token.txt" -ErrorAction SilentlyContinue # Keep token for subsequent tests
    Write-TestResult -TestName "Logout user" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Logout successful. Token cleared client-side."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Logout user" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Logout failed unexpectedly."
}

# --- Test 5: Access Protected Endpoint After Logout (Expect 401) ---
Write-Host "TEST 5: GET /api/articles (After Logout)" -ForegroundColor Magenta
$protectedHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $authToken" # This should be null or invalid now
}
try {
    $response = Invoke-RestMethod -Uri $protectedArticleUrl -Method Get -Headers $protectedHeaders -ContentType "application/json"
    Write-TestResult -TestName "Access protected endpoint after logout" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (access granted after logout)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "Access protected endpoint after logout" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access after logout."
}

Write-Host "`nAll authentication tests completed." -ForegroundColor Green