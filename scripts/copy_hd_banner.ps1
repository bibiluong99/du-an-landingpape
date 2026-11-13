Add-Type -AssemblyName System.Drawing

$src = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/electrical_cable_hero_banner_1794123552705.jpg'
$dst = 'C:/Du an/LandingPage/public/images/hero-banner-hd.jpg'

if (Test-Path $src) {
    Copy-Item $src $dst -Force
    $bmp = [System.Drawing.Bitmap]::FromFile($dst)
    Write-Host "HD Banner copied: $($bmp.Width) x $($bmp.Height)"
    $bmp.Dispose()
} else {
    Write-Host "Source file not found: $src"
}

