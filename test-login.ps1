# test-login.ps1
# PowerShell script to test the login endpoint of the Information Dissemination Platform

# Base configuration
$baseUrl = "http://localhost:3000"
$loginUrl = "$baseUrl/api/auth/login"

# Test credentials - replace with actual test user credentials
$testUser = @{
    email = "admin@example.com"
    password = "admin"
}

Write-Host "Testing login endpoint at $loginUrl" -ForegroundColor Green
Write-Host "Using test credentials:" -ForegroundColor Yellow
Write-Host "Email: $($testUser.email)" -ForegroundColor Yellow
Write-Host "Password: $($testUser.password.Substring(0,1))********" -ForegroundColor Yellow

# Create JSON body
$body = $testUser | ConvertTo-Json

# Set headers
$headers = @{
    "Content-Type" = "application/json"
}

try {
    # Make the login request
    Write-Host "`nSending login request..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $body -Headers $headers -ContentType "application/json"
    
    # Display response
    Write-Host "`nLogin successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    
    # Display user information
    Write-Host "User ID: $($response.user.id)" -ForegroundColor White
    Write-Host "Email: $($response.user.email)" -ForegroundColor White
    Write-Host "Display Name: $($response.user.displayName)" -ForegroundColor White
    Write-Host "Role: $($response.user.role)" -ForegroundColor White
    
    # Display token info (without showing full token)
    Write-Host "Token: $($response.token.Substring(0,20))...[truncated]" -ForegroundColor White
    Write-Host "Token expires in: $($response.expiresIn) seconds" -ForegroundColor White
    
    # Save token to file for reuse in other tests
    $response.token | Out-File -FilePath "auth-token.txt" -Encoding UTF8
    Write-Host "`nToken saved to auth-token.txt" -ForegroundColor Green
    
} catch {
    # Handle different error scenarios
    Write-Host "`nLogin failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Check if we have a response object
    if ($_.Exception.Response) {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $reader.ReadToEnd()
        
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
        
        # Try to parse JSON response if possible
        try {
            $errorResponse = $responseBody | ConvertFrom-Json
            Write-Host "Server Error: $($errorResponse.error)" -ForegroundColor Red
        } catch {
            Write-Host "Could not parse error response as JSON" -ForegroundColor DarkRed
        }
    }
}

Write-Host "`nTest completed." -ForegroundColor Green