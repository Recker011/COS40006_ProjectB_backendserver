# test-articles-media-typed.ps1
# Tests the typed media fields (image_urls, video_urls) across article endpoints
# Standard testing style: PowerShell + Invoke-RestMethod, similar to test-articles-media.ps1

$baseUrl = "http://localhost:3000/api"
$headers = @{"Content-Type" = "application/json"}
$articleId = $null
$me = $null

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

function Write-Check {
    param([string]$Label, [bool]$Condition, [string]$Details = "")
    if ($Condition) {
        Write-Host "  [PASS] $Label" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $Label $Details" -ForegroundColor Red
    }
}

# Read JWT token
$token = Get-Content -Path "auth-token.txt" -Raw | ForEach-Object { $_.Trim() }
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

# Identify current user (for by-author tests)
Write-Host "SETUP: GET /api/auth/profile" -ForegroundColor Magenta
try {
    $me = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method Get -Headers $authHeaders -ErrorAction Stop
    Write-Result -TestName "Get profile" -StatusCode 200 -Response $me
} catch {
    Write-Result -TestName "Get profile" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Cleanup existing articles
Write-Host "SETUP: DELETE /api/articles (cleanup)" -ForegroundColor Magenta
try {
    Invoke-RestMethod -Uri "$baseUrl/articles" -Method Delete -Headers $authHeaders -ErrorAction Stop
    Write-Result -TestName "Cleanup all articles" -StatusCode 204 -Response "All articles deleted."
} catch {
    Write-Result -TestName "Cleanup all articles" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Create article with mixed media
Write-Host "TEST 1: POST /api/articles (with image+video)" -ForegroundColor Magenta
$articleData = @{
    title = "Typed Media Test"
    content = "Verifying image_urls and video_urls across endpoints."
    media_urls = @(
        "https://example.com/pic1.jpg"
        "https://example.com/clip1.mp4"
        "https://example.com/pic2.png"
    )
    category_code = "media-typed-cat"
    language_code = "en"
    tags = @("media-typed","example")
} | ConvertTo-Json

try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Post -Headers $authHeaders -Body $articleData -ErrorAction Stop
    $articleId = $resp.id
    Write-Result -TestName "Create article (typed media)" -StatusCode 201 -Response $resp
    Write-Check -Label "image_urls present" -Condition ($resp.PSObject.Properties.Name -contains "image_urls")
    Write-Check -Label "video_urls present" -Condition ($resp.PSObject.Properties.Name -contains "video_urls")
    Write-Check -Label "image_urls count = 2" -Condition ($resp.image_urls.Count -eq 2) -Details "(expected 2)"
    Write-Check -Label "video_urls count = 1" -Condition ($resp.video_urls.Count -eq 1) -Details "(expected 1)"
} catch {
    Write-Result -TestName "Create article (typed media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

if (-not $articleId) { Write-Host "Aborting tests: article creation failed." -ForegroundColor Red; exit 1 }

# GET by ID (default lang)
Write-Host "TEST 2: GET /api/articles/$articleId" -ForegroundColor Magenta
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get article by ID" -StatusCode 200 -Response $res
    Write-Check -Label "image_urls present" -Condition ($res.PSObject.Properties.Name -contains "image_urls")
    Write-Check -Label "video_urls present" -Condition ($res.PSObject.Properties.Name -contains "video_urls")
    Write-Check -Label "image_urls has .jpg and .png" -Condition (($res.image_urls -contains "https://example.com/pic1.jpg") -and ($res.image_urls -contains "https://example.com/pic2.png"))
    Write-Check -Label "video_urls has .mp4" -Condition ($res.video_urls -contains "https://example.com/clip1.mp4")
} catch {
    Write-Result -TestName "Get article by ID" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# GET list /api/articles
Write-Host "TEST 3: GET /api/articles" -ForegroundColor Magenta
try {
    $list = Invoke-RestMethod -Uri "$baseUrl/articles" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get all articles" -StatusCode 200 -Response $list
    $found = $list | Where-Object { $_.id -eq $articleId }
    Write-Check -Label "article present in list" -Condition ($null -ne $found)
    if ($found) {
        Write-Check -Label "image_urls present" -Condition ($found.PSObject.Properties.Name -contains "image_urls")
        Write-Check -Label "video_urls present" -Condition ($found.PSObject.Properties.Name -contains "video_urls")
    }
} catch {
    Write-Result -TestName "Get all articles" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# GET by lang path /api/articles/en
Write-Host "TEST 4: GET /api/articles/en" -ForegroundColor Magenta
try {
    $listEn = Invoke-RestMethod -Uri "$baseUrl/articles/en" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get articles by lang (en)" -StatusCode 200 -Response $listEn
    $foundEn = $listEn | Where-Object { $_.id -eq $articleId }
    Write-Check -Label "article present in /:lang list" -Condition ($null -ne $foundEn)
    if ($foundEn) {
        Write-Check -Label "typed arrays present (/articles/:lang)" -Condition ( ($foundEn.PSObject.Properties.Name -contains "image_urls") -and ($foundEn.PSObject.Properties.Name -contains "video_urls") )
    }
} catch {
    Write-Result -TestName "Get articles by lang (en)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# GET by id and lang /api/articles/:id/en
Write-Host "TEST 5: GET /api/articles/$articleId/en" -ForegroundColor Magenta
try {
    $resIdEn = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/en" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get article by id+lang" -StatusCode 200 -Response $resIdEn
    Write-Check -Label "typed arrays present (id+lang)" -Condition ( ($resIdEn.PSObject.Properties.Name -contains "image_urls") -and ($resIdEn.PSObject.Properties.Name -contains "video_urls") )
} catch {
    Write-Result -TestName "Get article by id+lang" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# GET recent /api/articles/recent?days=7
Write-Host "TEST 6: GET /api/articles/recent?days=7" -ForegroundColor Magenta
try {
    $recent = Invoke-RestMethod -Uri "$baseUrl/articles/recent?days=7" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Get recent" -StatusCode 200 -Response $recent
    $foundRecent = $recent | Where-Object { $_.id -eq $articleId }
    Write-Check -Label "article present in recent" -Condition ($null -ne $foundRecent)
    if ($foundRecent) {
        Write-Check -Label "typed arrays present (recent)" -Condition ( ($foundRecent.PSObject.Properties.Name -contains "image_urls") -and ($foundRecent.PSObject.Properties.Name -contains "video_urls") )
    }
} catch {
    Write-Result -TestName "Get recent" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# GET tags grouping /api/articles/tags/lang/en?tag=media-typed
Write-Host "TEST 7: GET /api/articles/tags/lang/en?tag=media-typed" -ForegroundColor Magenta
try {
    $byTag = Invoke-RestMethod -Uri "$baseUrl/articles/tags/lang/en?tag=media-typed" -Method Get -Headers $headers -ErrorAction Stop
    Write-Result -TestName "Articles grouped by tag (en, filter media-typed)" -StatusCode 200 -Response $byTag
    # Flatten dictionary values into a single array
    $allByTag = @()
    foreach ($prop in $byTag.PSObject.Properties.Name) {
        $allByTag += $byTag.$prop
    }
    $foundTag = $allByTag | Where-Object { $_.id -eq $articleId }
   Write-Check -Label "article present in tags/lang response" -Condition ($null -ne $foundTag)
    if ($foundTag) {
        Write-Check -Label "typed arrays present (tags/lang)" -Condition ( ($foundTag.PSObject.Properties.Name -contains "image_urls") -and ($foundTag.PSObject.Properties.Name -contains "video_urls") )
    }
} catch {
    Write-Result -TestName "Articles grouped by tag (en)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Update article with new media set
Write-Host "TEST 8: PUT /api/articles/$articleId (update media)" -ForegroundColor Magenta
$updateData = @{
    title = "Typed Media Test - Updated"
    content = "Updated content with new media."
    media_urls = @(
        "https://example.com/new-image.gif"
        "https://example.com/new-video.mov"
    )
    tags = @("media-typed","updated")
} | ConvertTo-Json
try {
    $upd = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Put -Headers $authHeaders -Body $updateData -ErrorAction Stop
    Write-Result -TestName "Update article (media)" -StatusCode 200 -Response $upd
    Write-Check -Label "image_urls count = 1" -Condition ($upd.image_urls.Count -eq 1)
    Write-Check -Label "video_urls count = 1" -Condition ($upd.video_urls.Count -eq 1)
    Write-Check -Label "image_urls has .gif" -Condition ($upd.image_urls -contains "https://example.com/new-image.gif")
    Write-Check -Label "video_urls has .mov" -Condition ($upd.video_urls -contains "https://example.com/new-video.mov")
} catch {
    Write-Result -TestName "Update article (media)" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Hidden articles: set status hidden then fetch /hidden
Write-Host "TEST 9: PUT /api/articles/$articleId/status -> hidden" -ForegroundColor Magenta
try {
    $statusBody = @{ status = "hidden" } | ConvertTo-Json
    $st = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/status" -Method Put -Headers $authHeaders -Body $statusBody -ErrorAction Stop
    Write-Result -TestName "Set status hidden" -StatusCode 200 -Response $st
} catch {
    Write-Result -TestName "Set status hidden" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

Write-Host "TEST 10: GET /api/articles/hidden" -ForegroundColor Magenta
try {
    $hidden = Invoke-RestMethod -Uri "$baseUrl/articles/hidden" -Method Get -Headers $authHeaders -ErrorAction Stop
    Write-Result -TestName "Get hidden" -StatusCode 200 -Response $hidden
    $foundHidden = $hidden | Where-Object { $_.id -eq $articleId }
    Write-Check -Label "article present in hidden" -Condition ($null -ne $foundHidden)
    if ($foundHidden) {
        Write-Check -Label "typed arrays present (hidden)" -Condition ( ($foundHidden.PSObject.Properties.Name -contains "image_urls") -and ($foundHidden.PSObject.Properties.Name -contains "video_urls") )
    }
} catch {
    Write-Result -TestName "Get hidden" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Drafts: set status draft then fetch /drafts
Write-Host "TEST 11: PUT /api/articles/$articleId/status -> draft" -ForegroundColor Magenta
try {
    $statusBody2 = @{ status = "draft" } | ConvertTo-Json
    $st2 = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/status" -Method Put -Headers $authHeaders -Body $statusBody2 -ErrorAction Stop
    Write-Result -TestName "Set status draft" -StatusCode 200 -Response $st2
} catch {
    Write-Result -TestName "Set status draft" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

Write-Host "TEST 12: GET /api/articles/drafts" -ForegroundColor Magenta
try {
    $drafts = Invoke-RestMethod -Uri "$baseUrl/articles/drafts" -Method Get -Headers $authHeaders -ErrorAction Stop
    Write-Result -TestName "Get drafts" -StatusCode 200 -Response $drafts
    $foundDraft = $drafts | Where-Object { $_.id -eq $articleId }
    Write-Check -Label "article present in drafts" -Condition ($null -ne $foundDraft)
    if ($foundDraft) {
        Write-Check -Label "typed arrays present (drafts)" -Condition ( ($foundDraft.PSObject.Properties.Name -contains "image_urls") -and ($foundDraft.PSObject.Properties.Name -contains "video_urls") )
    }
} catch {
    Write-Result -TestName "Get drafts" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Reset back to published for cleanup
Write-Host "TEARDOWN: PUT /api/articles/$articleId/status -> published" -ForegroundColor Magenta
try {
    $statusBody3 = @{ status = "published" } | ConvertTo-Json
    $st3 = Invoke-RestMethod -Uri "$baseUrl/articles/$articleId/status" -Method Put -Headers $authHeaders -Body $statusBody3 -ErrorAction Stop
    Write-Result -TestName "Set status published" -StatusCode 200 -Response $st3
} catch {
    Write-Result -TestName "Set status published" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

# Delete the article
Write-Host "TEARDOWN: DELETE /api/articles/$articleId" -ForegroundColor Magenta
try {
    Invoke-RestMethod -Uri "$baseUrl/articles/$articleId" -Method Delete -Headers $authHeaders -ErrorAction Stop
    Write-Result -TestName "Delete created article" -StatusCode 204 -Response "Article $articleId deleted."
} catch {
    Write-Result -TestName "Delete created article" -StatusCode $_.Exception.Response.StatusCode.Value__ -Response $_.ErrorDetails.Message
}

Write-Host "Typed media API testing completed!" -ForegroundColor Green