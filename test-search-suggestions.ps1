# test-search-suggestions.ps1
# PowerShell script to test the autocomplete endpoint: GET /api/search/suggestions
#
# PURPOSE:
# - Validates /api/search/suggestions with various query params and scenarios
# - Seeds a deterministic article to ensure predictable suggestions
# - Confirms validation behavior, types filtering, prefix vs infix, perTypeLimit/limit, includeMeta
#
# PREREQUISITES:
# 1. Start the backend server: npm start or npm run dev
# 2. Ensure the server runs on http://localhost:3000
# 3. Seeded admin account exists: admin@example.com / admin
#
# HOW TO USE:
# 1. Save this script in the project root directory
# 2. Open PowerShell in the project directory
# 3. Run: .\test-search-suggestions.ps1
#
# OUTPUT:
# - Displays test name, status code, and response for each step

$baseUrl = "http://localhost:3000/api"
$headers = @{ "Content-Type" = "application/json" }

function Write-Result {
    param([string]$TestName, [int]$StatusCode, [object]$Response)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $TestName" -ForegroundColor Cyan
    Write-Host "Status Code: $StatusCode" -ForegroundColor Yellow
    if ($Response) {
        Write-Host "Response:" -ForegroundColor Green
        try {
            # If it's a string try to parse as JSON for readability; otherwise print raw
            if ($Response -is [string]) {
                $json = $Response | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($null -ne $json) {
                    $json | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
                } else {
                    Write-Host $Response -ForegroundColor White
                }
            } else {
                $Response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
            }
        } catch {
            Write-Host $Response -ForegroundColor White
        }
    }
    Write-Host "----------------------------------------`n"
}

# Admin credentials
$adminEmail = "admin@example.com"
$adminPassword = "admin"
$loginUrl = "$baseUrl/auth/login"

function Get-AdminAuthToken {
    param(
        [string]$Email,
        [string]$Password,
        [string]$LoginUri
    )
    $loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
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
        $code = 0
        if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.Value__ }
        Write-Host "Admin login failed. Status Code: $code. Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        exit 1
    }
}

# Obtain token for seeding/cleanup operations
$token = Get-AdminAuthToken -Email $adminEmail -Password $adminPassword -LoginUri $loginUrl
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

# Seed a test article to ensure deterministic suggestions
$ts = Get-Date -Format "yyyyMMddHHmmss"
$seedTitle = "Suggestions Test Article $ts"
$seedContent = "This is a suggestions demo body with unique token: SUGG-$ts and tag suggestionsdemo."
$seedTags = @("suggestionsdemo", "alpha")
$createBody = @{ title = $seedTitle; content = $seedContent; image_url = ""; language_code = "en"; tags = $seedTags } | ConvertTo-Json
$seedArticleId = $null

Write-Host "Seeding a test article for suggestions..." -ForegroundColor DarkYellow
try {
    $createResp = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Post -Headers $authHeaders -Body $createBody
    $seedArticleId = $createResp.id
    if (-not $seedArticleId) { throw "No article id returned" }
    Write-Host "Seeded article ID: $seedArticleId" -ForegroundColor Green
} catch {
    $code = 0
    if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.Value__ }
    Write-Host "Failed to seed test article. Status Code: $code. Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# Build a prefix and an infix for tests
$prefix = $seedTitle.Substring(0, [Math]::Min(8, $seedTitle.Length))  # "Suggesti" usually
# Choose a mid-word snippet to force infix (e.g., "Test ")
$infix = "Test"

# TEST 1: Missing q -> expect 400
Write-Host "TEST 1: GET /api/search/suggestions (missing q)" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search/suggestions" -Method Get -Headers $headers -ErrorAction Stop
    # If it returned 200, this is unexpected for missing q
    Write-Result -TestName "Suggestions missing q" -StatusCode 200 -Response $resp
} catch {
    $status = 0
    $body = $null
    if ($_.Exception.Response) {
        $status = $_.Exception.Response.StatusCode.Value__
        $body = $_.ErrorDetails.Message
    } else {
        $body = $_.Exception.Message
    }
    Write-Result -TestName "Suggestions missing q" -StatusCode $status -Response $body
}

# TEST 2: Articles only, prefix match, includeMeta
Write-Host "TEST 2: GET /api/search/suggestions?q=$prefix&types=articles&includeMeta=true" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search/suggestions?q=$([uri]::EscapeDataString($prefix))&types=articles&includeMeta=true" -Method Get -Headers $headers
    Write-Result -TestName "Articles-only prefix suggestions" -StatusCode 200 -Response $resp
} catch {
    $status = $_.Exception.Response.StatusCode.Value__
    Write-Result -TestName "Articles-only prefix suggestions" -StatusCode $status -Response $_.ErrorDetails.Message
}

