# PowerShell script to interact with the app and capture results
$url = "http://127.0.0.1:8765/index.html?v=2"

try {
    # Create IE COM object
    $ie = New-Object -ComObject InternetExplorer.Application
    $ie.Visible = $false
    $ie.Navigate($url)
    
    # Wait for page to load
    while ($ie.Busy -or $ie.ReadyState -ne 4) {
        Start-Sleep -Milliseconds 100
    }
    
    # Give JavaScript time to initialize
    Start-Sleep -Seconds 1
    
    $doc = $ie.Document
    
    Write-Host "=== INITIAL PAGE STATE ==="
    Write-Host "Page title: $($doc.title)"
    Write-Host ""
    
    # Find textarea and insert test data
    $textarea = $doc.getElementById("input")
    if ($textarea) {
        $testData = @"
＜引用文献等一覧＞
1．特開2020-123456号公報
2．特開2021-789012号公報

●理由1（進歩性）について
特許法第29条第2項の規定により特許を受けることができない。

・請求項 1-3,5
・引用文献等 1,2
・備考
引用文献1の段落[0058]-[0061]及び[0079]、図1を参照。引用文献2の段落[0010]を参照。

・請求項 11
・引用文献等 1
・備考
引用文献1の段落[0020]-[0025]を参照。

●理由2（サポート要件）について
特許法第36条第6項第1号の規定に違反する。

・請求項 4,6
・備考
請求項4及び6の記載は明確でない。

＜拒絶の理由を発見しない請求項＞
請求項（７－１０、１２－１４）に係る発明については、拒絶の理由を発見しない。
"@
        $textarea.value = $testData
    Write-Host "✓ Test data inserted into textarea"
    Write-Host ""
    
    # Enable debug mode
    $debugCheckbox = $doc.getElementById("optDebug")
    if ($debugCheckbox) {
        $debugCheckbox.checked = $true
        Write-Host "✓ Enabled debug mode"
    }
    } else {
        Write-Host "✗ Could not find textarea with id='input'"
    }
    
    # Find and click the analyze button
    $button = $doc.getElementById("btnAnalyze")
    if ($button) {
        $button.click()
        Write-Host "✓ Clicked 解析 button"
        
        # Wait for analysis to complete
        Start-Sleep -Seconds 2
    } else {
        Write-Host "✗ Could not find analyze button"
    }
    
    Write-Host ""
    Write-Host "=== OUTPUT SECTIONS ==="
    Write-Host ""
    
    # Show what's actually in the textarea
    Write-Host "--- TEXTAREA CONTENT (first 500 chars) ---"
    $actualContent = $textarea.value
    Write-Host $actualContent.Substring(0, [Math]::Min(500, $actualContent.Length))
    Write-Host ""
    Write-Host "--- END TEXTAREA ---"
    Write-Host ""
    
    # Get output sections
    $output29 = $doc.getElementById("outNovelty")
    $output36 = $doc.getElementById("outOther")
    $outputOpen = $doc.getElementById("outOpen")
    
    if ($output29) {
        Write-Host "--- 新規性・進歩性（29条） ---"
        Write-Host $output29.innerText
        Write-Host ""
    } else {
        Write-Host "✗ Could not find outNovelty section"
        Write-Host ""
    }
    
    if ($output36) {
        Write-Host "--- その他理由（36条など） ---"
        Write-Host $output36.innerText
        Write-Host ""
    } else {
        Write-Host "✗ Could not find outOther section"
        Write-Host ""
    }
    
    if ($outputOpen) {
        Write-Host "--- 空いている請求項 ---"
        Write-Host $outputOpen.innerText
        Write-Host ""
    } else {
        Write-Host "✗ Could not find outOpen section"
        Write-Host ""
    }
    
    # Get debug output
    $outputDebug = $doc.getElementById("outDebug")
    if ($outputDebug -and $outputDebug.innerText) {
        Write-Host "--- DEBUG OUTPUT ---"
        Write-Host $outputDebug.innerText
        Write-Host ""
    }
    
    $ie.Quit()
} catch {
    Write-Host "Error: $_"
}
