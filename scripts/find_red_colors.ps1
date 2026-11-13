Add-Type -AssemblyName System.Drawing

$mockupPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($mockupPath)

function Find-Reddest($label, $xRange, $yRange) {
    $maxRedDiff = -999
    $redColor = $null
    for ($x = $xRange[0]; $x -le $xRange[1]; $x++) {
        for ($y = $yRange[0]; $y -le $yRange[1]; $y++) {
            $c = $img.GetPixel($x, $y)
            $diff = $c.R - [Math]::Max($c.G, $c.B)
            if ($diff -gt $maxRedDiff) {
                $maxRedDiff = $diff
                $redColor = $c
            }
        }
    }
    Write-Host "=== $label ==="
    Write-Host "  Reddest: R=$($redColor.R), G=$($redColor.G), B=$($redColor.B) (#$($redColor.R.ToString('X2'))$($redColor.G.ToString('X2'))$($redColor.B.ToString('X2')))"
}

Find-Reddest "Banner Chất lượng" @(30, 280) @(118, 145)
Find-Reddest "Price Cadivi" @(20, 80) @(515, 530)
Find-Reddest "Topbar" @(20, 100) @(5, 20)
Find-Reddest "Button Mua ngay" @(30, 100) @(165, 185)
Find-Reddest "Promo Shield" @(30, 80) @(340, 390)

$img.Dispose()

