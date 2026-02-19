# PowerShell script to fetch integration test results
$url = "http://127.0.0.1:8765/test_integration.html"

try {
    # Create IE COM object
    $ie = New-Object -ComObject InternetExplorer.Application
    $ie.Visible = $false
    $ie.Navigate($url)
    
    # Wait for page to load
    while ($ie.Busy -or $ie.ReadyState -ne 4) {
        Start-Sleep -Milliseconds 100
    }
    
    # Give JavaScript time to execute (integration tests might take longer)
    Start-Sleep -Seconds 3
    
    # Get the text content
    $doc = $ie.Document
    $logElement = $doc.getElementById("log")
    
    if ($logElement) {
        Write-Host "=== INTEGRATION TEST RESULTS ==="
        Write-Host $logElement.innerText
    } else {
        Write-Host "ERROR: Could not find log element with id='log'"
        Write-Host "Page title: $($doc.title)"
        Write-Host "Body text (first 1000 chars):"
        Write-Host $doc.body.innerText.Substring(0, [Math]::Min(1000, $doc.body.innerText.Length))
    }
    
    $ie.Quit()
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
