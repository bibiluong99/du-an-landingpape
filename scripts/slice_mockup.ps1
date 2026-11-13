Add-Type -AssemblyName System.Drawing

$imgPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

$slicesDir = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/scratch/mockup_slices'
if (!(Test-Path $slicesDir)) {
    New-Item -ItemType Directory -Path $slicesDir -Force | Out-Null
}

$slices = @(
  @{ name = '01_topbar_header.png'; y = 0; h = 70 },
  @{ name = '02_hero_banner.png'; y = 68; h = 155 },
  @{ name = '03_categories.png'; y = 223; h = 115 },
  @{ name = '04_promo_banners.png'; y = 338; h = 80 },
  @{ name = '05_bestsellers.png'; y = 418; h = 150 },
  @{ name = '06_trust_badges.png'; y = 568; h = 50 },
  @{ name = '07_company_intro.png'; y = 618; h = 100 },
  @{ name = '08_news_blogs.png'; y = 718; h = 135 },
  @{ name = '09_footer.png'; y = 853; h = 171 }
)

foreach ($s in $slices) {
  $rect = New-Object System.Drawing.Rectangle(0, $s.y, $img.Width, $s.h)
  $bmp = $img.Clone($rect, $img.PixelFormat)
  $bmp.Save("$slicesDir/$($s.name)", [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Saved $($s.name)"
}

$img.Dispose()

