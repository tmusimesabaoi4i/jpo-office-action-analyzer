# PowerShell script to fetch and render test.html using Internet Explorer COM object
$url = "http://127.0.0.1:8765/test.html?v=2"

try {
    # Create IE COM object
    $ie = New-Object -ComObject InternetExplorer.Application
    $ie.Visible = $false
    $ie.Navigate($url)
    
    # Wait for page to load
    while ($ie.Busy -or $ie.ReadyState -ne 4) {
        Start-Sleep -Milliseconds 100
    }
    
    # Give JavaScript time to execute
    Start-Sleep -Seconds 2
    
    # Get the text content
    $doc = $ie.Document
    $logElement = $doc.getElementById("log")
    
    if ($logElement) {
        Write-Host "Test Results:"
        Write-Host "============="
        Write-Host $logElement.innerText
    } else {
        Write-Host "Could not find log element"
        Write-Host "Body text:"
        Write-Host $doc.body.innerText
    }
    
    $ie.Quit()
} catch {
    Write-Host "Error: $_"
}
