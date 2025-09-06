# test-search.ps1
# PowerShell script to test the global search endpoint: GET /api/search
#
# PURPOSE:
# - Validates the behavior of the global search endpoint across articles, categories, and tags
# - Verifies validation errors, includeCounts, types filtering, language switching, and pagination
# - Seeds a temporary article using the seeded admin account to ensure deterministic results, then cleans it up
#
# PREREQUISITES:
# 1. Start the backend server: npm start or npm run dev
# 2. Ensure the server is running on http://localhost:3000
# 3. Seeded admin account exists: admin@example.com / admin
#
# HOW TO USE:
# 1. Save this script in the project root directory
# 2. Open PowerShell in the project directory
# 3. Run: .\test-search.ps1
#
# OUTPUT:
# - Displays test name, status code, and response for each test step

$baseUrl = "http://localhost:3000/api"
$headers = @{ "Content-Type" = "application/json" }

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
        Write-Host "Admin login failed. Status Code: $($_.Exception.Response.StatusCode.Value__). Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        exit 1
    }
}

# Obtain token for seeding/cleanup operations
$token = Get-AdminAuthToken -Email $adminEmail -Password $adminPassword -LoginUri $loginUrl
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

# Seed a test article to ensure deterministic search results
$ts = Get-Date -Format "yyyyMMddHHmmss"
$seedTitle = "Search Test Article $ts"
$seedContent = "This is a search demo body with unique token: TOKEN-$ts and tag searchdemo."
$seedTags = @("searchdemo", "alpha")
$createBody = @{ title = $seedTitle; content = $seedContent; image_url = ""; language_code = "en"; tags = $seedTags } | ConvertTo-Json
$seedArticleId = $null

Write-Host "Seeding a test article..." -ForegroundColor DarkYellow
try {
    $createResp = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Post -Headers $authHeaders -Body $createBody
    $seedArticleId = $createResp.id
    if (-not $seedArticleId) { throw "No article id returned" }
    Write-Host "Seeded article ID: $seedArticleId" -ForegroundColor Green
} catch {
    Write-Host "Failed to seed test article. Status Code: $($_.Exception.Response.StatusCode.Value__). Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# TEST 1: Missing q -> expect 400
Write-Host "TEST 1: GET /api/search (missing q)" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search" -Method Get -Headers $headers
    Write-Result -TestName "Search missing q" -StatusCode 200 -Response $resp
} catch {
    Write-Result -TestName "Search missing q" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# TEST 2: Search by tag name (should match seeded data in articles and tags)
Write-Host "TEST 2: GET /api/search?q=searchdemo&types=articles,tags&includeCounts=true" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search?q=searchdemo&types=articles,tags&includeCounts=true" -Method Get -Headers $headers
    Write-Result -TestName "Search by tag 'searchdemo' (articles,tags)" -StatusCode 200 -Response $resp
} catch {
    Write-Result -TestName "Search by tag 'searchdemo' (articles,tags)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# TEST 3: Search by title prefix (should match seeded article title)
$prefix = $seedTitle.Substring(0, [Math]::Min(8, $seedTitle.Length))
Write-Host "TEST 3: GET /api/search?q=$prefix&types=articles&includeCounts=true" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search?q=$prefix&types=articles&includeCounts=true" -Method Get -Headers $headers
    Write-Result -TestName "Search by title prefix (articles)" -StatusCode 200 -Response $resp
} catch {
    Write-Result -TestName "Search by title prefix (articles)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# TEST 4: Categories only (no guarantee of match; just prints structure)
Write-Host "TEST 4: GET /api/search?q=gen&types=categories" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search?q=gen&types=categories" -Method Get -Headers $headers
    Write-Result -TestName "Categories-only search" -StatusCode 200 -Response $resp
} catch {
    Write-Result -TestName "Categories-only search" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# TEST 5: Bangla language toggle (tags only) — validates lang switch even if no BN data exists
Write-Host "TEST 5: GET /api/search?q=searchdemo&types=tags&lang=bn" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search?q=searchdemo&types=tags&lang=bn" -Method Get -Headers $headers
    Write-Result -TestName "Tags search (lang=bn)" -StatusCode 200 -Response $resp
} catch {
    Write-Result -TestName "Tags search (lang=bn)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# TEST 6: Pagination with limit=1 (hasMore may vary)
Write-Host "TEST 6: GET /api/search?q=searchdemo&types=articles&limit=1&page=1" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search?q=searchdemo&types=articles&limit=1&page=1" -Method Get -Headers $headers
    Write-Result -TestName "Articles pagination (limit=1,page=1)" -StatusCode 200 -Response $resp
} catch {
    Write-Result -TestName "Articles pagination (limit=1,page=1)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# TEST 7: Invalid type -> expect 422
Write-Host "TEST 7: GET /api/search?q=foo&types=unknown" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/search?q=foo&types=unknown" -Method Get -Headers $headers
    Write-Result -TestName "Invalid type" -StatusCode 200 -Response $resp
} catch {
    Write-Result -TestName "Invalid type" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Cleanup the seeded article
if ($seedArticleId) {
    Write-Host "Cleaning up seeded article ID: $seedArticleId" -ForegroundColor DarkYellow
    try {
        Invoke-RestMethod -Uri "$baseUrl/articles/$seedArticleId" -Method Delete -Headers $authHeaders
        Write-Result -TestName "Cleanup seeded article" -StatusCode 204 -Response @{ message = "Deleted" }
    } catch {
        Write-Result -TestName "Cleanup seeded article" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
    }
}

Write-Host "Search API testing completed!" -ForegroundColor Green
