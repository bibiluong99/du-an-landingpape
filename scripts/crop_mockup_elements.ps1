Add-Type -AssemblyName System.Drawing

$mockupPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($mockupPath)

$cropDir = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/scratch/crops'
if (!(Test-Path $cropDir)) { New-Item -ItemType Directory -Path $cropDir -Force | Out-Null }

# Let's crop the exact Hero Banner
# Banner begins around y=68 and ends around y=217 (height = 149)
$bannerRect = New-Object System.Drawing.Rectangle(0, 68, $img.Width, 149)
$bannerBmp = $img.Clone($bannerRect, $img.PixelFormat)
$bannerBmp.Save("$cropDir/mockup_banner.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bannerBmp.Dispose()
Write-Host "Banner cropped: 0, 68, $($img.Width), 149"

# Let's inspect category icons
# y from 248 to 310
# 6 categories across width: x approx 18, 107, 196, 285, 374, 463
# width approx 74 each
for ($i = 0; $i -lt 6; $i++) {
    $x = 18 + $i * 89
    $rect = New-Object System.Drawing.Rectangle($x, 248, 74, 75)
    $catBmp = $img.Clone($rect, $img.PixelFormat)
    $catBmp.Save("$cropDir/cat_$($i+1).png", [System.Drawing.Imaging.ImageFormat]::Png)
    $catBmp.Dispose()
}
Write-Host "Categories cropped"

# Promo banners:
# Left promo: x=18, y=340, w=256, h=65
$leftPromo = New-Object System.Drawing.Rectangle(18, 340, 256, 65)
$p1 = $img.Clone($leftPromo, $img.PixelFormat)
$p1.Save("$cropDir/promo_left.png", [System.Drawing.Imaging.ImageFormat]::Png)
$p1.Dispose()

# Right promo: x=281, y=340, w=256, h=65
$rightPromo = New-Object System.Drawing.Rectangle(281, 340, 256, 65)
$p2 = $img.Clone($rightPromo, $img.PixelFormat)
$p2.Save("$cropDir/promo_right.png", [System.Drawing.Imaging.ImageFormat]::Png)
$p2.Dispose()
Write-Host "Promos cropped"

# 5 Products:
# y from 432 to 558
# 5 products across width: x approx 18, 123, 228, 333, 438, width approx 99 each
for ($i = 0; $i -lt 5; $i++) {
    $x = 18 + $i * 105
    $rect = New-Object System.Drawing.Rectangle($x, 432, 99, 126)
    $prodBmp = $img.Clone($rect, $img.PixelFormat)
    $prodBmp.Save("$cropDir/product_card_$($i+1).png", [System.Drawing.Imaging.ImageFormat]::Png)
    $prodBmp.Dispose()
}
Write-Host "Products cropped"

# Company intro:
# Building photo: x=18, y=633, w=172, h=72
$buildingRect = New-Object System.Drawing.Rectangle(18, 633, 172, 72)
$bBmp = $img.Clone($buildingRect, $img.PixelFormat)
$bBmp.Save("$cropDir/company_building.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bBmp.Dispose()
Write-Host "Company building cropped"

# 3 Blog cards:
# y from 736 to 838
# 3 blogs: x approx 18, 193, 368, w approx 168 each
for ($i = 0; $i -lt 3; $i++) {
    $x = 18 + $i * 175
    $rect = New-Object System.Drawing.Rectangle($x, 736, 168, 102)
    $blogBmp = $img.Clone($rect, $img.PixelFormat)
    $blogBmp.Save("$cropDir/blog_card_$($i+1).png", [System.Drawing.Imaging.ImageFormat]::Png)
    $blogBmp.Dispose()
}
Write-Host "Blogs cropped"

# Footer map:
# x=430, y=868, w=107, h=76
$mapRect = New-Object System.Drawing.Rectangle(430, 868, 107, 76)
$mapBmp = $img.Clone($mapRect, $img.PixelFormat)
$mapBmp.Save("$cropDir/footer_map.png", [System.Drawing.Imaging.ImageFormat]::Png)
$mapBmp.Dispose()
Write-Host "Footer map cropped"

$img.Dispose()

