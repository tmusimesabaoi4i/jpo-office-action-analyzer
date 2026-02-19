$url = "http://127.0.0.1:8765/index.html?v=3"
$dataFile = "C:\Users\yohei\Downloads\new_project\test_data.txt"

try {
    $testData = Get-Content -Path $dataFile -Raw -Encoding UTF8
    
    $ie = New-Object -ComObject InternetExplorer.Application
    $ie.Visible = $false
    $ie.Navigate($url)
    
    while ($ie.Busy -or $ie.ReadyState -ne 4) {
        Start-Sleep -Milliseconds 100
    }
    
    Start-Sleep -Seconds 1
    
    $doc = $ie.Document
    $textarea = $doc.getElementById("input")
    
    if ($textarea) {
        $textarea.value = $testData
        Start-Sleep -Milliseconds 500
        
        $button = $doc.getElementById("btnAnalyze")
        if ($button) {
            $button.click()
            Start-Sleep -Seconds 2
            
            $out1 = $doc.getElementById("outNovelty")
            $out2 = $doc.getElementById("outOther")
            $out3 = $doc.getElementById("outOpen")
            
            Write-Host "=== NOVELTY/INVENTIVE STEP (29条) ==="
            if ($out1) { Write-Host $out1.innerText }
            
            Write-Host ""
            Write-Host "=== OTHER REASONS (36条など) ==="
            if ($out2) { Write-Host $out2.innerText }
            
            Write-Host ""
            Write-Host "=== OPEN CLAIMS ==="
            if ($out3) { Write-Host $out3.innerText }
        }
    }
    
    $ie.Quit()
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
