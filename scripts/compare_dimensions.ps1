Add-Type -AssemblyName System.Drawing

$mockupPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$currentPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/scratch/current_page.png'

$mockup = [System.Drawing.Bitmap]::FromFile($mockupPath)
$current = [System.Drawing.Bitmap]::FromFile($currentPath)

Write-Host "Mockup size: $($mockup.Width) x $($mockup.Height)"
Write-Host "Current page size: $($current.Width) x $($current.Height)"

$mockup.Dispose()
$current.Dispose()

