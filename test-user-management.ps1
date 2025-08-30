# test-user-management.ps1
# PowerShell script to test the new user management endpoints

# Base configuration
$baseUrl = "http://localhost:3000"
$usersBaseUrl = "$baseUrl/api/users"
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

# --- Helper Function: Register User ---
function Register-User {
    param([string]$Email, [string]$Password, [string]$DisplayName, [string]$Role = "reader")
    $token = $null
    $userId = $null

    Write-Host "Attempting to register user $Email with role $Role..." -ForegroundColor Yellow
    
    $registerUser = @{
        email = $Email
        password = $Password
        displayName = $DisplayName
        role = $Role # Role is not directly settable on register, will be 'reader' by default
    }
    $registerBody = $registerUser | ConvertTo-Json
    $headers = @{"Content-Type" = "application/json"}

    try {
        $response = Invoke-RestMethod -Uri $registerUrl -Method Post -Body $registerBody -Headers $headers -ContentType "application/json"
        Write-Host "User registered successfully: $($response.user.email)" -ForegroundColor Green
        $token = $response.token
        $userId = $response.user.id
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
        if ($statusCode -eq 409) {
            Write-Host "User $Email already registered. Attempting to log in to get token." -ForegroundColor Yellow
            $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Body (ConvertTo-Json @{email=$Email; password=$Password}) -Headers $headers -ContentType "application/json"
            $token = $loginResponse.token
            $userId = $loginResponse.user.id
        } else {
            Write-Host "User registration failed unexpectedly. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
            exit 1
        }
    }
    return @{ Token = $token; UserId = $userId }
}

# --- Setup: Get Admin, Editor, and Regular User Tokens and IDs ---
Write-Host "--- Setup: Get Admin, Editor, and Regular User Tokens and IDs ---" -ForegroundColor DarkCyan

# Admin User Credentials (seeded in the database)
$adminEmail = "admin@example.com"
$adminPassword = "admin"

# Editor User Credentials
$editorEmail = "editor_testuser_$(Get-Date -Format "yyyyMMddHHmmss")@example.com"
$editorPassword = "editorpassword123"
$editorDisplayName = "Editor Test User"

# Regular User Credentials
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

# Register or Login Editor User
Write-Host "Attempting to register or log in an editor user for testing..." -ForegroundColor DarkYellow
$editorUserResult = Register-User -Email $editorEmail -Password $editorPassword -DisplayName $editorDisplayName
$editorToken = $editorUserResult.Token
$editorUserId = $editorUserResult.UserId

# Register or Login Regular User
Write-Host "Attempting to register or log in a regular user for testing..." -ForegroundColor DarkYellow
$regularUserResult = Register-User -Email $regularUserEmail -Password $regularUserPassword -DisplayName $regularUserDisplayName
$regularUserToken = $regularUserResult.Token
$regularUserId = $regularUserResult.UserId

# Update Editor and Regular User roles to 'editor' and 'reader' respectively (requires admin token)
Write-Host "Updating roles for editor and regular users..." -ForegroundColor DarkYellow
$adminHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $adminToken"
}

# Update Editor Role
try {
    $updateEditorBody = @{ displayName = $editorDisplayName; email = $editorEmail; role = "editor" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$usersBaseUrl/$editorUserId" -Method Put -Body $updateEditorBody -Headers $adminHeaders -ContentType "application/json"
    Write-Host "Editor user role updated to 'editor'." -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-Host "Failed to update editor role. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
    exit 1
}

# Update Regular User Role (ensure it's 'reader' if not already)
try {
    $updateRegularUserBody = @{ displayName = $regularUserDisplayName; email = $regularUserEmail; role = "reader" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId" -Method Put -Body $updateRegularUserBody -Headers $adminHeaders -ContentType "application/json"
    Write-Host "Regular user role updated to 'reader'." -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-Host "Failed to update regular user role. Status: $statusCode, Response: $($responseBody | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Red
    exit 1
}

Write-Host "Setup complete. Proceeding with tests.`n"

# --- Common Headers ---
$adminHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $adminToken"
}
$editorHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $editorToken"
}
$regularUserHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $regularUserToken"
}
$unauthHeaders = @{"Content-Type" = "application/json"}
$invalidToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMCwiaWF0IjoxNTE2MjM5MDIyfQ.invalidSignature"
$invalidHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = $invalidToken
}

