Add-Type -AssemblyName System.Drawing

$mockupPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($mockupPath)

Write-Host "Total Image Width: $($img.Width), Height: $($img.Height)"

# 1. Topbar left icon starts where?
# In slice 1 (y=8):
$xStart = 0
for ($x = 0; $x -lt 100; $x++) {
    $c = $img.GetPixel($x, 8)
    if ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240) {
        $xStart = $x
        break
    }
}
Write-Host "Topbar first white icon x = $xStart (pct = $($xStart / $img.Width * 100)%)"

# 2. Header logo icon starts where?
# In slice 1 (y=40):
$xLogo = 0
for ($x = 0; $x -lt 100; $x++) {
    $c = $img.GetPixel($x, 40)
    # Background is white. Red logo box has high red:
    if ($c.R -gt 180 -and $c.G -lt 100) {
        $xLogo = $x
        break
    }
}
Write-Host "Header logo box x = $xLogo (pct = $($xLogo / $img.Width * 100)%)"

# 3. Header hotline right ends where?
$xHotline = 0
for ($x = $img.Width - 1; $x -gt $img.Width - 100; $x--) {
    $c = $img.GetPixel($x, 42)
    if ($c.R -gt 150 -and $c.G -lt 100) {
        $xHotline = $x
        break
    }
}
Write-Host "Header hotline right edge x = $xHotline (pct = $($xHotline / $img.Width * 100)%)"

# 4. Category card 1 starts where? (y=260)
$xCat1 = 0
for ($x = 0; $x -lt 100; $x++) {
    $c = $img.GetPixel($x, 260)
    # border or non-white
    if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
        $xCat1 = $x
        break
    }
}
Write-Host "Category 1 card left x = $xCat1 (pct = $($xCat1 / $img.Width * 100)%)"

# 5. Category card 6 ends where? (y=260)
$xCat6 = 0
for ($x = $img.Width - 1; $x -gt $img.Width - 100; $x--) {
    $c = $img.GetPixel($x, 260)
    if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
        $xCat6 = $x
        break
    }
}
Write-Host "Category 6 card right x = $xCat6 (pct = $($xCat6 / $img.Width * 100)%)"

# 6. Promo banner left starts where? (y=360)
$xPromoL = 0
for ($x = 0; $x -lt 100; $x++) {
    $c = $img.GetPixel($x, 360)
    if ($c.R -gt 180 -and $c.G -lt 100) {
        $xPromoL = $x
        break
    }
}
Write-Host "Promo left banner x = $xPromoL (pct = $($xPromoL / $img.Width * 100)%)"

# 7. Promo banner right ends where? (y=360)
$xPromoR = 0
for ($x = $img.Width - 1; $x -gt $img.Width - 100; $x--) {
    $c = $img.GetPixel($x, 360)
    # border of right promo banner
    if ($c.R -lt 250 -and $c.G -lt 250) {
        $xPromoR = $x
        break
    }
}
Write-Host "Promo right banner x = $xPromoR (pct = $($xPromoR / $img.Width * 100)%)"

# 8. Banner text left margin x in banner
# y=105 ("Dây điện")
$xBannerText = 0
for ($x = 0; $x -lt 100; $x++) {
    $c = $img.GetPixel($x, 105)
    if ($c.R -lt 100 -and $c.G -lt 100) {
        $xBannerText = $x
        break
    }
}
Write-Host "Banner text left x = $xBannerText (pct = $($xBannerText / $img.Width * 100)%)"

$img.Dispose()

