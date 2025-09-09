# test-category-articles.ps1
# PowerShell script to test the /api/categories/:id/articles endpoint

$baseUrl = "http://localhost:3000/api/categories"

function Invoke-ApiRequest {
    param (
        [string]$Method,
        [string]$Url,
        [string]$Body = "",
        [string]$AuthToken = ""
    )
    $headers = @{}
    if ($AuthToken) {
        $headers["Authorization"] = "Bearer $AuthToken"
    }
    if ($Body) {
        $headers["Content-Type"] = "application/json"
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $Body -ErrorAction Stop
    } else {
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ErrorAction Stop
    }
}

function Test-Endpoint {
    param (
        [string]$Name,
        [scriptblock]$TestScript
    )
    Write-Host "Running test: $Name" -ForegroundColor Cyan
    try {
        & $TestScript
        Write-Host "Test Passed: $Name`n" -ForegroundColor Green
    } catch {
        Write-Host "Test Failed: $Name" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)`n" -ForegroundColor Red
        # Optionally, output more error details
        # $_.Exception | Format-List -Force
    }
}

# --- Test Cases ---

# Test 1: Retrieve articles for a valid category (assuming category ID 1 exists and has articles)
Test-Endpoint -Name "Retrieve articles for a valid category (ID 1)" -TestScript {
    $categoryId = 1
    $url = "$baseUrl/$categoryId/articles"
    $response = Invoke-ApiRequest -Method GET -Url $url

    if ($response -is [System.Array]) {
        Write-Host "Received $($response.Length) articles."
        # Further checks can be added here, e.g., check if articles have expected properties
        # if ($response.Length -gt 0) {
        #     if (-not $response[0].id -or -not $response[0].title) {
        #         throw "Article missing expected properties (id, title)"
        #     }
        # }
    } else {
        throw "Response is not an array of articles."
    }
}

# Test 2: Retrieve articles for a valid category with Bengali language (assuming category ID 1 exists and has articles)
Test-Endpoint -Name "Retrieve articles for a valid category (ID 1) in Bengali" -TestScript {
    $categoryId = 1
    $url = "$baseUrl/$categoryId/articles?lang=bn"
    $response = Invoke-ApiRequest -Method GET -Url $url

    if ($response -is [System.Array]) {
        Write-Host "Received $($response.Length) articles in Bengali."
        # Further checks can be added here for Bengali content
    } else {
        throw "Response is not an array of articles."
    }
}

# Test 3: Retrieve articles for a non-existent category
Test-Endpoint -Name "Retrieve articles for a non-existent category (ID 9999)" -TestScript {
    $categoryId = 9999
    $url = "$baseUrl/$categoryId/articles"
    try {
        Invoke-ApiRequest -Method GET -Url $url
        throw "Expected 404 Not Found, but request succeeded."
    } catch {
        if ($_.Exception.Response.StatusCode -ne 404) {
            throw "Expected 404 Not Found, but received $($_.Exception.Response.StatusCode)"
        }
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd() | ConvertFrom-Json
        if ($responseBody.error -ne 'Category not found') {
            throw "Expected error message 'Category not found', but received '$($responseBody.error)'"
        }
        Write-Host "Correctly received 404 Not Found for non-existent category."
    }
}

# Test 4: Retrieve articles for an invalid category ID (non-numeric)
Test-Endpoint -Name "Retrieve articles for an invalid category ID (abc)" -TestScript {
    $categoryId = "abc"
    $url = "$baseUrl/$categoryId/articles"
    try {
        Invoke-ApiRequest -Method GET -Url $url
        throw "Expected 400 Bad Request, but request succeeded."
    } catch {
        if ($_.Exception.Response.StatusCode -ne 400) {
            throw "Expected 400 Bad Request, but received $($_.Exception.Response.StatusCode)"
        }
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd() | ConvertFrom-Json
        if ($responseBody.error -ne 'Invalid category ID') {
            throw "Expected error message 'Invalid category ID', but received '$($responseBody.error)'"
        }
        Write-Host "Correctly received 400 Bad Request for invalid category ID."
    }
}

# Test 5: Retrieve articles for a category with no articles (assuming category ID 2 exists but has no articles)
# This test requires a category with no articles to be present in the database.
# For demonstration, let's assume category ID 2 exists but has no articles.
Test-Endpoint -Name "Retrieve articles for a category with no articles (ID 2)" -TestScript {
    $categoryId = 2 # Assuming category ID 2 exists but has no articles
    $url = "$baseUrl/$categoryId/articles"
    $response = Invoke-ApiRequest -Method GET -Url $url

    if ($response -is [System.Array]) {
        if ($response.Length -eq 0) {
            Write-Host "Correctly received an empty array for category with no articles."
        } else {
            throw "Expected an empty array, but received $($response.Length) articles."
        }
    } else {
        throw "Response is not an array."
    }
}