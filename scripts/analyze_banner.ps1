Add-Type -AssemblyName System.Drawing

$slicePath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/scratch/mockup_slices/02_hero_banner.png'
$bmp = [System.Drawing.Bitmap]::FromFile($slicePath)

Write-Host "Banner size: $($bmp.Width) x $($bmp.Height)"

# Let's inspect background color at top-left, center, top-right
$cTL = $bmp.GetPixel(10, 10)
$cML = $bmp.GetPixel(10, [int]($bmp.Height/2))
$cBL = $bmp.GetPixel(10, $bmp.Height - 10)

Write-Host "Left top: R=$($cTL.R), G=$($cTL.G), B=$($cTL.B)"
Write-Host "Left mid: R=$($cML.R), G=$($cML.G), B=$($cML.B)"
Write-Host "Left bot: R=$($cBL.R), G=$($cBL.G), B=$($cBL.B)"

# Inspect text colors
# "Dây điện - Cáp điện"
$cTextD = $bmp.GetPixel(80, 36)
Write-Host "Dây điện text at (80,36): R=$($cTextD.R), G=$($cTextD.G), B=$($cTextD.B)"

# "Chất lượng tạo nên giá trị!"
$cTextC = $bmp.GetPixel(80, 58)
Write-Host "Chất lượng text at (80,58): R=$($cTextC.R), G=$($cTextC.G), B=$($cTextC.B)"

# Topbar color in slice 1
$bmp.Dispose()

$slice1 = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/scratch/mockup_slices/01_topbar_header.png'
$bmp1 = [System.Drawing.Bitmap]::FromFile($slice1)
$cTopBar = $bmp1.GetPixel(200, 8)
Write-Host "Topbar color: R=$($cTopBar.R), G=$($cTopBar.G), B=$($cTopBar.B) (#$($cTopBar.R.ToString('X2'))$($cTopBar.G.ToString('X2'))$($cTopBar.B.ToString('X2')))"
$cLogo = $bmp1.GetPixel(45, 38)
Write-Host "Logo color: R=$($cLogo.R), G=$($cLogo.G), B=$($cLogo.B) (#$($cLogo.R.ToString('X2'))$($cLogo.G.ToString('X2'))$($cLogo.B.ToString('X2')))"
$bmp1.Dispose()

