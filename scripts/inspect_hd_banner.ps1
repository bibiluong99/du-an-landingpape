Add-Type -AssemblyName System.Drawing

$f = 'C:/Du an/LandingPage/public/images/hero-banner-hd.jpg'
$b = [System.Drawing.Bitmap]::FromFile($f)

Write-Host "hero-banner-hd.jpg: $($b.Width) x $($b.Height)"

# Sample top-left, center, bottom-right
$cTL = $b.GetPixel(100, 100)
$cTR = $b.GetPixel($b.Width - 100, 100)
$cBL = $b.GetPixel(100, $b.Height - 100)
$cBR = $b.GetPixel($b.Width - 100, $b.Height - 100)

Write-Host "Top-Left: R=$($cTL.R), G=$($cTL.G), B=$($cTL.B)"
Write-Host "Top-Right: R=$($cTR.R), G=$($cTR.G), B=$($cTR.B)"
Write-Host "Bottom-Left: R=$($cBL.R), G=$($cBL.G), B=$($cBL.B)"
Write-Host "Bottom-Right: R=$($cBR.R), G=$($cBR.G), B=$($cBR.B)"

$b.Dispose()

