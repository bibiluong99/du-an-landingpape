Add-Type -AssemblyName System.Drawing

$files = @(
    'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/hero_banner_clean_1794118992985.jpg',
    'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/company_building_1794119008632.jpg'
)

foreach ($f in $files) {
    if (Test-Path $f) {
        $bmp = [System.Drawing.Bitmap]::FromFile($f)
        Write-Host "$f : $($bmp.Width) x $($bmp.Height)"
        $bmp.Dispose()
    }
}