# --- Test 1: GET /api/users/:id (Get Specific User Details) ---
Write-Host "--- Test: GET /api/users/:id ---" -ForegroundColor DarkYellow

# Test 1.1: As Admin, get Editor user details (Expected: 200 OK)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$editorUserId" -Method Get -Headers $adminHeaders -ContentType "application/json"
    Write-TestResult -TestName "GET /api/users/:id as Admin (Editor User)" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully retrieved editor user details as admin."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "GET /api/users/:id as Admin (Editor User)" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to retrieve editor user details as admin."
}

# Test 1.2: As Editor, get Regular user details (Expected: 200 OK)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId" -Method Get -Headers $editorHeaders -ContentType "application/json"
    Write-TestResult -TestName "GET /api/users/:id as Editor (Regular User)" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully retrieved regular user details as editor."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "GET /api/users/:id as Editor (Regular User)" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to retrieve regular user details as editor."
}

# Test 1.3: As Regular User, get Admin user details (Expected: 403 Forbidden)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$adminUserId" -Method Get -Headers $regularUserHeaders -ContentType "application/json"
    Write-TestResult -TestName "GET /api/users/:id as Regular User (Admin User)" -ExpectedStatusCode 403 -ActualStatusCode 200 -Response $response -Message "Expected 403, but got 200 (access granted to regular user)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "GET /api/users/:id as Regular User (Admin User)" -ExpectedStatusCode 403 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access to regular user."
}

# Test 1.4: Unauthenticated, get any user details (Expected: 401 Unauthorized)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$adminUserId" -Method Get -Headers $unauthHeaders -ContentType "application/json"
    Write-TestResult -TestName "GET /api/users/:id Unauthenticated" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (access granted unauthenticated)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "GET /api/users/:id Unauthenticated" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied access unauthenticated."
}

# --- Test 2: PUT /api/users/:id (Update User) ---
Write-Host "--- Test: PUT /api/users/:id ---" -ForegroundColor DarkYellow

# Test 2.1: As Admin, update Regular user's display name (Expected: 200 OK)
$updatedDisplayName = "Updated Regular User"
$updateBody = @{ displayName = $updatedDisplayName; email = $regularUserEmail; role = "reader" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId" -Method Put -Body $updateBody -Headers $adminHeaders -ContentType "application/json"
    Write-TestResult -TestName "PUT /api/users/:id as Admin (Update Display Name)" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully updated regular user's display name as admin."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "PUT /api/users/:id as Admin (Update Display Name)" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to update regular user's display name as admin."
}

# Test 2.2: As Editor, update Regular user (Expected: 403 Forbidden)
$editorUpdateBody = @{ displayName = "Editor Trying to Update"; email = $regularUserEmail; role = "reader" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId" -Method Put -Body $editorUpdateBody -Headers $editorHeaders -ContentType "application/json"
    Write-TestResult -TestName "PUT /api/users/:id as Editor" -ExpectedStatusCode 403 -ActualStatusCode 200 -Response $response -Message "Expected 403, but got 200 (editor updated user)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "PUT /api/users/:id as Editor" -ExpectedStatusCode 403 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied editor access to update user."
}

# Test 2.3: Unauthenticated, update user (Expected: 401 Unauthorized)
$unauthUpdateBody = @{ displayName = "Unauth Trying to Update"; email = $regularUserEmail; role = "reader" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId" -Method Put -Body $unauthUpdateBody -Headers $unauthHeaders -ContentType "application/json"
    Write-TestResult -TestName "PUT /api/users/:id Unauthenticated" -ExpectedStatusCode 401 -ActualStatusCode 200 -Response $response -Message "Expected 401, but got 200 (unauthenticated updated user)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "PUT /api/users/:id Unauthenticated" -ExpectedStatusCode 401 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied unauthenticated access to update user."
}

