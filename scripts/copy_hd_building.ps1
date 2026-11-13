Add-Type -AssemblyName System.Drawing

$src = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/company_building_1794119008632.jpg'
$dst = 'C:/Du an/LandingPage/public/images/company-building-hd.jpg'

if (Test-Path $src) {
    Copy-Item $src $dst -Force
    $bmp = [System.Drawing.Bitmap]::FromFile($dst)
    Write-Host "HD Building copied: $($bmp.Width) x $($bmp.Height)"
    $bmp.Dispose()
}

