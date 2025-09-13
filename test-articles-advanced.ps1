# test-articles-advanced.ps1
# PowerShell script to test advanced article endpoints using login-based JWT (admin@example.com/admin)
# Adds health check + base URL resolution to avoid 404 "File not found" from wrong server/port.

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
# Login to get JWT
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
# Setup: Create a published article to exercise endpoints
# ----------------------------------------
Write-Host "SETUP: Create a published article" -ForegroundColor Magenta
$articleTitle = "PS Test Article $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$articleBody  = "This article is created by test-articles-advanced.ps1 for endpoint testing."
$createBody = @{
    title = $articleTitle
    content = $articleBody
    image_url = "https://example.com/test.jpg"
    language_code = "en"
    tags = @("alpha","beta")
} | ConvertTo-Json

$articleId = $null
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles" -Method Post -Headers $headersAuth -Body $createBody -ErrorAction Stop
    $articleId = $resp.id
    Write-Result -TestName "Create published article" -StatusCode 201 -Response $resp
} catch {
    $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Create published article" -StatusCode $status -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Create published article" -StatusCode $status -Response $body
    }
}

if (-not $articleId) {
    Write-Host "Aborting: failed to create base article" -ForegroundColor Red
    exit 1
}

# ----------------------------------------
# 1) Recent articles (public)
# ----------------------------------------
Write-Host "TEST: GET /api/articles/recent (7 days default)" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/recent" -Method Get -ErrorAction Stop
    Write-Result -TestName "Recent (7d)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Recent (7d)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Recent (7d)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: GET /api/articles/recent?days=30" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/recent?days=30" -Method Get -ErrorAction Stop
    Write-Result -TestName "Recent (30d)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Recent (30d)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Recent (30d)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: GET /api/articles/recent?days=14 (expect 400)" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/recent?days=14" -Method Get -ErrorAction Stop
    Write-Result -TestName "Recent (invalid 14d)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Recent (invalid 14d)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Recent (invalid 14d)" -StatusCode $code -Response $body
    }
}

# ----------------------------------------
# 2) By author (public). Using author id 1 as default
# ----------------------------------------
Write-Host "TEST: GET /api/articles/by-author/1" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/by-author/1" -Method Get -ErrorAction Stop
    Write-Result -TestName "By author 1" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "By author 1" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "By author 1" -StatusCode $code -Response $body
    }
}

# ----------------------------------------
# 3) Translations (published only)
# ----------------------------------------
Write-Host "TEST: GET /api/articles/$articleId/translations" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/translations" -Method Get -ErrorAction Stop
    Write-Result -TestName "Translations (get)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Translations (get)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Translations (get)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: PUT /api/articles/$articleId/translations/en" -ForegroundColor Magenta
$updateTx = @{
    title = "$articleTitle - Updated"
    content = "$articleBody`nUpdated on $(Get-Date -Format 's')."
    excerpt = "Updated excerpt"
} | ConvertTo-Json
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/translations/en" -Method Put -Headers $headersAuth -Body $updateTx -ErrorAction Stop
    Write-Result -TestName "Translations (update EN)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Translations (update EN)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Translations (update EN)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: DELETE /api/articles/$articleId/translations/bn" -ForegroundColor Magenta
try {
    Invoke-RestMethod -Uri "$apiBase/articles/$articleId/translations/bn" -Method Delete -Headers $headersAuth -ErrorAction Stop
    Write-Result -TestName "Translations (delete BN)" -StatusCode 204 -Response "No Content"
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Translations (delete BN)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Translations (delete BN)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: POST /api/articles/$articleId/translations (bn)" -ForegroundColor Magenta
$addBn = @{
    language_code = "bn"
    title = "বাংলা শিরোনাম - PS Test"
    content = "এটি একটি বাংলা অনুবাদ, স্বয়ংক্রিয় পরীক্ষার জন্য।"
    excerpt = "বাংলা সারসংক্ষেপ"
} | ConvertTo-Json
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/translations" -Method Post -Headers $headersAuth -Body $addBn -ErrorAction Stop
    Write-Result -TestName "Translations (add BN)" -StatusCode 201 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Translations (add BN)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Translations (add BN)" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: GET /api/articles/$articleId/translations (after add)" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/translations" -Method Get -ErrorAction Stop
    Write-Result -TestName "Translations (get after add)" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Translations (get after add)" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Translations (get after add)" -StatusCode $code -Response $body
    }
}

# ----------------------------------------
# 4) Duplicate -> returns draft
# ----------------------------------------
Write-Host "TEST: POST /api/articles/$articleId/duplicate" -ForegroundColor Magenta
$dupId = $null
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/duplicate" -Method Post -Headers $headersAuth -ErrorAction Stop
    $dupId = $resp.id
    Write-Result -TestName "Duplicate article" -StatusCode 201 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Duplicate article" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Duplicate article" -StatusCode $code -Response $body
    }
}

# ----------------------------------------
# 5) Drafts (auth)
# ----------------------------------------
Write-Host "TEST: GET /api/articles/drafts" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/drafts" -Method Get -Headers $headersAuth -ErrorAction Stop
    Write-Result -TestName "List drafts" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "List drafts" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "List drafts" -StatusCode $code -Response $body
    }
}

# ----------------------------------------
# 6) Hidden: set hidden then list then republish
# ----------------------------------------
Write-Host "TEST: PUT /api/articles/$articleId/status (hidden)" -ForegroundColor Magenta
$hiddenBody = @{ status = "hidden" } | ConvertTo-Json
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/status" -Method Put -Headers $headersAuth -Body $hiddenBody -ErrorAction Stop
    Write-Result -TestName "Status -> hidden" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Status -> hidden" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Status -> hidden" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: GET /api/articles/hidden" -ForegroundColor Magenta
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/hidden?lang=en" -Method Get -Headers $headersAuth -ErrorAction Stop
    Write-Result -TestName "List hidden" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "List hidden" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "List hidden" -StatusCode $code -Response $body
    }
}

Write-Host "TEST: PUT /api/articles/$articleId/status (published)" -ForegroundColor Magenta
$pubBody = @{ status = "published" } | ConvertTo-Json
try {
    $resp = Invoke-RestMethod -Uri "$apiBase/articles/$articleId/status" -Method Put -Headers $headersAuth -Body $pubBody -ErrorAction Stop
    Write-Result -TestName "Status -> published" -StatusCode 200 -Response $resp
} catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
    $body = Get-ErrorBody $_
    try {
        Write-Result -TestName "Status -> published" -StatusCode $code -Response ($body | ConvertFrom-Json -ErrorAction SilentlyContinue)
    } catch {
        Write-Result -TestName "Status -> published" -StatusCode $code -Response $body
    }
}

Write-Host "`nAdvanced article endpoint tests completed." -ForegroundColor Green