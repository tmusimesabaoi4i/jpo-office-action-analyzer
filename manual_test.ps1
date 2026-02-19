# Simple script to capture the HTML after processing
$url = "http://127.0.0.1:8765/index.html?v=2"

try {
    $ie = New-Object -ComObject InternetExplorer.Application
    $ie.Visible = $true  # Make visible for debugging
    $ie.Navigate($url)
    
    while ($ie.Busy -or $ie.ReadyState -ne 4) {
        Start-Sleep -Milliseconds 100
    }
    
    Start-Sleep -Seconds 1
    
    $doc = $ie.Document
    $textarea = $doc.getElementById("input")
    
    if ($textarea) {
        # Use a simpler test case
        $testData = "＜引用文献等一覧＞`r`n1．特開2020-123456号公報`r`n2．特開2021-789012号公報`r`n`r`n●理由1（進歩性）について`r`n特許法第29条第2項の規定により特許を受けることができない。`r`n`r`n・請求項 1-3,5`r`n・引用文献等 1,2`r`n・備考`r`n引用文献1の段落[0058]-[0061]及び[0079]、図1を参照。引用文献2の段落[0010]を参照。`r`n`r`n・請求項 11`r`n・引用文献等 1`r`n・備考`r`n引用文献1の段落[0020]-[0025]を参照。`r`n`r`n●理由2（サポート要件）について`r`n特許法第36条第6項第1号の規定に違反する。`r`n`r`n・請求項 4,6`r`n・備考`r`n請求項4及び6の記載は明確でない。`r`n`r`n＜拒絶の理由を発見しない請求項＞`r`n請求項（７－１０、１２－１４）に係る発明については、拒絶の理由を発見しない。"
        
        $textarea.value = $testData
        Write-Host "Data inserted"
        Start-Sleep -Seconds 1
        
        # Click analyze
        $button = $doc.getElementById("btnAnalyze")
        if ($button) {
            $button.click()
            Write-Host "Button clicked"
            Start-Sleep -Seconds 3
            
            # Get outputs
            $out1 = $doc.getElementById("outNovelty")
            $out2 = $doc.getElementById("outOther")
            $out3 = $doc.getElementById("outOpen")
            
            Write-Host "`n=== 新規性・進歩性（29条） ==="
            if ($out1) { Write-Host $out1.innerText }
            
            Write-Host "`n=== その他理由（36条など） ==="
            if ($out2) { Write-Host $out2.innerText }
            
            Write-Host "`n=== 空いている請求項 ==="
            if ($out3) { Write-Host $out3.innerText }
        }
    }
    
    Write-Host "`nPress Enter to close browser..."
    Read-Host
    
    $ie.Quit()
} catch {
    Write-Host "Error: $_"
}
