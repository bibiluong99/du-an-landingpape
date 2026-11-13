Add-Type -AssemblyName System.Drawing

$srcPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/scratch/crops/mockup_banner.png'
$dstPath = 'C:/Du an/LandingPage/public/images/hero-banner-exact.png'

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$targetWidth = 1920
$targetHeight = [int]($src.Height * ($targetWidth / $src.Width))

$dest = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$g.DrawImage($src, 0, 0, $targetWidth, $targetHeight)
$g.Dispose()
$src.Dispose()

$dest.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Dispose()

Write-Host "Upscaled banner to $targetWidth x $targetHeight saved to $dstPath"

