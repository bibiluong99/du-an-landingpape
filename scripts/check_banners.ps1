Add-Type -AssemblyName System.Drawing

$mockupBanner = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/scratch/mockup_slices/02_hero_banner.png'
$hdBanner = 'C:/Du an/LandingPage/public/images/hero-banner-hd.jpg'

$bmp1 = [System.Drawing.Bitmap]::FromFile($mockupBanner)
$bmp2 = [System.Drawing.Bitmap]::FromFile($hdBanner)

Write-Host "Mockup banner: $($bmp1.Width) x $($bmp1.Height)"
Write-Host "HD banner: $($bmp2.Width) x $($bmp2.Height)"

$bmp1.Dispose()
$bmp2.Dispose()

