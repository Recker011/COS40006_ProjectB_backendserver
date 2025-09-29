# test-articles-lang.ps1
# PowerShell script to test language-specific article endpoints:
# - GET /api/articles/:lang
# - GET /api/articles/:id/:lang
# Follows patterns used in test-articles-advanced.ps1 (health check, login with seeded admin, structured output).

# ----------------------------------------
# Utilities
# ----------------------------------------
function Write-Result {
    param([string]$TestName, [int]$StatusCode, [object]$Response)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $TestName" -ForegroundColor Cyan
    Write-Host "Status Code: $StatusCode" -ForegroundColor Yellow
    if ($Response) {
        Write-Host "Response:" -ForegroundColor Green
        try {
            $Response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
        } catch {
            Write-Host $Response -ForegroundColor White
        }
    }
    Write-Host "----------------------------------------`n"
}

function Get-ErrorBody {
    param($Err)
    if ($Err -and $Err.Exception -and $Err.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($Err.Exception.Response.GetResponseStream())
            return $reader.ReadToEnd()
        } catch {
            return $Err.Exception.Message
        }
    }
    return ($Err | Out-String)
}

# ----------------------------------------
# API Base Resolver + Health Check
# ----------------------------------------
function Invoke-Health {
    param([string]$BaseApi)
    try {
        $u = "$BaseApi/health"
        $resp = Invoke-RestMethod -Uri $u -Method Get -ErrorAction Stop
        return ,@($true, 200, $resp)
    } catch {
        $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
        $body = Get-ErrorBody $_
        try {
            return ,@($false, $code, ($body | ConvertFrom-Json -ErrorAction SilentlyContinue))
        } catch {
            return ,@($false, $code, $body)
        }
    }
}

function Resolve-ApiBase {
    # Try common candidates in order; stop on first healthy /api/health
    $candidates = @(
        "http://localhost:3000/api",
        "http://127.0.0.1:3000/api",
        "http://[::1]:3000/api"
    )
    foreach ($base in $candidates) {
        Write-Host "Checking API health at $base/health ..." -ForegroundColor DarkYellow
        $res = Invoke-Health -BaseApi $base
        $ok = $res[0]; $code = $res[1]; $body = $res[2]
        if ($ok -and $code -eq 200 -and $body.ok) {
            Write-Host "API OK at $base (DB ok: $($body.db.ok))" -ForegroundColor DarkGreen
            return $base
        } else {
            Write-Result -TestName "Health check failed at $base" -StatusCode $code -Response $body
        }
    }
    throw "Unable to resolve a healthy API base. Ensure your server is running on one of the tried candidates."
}

# ----------------------------------------
# Login to get JWT (seeded admin)
# ----------------------------------------
function Get-AdminAuthToken {
    param(
        [string]$ApiBase,
        [string]$Email = "admin@example.com",
        [string]$Password = "admin"
    )
    $loginUrl = "$ApiBase/auth/login"
    $headers = @{ "Content-Type" = "application/json" }
    $body = @{
        email = $Email
        password = $Password
    } | ConvertTo-Json
    Write-Host "Logging in as $Email via $loginUrl ..." -ForegroundColor DarkYellow
    try {
        $resp = Invoke-RestMethod -Uri $loginUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
        if ($resp.token) {
            $token = $resp.token
            $token | Out-File -FilePath "auth-token.txt" -Encoding UTF8
            Write-Host "Login successful, token saved to auth-token.txt" -ForegroundColor DarkGreen
            return $token
        } else {
            throw "Login response did not contain a token"
        }
    } catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
        $respBody = Get-ErrorBody $_
        try {
            Write-Result -TestName "Login failed" -StatusCode $statusCode -Response ($respBody | ConvertFrom-Json -ErrorAction SilentlyContinue)
        } catch {
            Write-Result -TestName "Login failed" -StatusCode $statusCode -Response $respBody
        }
        throw
    }
}

# ----------------------------------------
# Start
# ----------------------------------------
$apiBase = Resolve-ApiBase
$token = Get-AdminAuthToken -ApiBase $apiBase

$headersAuth = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

# ----------------------------------------
# Setup: Create a published article with tags to exercise endpoints
# ----------------------------------------
Write-Host "SETUP: Create a published article for language endpoint tests" -ForegroundColor Magenta

$ts = Get-Date -Format 'yyyyMMddHHmmss'
$tagCode = "langtest-$ts"

$enTitle = "Lang Test Article $ts"
$enBody  = "English body for language endpoint testing ($ts)."
$bnTitle = "বাংলা টেস্ট আর্টিকেল $ts"
$bnBody  = "ভাষা এন্ডপয়েন্ট পরীক্ষার জন্য বাংলা বডি ($ts)।"
$bnExcerpt = "বাংলা সারসংক্ষেপ $ts"

$createBody = @{
    title = $enTitle
    content = $enBody
    image_url = "https://example.com/langtest.jpg"
    language_code = "en"   # primary language on create
    tags = @($tagCode, "alpha")
} | ConvertTo-Json

$articleId = $null
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles" -Method Post -Headers $headersAuth -Body $createBody -ErrorAction Stop
    $articleId = $resp.id
    Write-Result -TestName "Create published article (EN primary)" -StatusCode 201 -Response $resp
} catch {
    $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Create published article (EN primary)" -StatusCode $status -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Create published article (EN primary)" -StatusCode $status -Response $body
    }
}

if (-not $articleId) {
    Write-Host "Aborting: failed to create base article" -ForegroundColor Red
    exit 1
}

