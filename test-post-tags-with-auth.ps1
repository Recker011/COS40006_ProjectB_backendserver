# test-post-tags-with-auth.ps1
# PowerShell script to generate a JWT and test the POST /api/tags endpoint with authentication

# --- Step 1: Generate JWT Token using Node.js script ---
Write-Host "Generating JWT token..."
try {
    # Ensure Node.js is installed and 'jsonwebtoken' is in your package.json dependencies.
    # Run 'npm install' in your project root if you haven't already.
    $jwtToken = (node generate-jwt.js).Trim()
    if ([string]::IsNullOrEmpty($jwtToken)) {
        throw "Failed to generate JWT token. Check 'generate-jwt.js' and 'npm install'."
    }
    Write-Host "JWT Token generated successfully."
} catch {
    Write-Error "Error generating JWT token: $($_.Exception.Message)"
    exit 1
}

# --- Step 2: Send POST request to /api/tags with the generated token ---
$uri = "http://localhost:3000/api/tags"
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $jwtToken"
}
$body = @{
    code = "authtag"
    name_en = "Authenticated Tag"
    name_bn = "প্রমাণিত ট্যাগ"
} | ConvertTo-Json

Write-Host "Sending authenticated POST request to $uri"
Write-Host "Body: $($body)"

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
    Write-Host "Request successful!"
    $response | ConvertTo-Json -Depth 100 | Write-Host
} catch {
    Write-Error "Request failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd()
        Write-Error "Response Body: $responseBody"
    }
}