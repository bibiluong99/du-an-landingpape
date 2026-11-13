Add-Type -AssemblyName System.Drawing

$imgPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

Write-Host "Image size: $($img.Width) x $($img.Height)"

# Sample colors at key locations
# Topbar background (y=10, x=100)
$cTop = $img.GetPixel(100, 10)
Write-Host "Topbar color at (100,10): R=$($cTop.R), G=$($cTop.G), B=$($cTop.B) (#$($cTop.R.ToString('X2'))$($cTop.G.ToString('X2'))$($cTop.B.ToString('X2')))"

# Header background (y=40, x=100)
$cHead = $img.GetPixel(100, 40)
Write-Host "Header color at (100,40): R=$($cHead.R), G=$($cHead.G), B=$($cHead.B)"

# Banner region: y ranges roughly from 65 to 215
$cBannerTopLeft = $img.GetPixel(30, 80)
Write-Host "Banner sky top-left at (30,80): R=$($cBannerTopLeft.R), G=$($cBannerTopLeft.G), B=$($cBannerTopLeft.B)"

# Banner text "Dây điện - Cáp điện" approx y=100, x=100
$cText1 = $img.GetPixel(100, 100)
Write-Host "Banner text at (100,100): R=$($cText1.R), G=$($cText1.G), B=$($cText1.B)"

# Banner text "Chất lượng tạo nên giá trị!" approx y=125, x=100
$cText2 = $img.GetPixel(100, 125)
Write-Host "Banner text at (100,125): R=$($cText2.R), G=$($cText2.G), B=$($cText2.B)"

# Footer background approx y=900, x=100
$cFooter = $img.GetPixel(100, 900)
Write-Host "Footer color at (100,900): R=$($cFooter.R), G=$($cFooter.G), B=$($cFooter.B) (#$($cFooter.R.ToString('X2'))$($cFooter.G.ToString('X2'))$($cFooter.B.ToString('X2')))"

$img.Dispose()

