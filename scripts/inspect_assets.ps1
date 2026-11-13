Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem 'c:/Du an/LandingPage/public/images' -Include *.jpg,*.png,*.svg -Recurse
foreach ($f in $files) {
    if ($f.Extension -ne '.svg') {
        try {
            $bmp = [System.Drawing.Bitmap]::FromFile($f.FullName)
            Write-Host "$($f.Name) : $($bmp.Width) x $($bmp.Height)"
            $bmp.Dispose()
        } catch {
            Write-Host "$($f.Name) : cannot read bitmap"
        }
    } else {
        Write-Host "$($f.Name) : SVG"
    }
}