# --- Test 3: PUT /api/users/:id/activate (Activate/Deactivate User) ---
Write-Host "--- Test: PUT /api/users/:id/activate ---" -ForegroundColor DarkYellow

# Test 3.1: As Admin, deactivate Regular user (Expected: 200 OK)
$deactivateBody = @{ isActive = $false } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId/activate" -Method Put -Body $deactivateBody -Headers $adminHeaders -ContentType "application/json"
    Write-TestResult -TestName "PUT /api/users/:id/activate as Admin (Deactivate)" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully deactivated regular user as admin."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "PUT /api/users/:id/activate as Admin (Deactivate)" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to deactivate regular user as admin."
}

# Test 3.2: As Admin, activate Regular user (Expected: 200 OK)
$activateBody = @{ isActive = $true } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId/activate" -Method Put -Body $activateBody -Headers $adminHeaders -ContentType "application/json"
    Write-TestResult -TestName "PUT /api/users/:id/activate as Admin (Activate)" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully activated regular user as admin."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "PUT /api/users/:id/activate as Admin (Activate)" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to activate regular user as admin."
}

# Test 3.3: As Editor, toggle user active status (Expected: 403 Forbidden)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId/activate" -Method Put -Body $deactivateBody -Headers $editorHeaders -ContentType "application/json"
    Write-TestResult -TestName "PUT /api/users/:id/activate as Editor" -ExpectedStatusCode 403 -ActualStatusCode 200 -Response $response -Message "Expected 403, but got 200 (editor toggled user status)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "PUT /api/users/:id/activate as Editor" -ExpectedStatusCode 403 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied editor access to toggle user status."
}

# --- Test 4: DELETE /api/users/:id (Soft Delete User) ---
Write-Host "--- Test: DELETE /api/users/:id ---" -ForegroundColor DarkYellow

# Test 4.1: As Admin, soft delete Regular user (Expected: 200 OK)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$regularUserId" -Method Delete -Headers $adminHeaders -ContentType "application/json"
    Write-TestResult -TestName "DELETE /api/users/:id as Admin (Soft Delete)" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully soft-deleted regular user as admin."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "DELETE /api/users/:id as Admin (Soft Delete)" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to soft-delete regular user as admin."
}

# Test 4.2: As Editor, soft delete user (Expected: 403 Forbidden)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/$editorUserId" -Method Delete -Headers $editorHeaders -ContentType "application/json"
    Write-TestResult -TestName "DELETE /api/users/:id as Editor" -ExpectedStatusCode 403 -ActualStatusCode 200 -Response $response -Message "Expected 403, but got 200 (editor soft-deleted user)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "DELETE /api/users/:id as Editor" -ExpectedStatusCode 403 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied editor access to soft-delete user."
}

# --- Test 5: GET /api/users/stats (User Statistics) ---
Write-Host "--- Test: GET /api/users/stats ---" -ForegroundColor DarkYellow

# Test 5.1: As Admin, get user statistics (Expected: 200 OK)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/stats" -Method Get -Headers $adminHeaders -ContentType "application/json"
    Write-TestResult -TestName "GET /api/users/stats as Admin" -ExpectedStatusCode 200 -ActualStatusCode 200 -Response $response -Message "Successfully retrieved user statistics as admin."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "GET /api/users/stats as Admin" -ExpectedStatusCode 200 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Failed to retrieve user statistics as admin."
}

# Test 5.2: As Editor, get user statistics (Expected: 403 Forbidden)
try {
    $response = Invoke-RestMethod -Uri "$usersBaseUrl/stats" -Method Get -Headers $editorHeaders -ContentType "application/json"
    Write-TestResult -TestName "GET /api/users/stats as Editor" -ExpectedStatusCode 403 -ActualStatusCode 200 -Response $response -Message "Expected 403, but got 200 (editor got user stats)."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $responseBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    Write-TestResult -TestName "GET /api/users/stats as Editor" -ExpectedStatusCode 403 -ActualStatusCode $statusCode -Response ($responseBody | ConvertFrom-Json) -Message "Correctly denied editor access to user statistics."
}

Write-Host "`nAll user management endpoint tests completed." -ForegroundColor Green