Add-Type -AssemblyName System.Drawing

$mockup = [System.Drawing.Bitmap]::FromFile('C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg')

Write-Host "Mockup dimensions: $($mockup.Width) x $($mockup.Height)"

# Let's inspect slice by slice heights:
# Topbar + Header: y = 0..68 (h=68)
# Banner: y = 68..217 (h=149)
# Categories: y = 217..330 (h=113)
# Promos: y = 330..415 (h=85)
# Bestsellers: y = 415..565 (h=150)
# Trust Badges: y = 565..615 (h=50)
# Company: y = 615..715 (h=100)
# News: y = 715..850 (h=135)
# Footer: y = 850..1024 (h=174)

Write-Host "Total height sum = $(68 + 149 + 113 + 85 + 150 + 50 + 100 + 135 + 174)"
$mockup.Dispose()

