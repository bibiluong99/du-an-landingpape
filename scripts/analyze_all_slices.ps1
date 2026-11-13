Add-Type -AssemblyName System.Drawing

$slicesDir = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/scratch/mockup_slices'

function Analyze-Slice($filename) {
    $path = Join-Path $slicesDir $filename
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    Write-Host "=== $filename ($($bmp.Width) x $($bmp.Height)) ==="
    
    # Analyze color distribution or key points
    $colors = @{}
    for ($x = 0; $x -lt $bmp.Width; $x += 10) {
        for ($y = 0; $y -lt $bmp.Height; $y += 5) {
            $c = $bmp.GetPixel($x, $y)
            $hex = "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B
            if (-not $colors.ContainsKey($hex)) { $colors[$hex] = 0 }
            $colors[$hex]++
        }
    }
    
    $topColors = $colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5
    foreach ($tc in $topColors) {
        Write-Host "  Color $($tc.Key): $($tc.Value)"
    }
    $bmp.Dispose()
}

Get-ChildItem $slicesDir -Filter "*.png" | ForEach-Object {
    Analyze-Slice $_.Name
}

