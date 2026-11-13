Add-Type -AssemblyName System.Drawing

$mockupPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($mockupPath)

$outDir = 'C:/Du an/LandingPage/public/images/mockup_assets'
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

function Upscale-Crop($rect, $outName, $scale = 2) {
    $bmp = $img.Clone($rect, $img.PixelFormat)
    $tw = [int]($rect.Width * $scale)
    $th = [int]($rect.Height * $scale)
    $dest = New-Object System.Drawing.Bitmap($tw, $th)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($bmp, 0, 0, $tw, $th)
    $g.Dispose()
    $bmp.Dispose()
    
    $fullPath = Join-Path $outDir $outName
    $dest.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Host "Saved $outName ($tw x $th)"
}

# 1. Categories (image parts only)
# y approx 248 to 304, height approx 56
Upscale-Crop (New-Object System.Drawing.Rectangle(20, 248, 70, 56)) "cat-day-dien.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(109, 248, 70, 56)) "cat-day-cap-dien.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(198, 248, 70, 56)) "cat-thiet-bi-dien.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(287, 248, 70, 56)) "cat-o-cam-cong-tac.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(376, 248, 70, 56)) "cat-phu-kien-dien.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(465, 248, 70, 56)) "cat-den-chieu-sang.png" 3

# 2. Promos (full promo card graphics)
Upscale-Crop (New-Object System.Drawing.Rectangle(17, 340, 258, 65)) "promo-chinh-hang.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(280, 340, 258, 65)) "promo-giao-hang.png" 3

# 3. Products (image parts only)
# y approx 438 to 494, height approx 56
Upscale-Crop (New-Object System.Drawing.Rectangle(24, 438, 86, 56)) "prod-cadivi-25.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(129, 438, 86, 56)) "prod-cap-cvv.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(234, 438, 86, 56)) "prod-aptomat-63a.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(339, 438, 86, 56)) "prod-day-ls.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(444, 438, 86, 56)) "prod-mang-cap.png" 3

# 4. Company building photo
Upscale-Crop (New-Object System.Drawing.Rectangle(17, 633, 175, 75)) "company-building.png" 3

# 5. Blogs (image parts only)
Upscale-Crop (New-Object System.Drawing.Rectangle(17, 736, 170, 68)) "blog-chon-day-dien.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(192, 736, 170, 68)) "blog-tiet-kiem-dien.png" 3
Upscale-Crop (New-Object System.Drawing.Rectangle(368, 736, 170, 68)) "blog-den-led.png" 3

# 6. Footer map
Upscale-Crop (New-Object System.Drawing.Rectangle(430, 868, 108, 76)) "footer-map.png" 3

$img.Dispose()