# Ensure BN translation has content: try PUT, fallback to POST if 404
Write-Host "SETUP: Ensure BN translation has content" -ForegroundColor Magenta
$putBN = @{
    title = $bnTitle
    content = $bnBody
    excerpt = $bnExcerpt
} | ConvertTo-Json
$bnUpdated = $false
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/translations/bn" -Method Put -Headers $headersAuth -Body $putBN -ErrorAction Stop
    $bnUpdated = $true
    Write-Result -TestName "Update BN translation (PUT)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    if ($code -eq 404) {
        $postBN = @{
            language_code = "bn"
            title = $bnTitle
            content = $bnBody
            excerpt = $bnExcerpt
        } | ConvertTo-Json
        try {
            $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/translations" -Method Post -Headers $headersAuth -Body $postBN -ErrorAction Stop
            $bnUpdated = $true
            Write-Result -TestName "Add BN translation (POST fallback)" -StatusCode 201 -Response $resp
        } catch {
            $body = Get-ErrorBody $_
            try {
                Write-Result -TestName "Add BN translation (POST fallback)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
            } catch {
                Write-Result -TestName "Add BN translation (POST fallback)" -StatusCode $code -Response $body
            }
        }
    } else {
        $body = Get-ErrorBody $_
        try {
            Write-Result -TestName "Update BN translation (PUT)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
        } catch {
            Write-Result -TestName "Update BN translation (PUT)" -StatusCode $code -Response $body
        }
    }
}

if (-not $bnUpdated) {
    Write-Host "Warning: BN translation was not updated/added; proceeding with tests anyway." -ForegroundColor Yellow
}

# ----------------------------------------
# Tests: GET /api/articles/:lang
# ----------------------------------------
Write-Host "TEST: GET /api/articles/en" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/en" -Method Get -ErrorAction Stop
    Write-Result -TestName "List articles (EN)" -StatusCode 200 -Response $resp
    try {
        $hasArticle = $false
        if ($resp -is [System.Array]) {
            foreach ($a in $resp) { if ($a.id -eq $articleId) { $hasArticle = $true; break } }
        }
        if ($hasArticle) { Write-Host "Contains created EN article id=$articleId" -ForegroundColor DarkGreen }
        else { Write-Host "Created EN article not found in list" -ForegroundColor DarkYellow }
    } catch {}
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "List articles (EN)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "List articles (EN)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: GET /api/articles/bn" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/bn" -Method Get -ErrorAction Stop
    Write-Result -TestName "List articles (BN)" -StatusCode 200 -Response $resp
    try {
        $hasArticle = $false
        if ($resp -is [System.Array]) {
            foreach ($a in $resp) { if ($a.id -eq $articleId) { $hasArticle = $true; break } }
        }
        if ($hasArticle) { Write-Host "Contains created BN article id=$articleId" -ForegroundColor DarkGreen }
        else { Write-Host "Created BN article not found in list" -ForegroundColor DarkYellow }
    } catch {}
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "List articles (BN)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "List articles (BN)" -StatusCode $code -Response $body
    }
}

# Search and tag filters on :lang
Write-Host "TEST: GET /api/articles/en?search=Lang%20Test" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/en?search=Lang%20Test" -Method Get -ErrorAction Stop
    Write-Result -TestName "List articles (EN + search)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "List articles (EN + search)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "List articles (EN + search)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: GET /api/articles/en?tag=$tagCode" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/en?tag=$tagCode" -Method Get -ErrorAction Stop
    Write-Result -TestName "List articles (EN + tag filter)" -StatusCode 200 -Response $resp
    try {
        $hasArticle = $false
        if ($resp -is [System.Array]) {
            foreach ($a in $resp) { if ($a.id -eq $articleId) { $hasArticle = $true; break } }
        }
        if ($hasArticle) { Write-Host "Tag-filtered list contains id=$articleId" -ForegroundColor DarkGreen }
        else { Write-Host "Tag-filtered list does not include created article" -ForegroundColor DarkYellow }
    } catch {}
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "List articles (EN + tag filter)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "List articles (EN + tag filter)" -StatusCode $code -Response $body
    }
}

# ----------------------------------------
# Tests: GET /api/articles/:id/:lang
# ----------------------------------------
Write-Host "TEST: GET /api/articles/$articleId/en" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/en" -Method Get -ErrorAction Stop
    Write-Result -TestName "Get article by id (EN)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Get article by id (EN)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Get article by id (EN)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: GET /api/articles/$articleId/bn" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/bn" -Method Get -ErrorAction Stop
    Write-Result -TestName "Get article by id (BN)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Get article by id (BN)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Get article by id (BN)" -StatusCode $code -Response $body
    }
}

# Invalid lang on :id/:lang should return 400
Write-Host "TEST: GET /api/articles/$articleId/xx (expect 400 invalid language)" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/xx" -Method Get -ErrorAction Stop
    Write-Result -TestName "Get article by id (invalid lang 'xx')" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Get article by id (invalid lang 'xx')" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Get article by id (invalid lang 'xx')" -StatusCode $code -Response $body
    }
}

# Non-existent ID + valid lang should 404
Write-Host "TEST: GET /api/articles/999999/en (expect 404)" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/999999/en" -Method Get -ErrorAction Stop
    Write-Result -TestName "Get non-existent article by id (EN)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Get non-existent article by id (EN)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Get non-existent article by id (EN)" -StatusCode $code -Response $body
    }
}

# ----------------------------------------
# Extra: Verify /api/articles/xx falls through to :id route and yields 400 invalid id
# ----------------------------------------
Write-Host "TEST: GET /api/articles/xx (should fall-through and yield 400 invalid article ID)" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/xx" -Method Get -ErrorAction Stop
    Write-Result -TestName "GET /articles/xx" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "GET /articles/xx" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "GET /articles/xx" -StatusCode $code -Response $body
    }
}

Write-Host "`nLanguage endpoint tests completed." -ForegroundColor Green