# TEST 3: Articles only, infix match
Write-Host "TEST 3: GET /api/search/suggestions?q=$infix&types=articles" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search/suggestions?q=$([uri]::EscapeDataString($infix))&types=articles" -Method Get -Headers $headers
    Write-Result -TestName "Articles-only infix suggestions" -StatusCode 200 -Response $resp
} catch {
    $status = $_.Exception.Response.StatusCode.Value__
    Write-Result -TestName "Articles-only infix suggestions" -StatusCode $status -Response $_.ErrorDetails.Message
}

# TEST 4: Tags only, search for the seeded tag "suggestionsdemo"
Write-Host "TEST 4: GET /api/search/suggestions?q=suggestionsdemo&types=tags" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search/suggestions?q=suggestionsdemo&types=tags" -Method Get -Headers $headers
    Write-Result -TestName "Tags-only suggestions (suggestionsdemo)" -StatusCode 200 -Response $resp
} catch {
    $status = $_.Exception.Response.StatusCode.Value__
    Write-Result -TestName "Tags-only suggestions (suggestionsdemo)" -StatusCode $status -Response $_.ErrorDetails.Message
}

# TEST 5: Multiple types with perTypeLimit=1 and overall limit=2, includeMeta
Write-Host "TEST 5: GET /api/search/suggestions?q=$prefix&types=articles,tags&perTypeLimit=1&limit=2&includeMeta=true" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search/suggestions?q=$([uri]::EscapeDataString($prefix))&types=articles,tags&perTypeLimit=1&limit=2&includeMeta=true" -Method Get -Headers $headers
    Write-Result -TestName "Mixed types suggestions (perTypeLimit=1, limit=2, includeMeta)" -StatusCode 200 -Response $resp
} catch {
    $status = $_.Exception.Response.StatusCode.Value__
    Write-Result -TestName "Mixed types suggestions (perTypeLimit=1, limit=2, includeMeta)" -StatusCode $status -Response $_.ErrorDetails.Message
}

# TEST 6: Invalid type -> expect 422
Write-Host "TEST 6: GET /api/search/suggestions?q=$prefix&types=users" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search/suggestions?q=$([uri]::EscapeDataString($prefix))&types=users" -Method Get -Headers $headers
    Write-Result -TestName "Invalid type for suggestions" -StatusCode 200 -Response $resp
} catch {
    $status = 0
    $body = $null
    if ($_.Exception.Response) {
        $status = $_.Exception.Response.StatusCode.Value__
        $body = $_.ErrorDetails.Message
    } else {
        $body = $_.Exception.Message
    }
    Write-Result -TestName "Invalid type for suggestions" -StatusCode $status -Response $body
}

# Optional: Categories probe (may or may not match depending on DB contents)
# Write-Host "OPTIONAL: GET /api/search/suggestions?q=gen&types=categories" -ForegroundColor Magenta
# try {
#     $resp = Invoke-RestMethod -Uri "$baseUrl/search/suggestions?q=gen&types=categories" -Method Get -Headers $headers
#     Write-Result -TestName "Categories-only suggestions (probe)" -StatusCode 200 -Response $resp
# } catch {
#     $status = $_.Exception.Response.StatusCode.Value__
#     Write-Result -TestName "Categories-only suggestions (probe)" -StatusCode $status -Response $_.ErrorDetails.Message
# }

# Cleanup the seeded article
if ($seedArticleId) {
    Write-Host "Cleaning up seeded article ID: $seedArticleId" -ForegroundColor DarkYellow
    try {
        Invoke-RestMethod -Uri "$baseUrl/articles/$seedArticleId" -Method Delete -Headers $authHeaders
        Write-Result -TestName "Cleanup seeded article" -StatusCode 204 -Response @{ message = "Deleted" }
    } catch {
        $status = 0
        $body = $null
        if ($_.Exception.Response) {
            $status = $_.Exception.Response.StatusCode.Value__
            $body = $_.ErrorDetails.Message
        } else {
            $body = $_.Exception.Message
        }
        Write-Result -TestName "Cleanup seeded article" -StatusCode $status -Response $body
    }
}

Write-Host "Suggestions API testing completed!" -ForegroundColor Green