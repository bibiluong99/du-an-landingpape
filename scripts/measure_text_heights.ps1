Add-Type -AssemblyName System.Drawing

$mockupPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($mockupPath)

function Get-TextBounds($label, $x1, $y1, $x2, $y2) {
    $minY = 9999
    $maxY = -1
    $minX = 9999
    $maxX = -1
    for ($x = $x1; $x -le $x2; $x++) {
        for ($y = $y1; $y -le $y2; $y++) {
            $c = $img.GetPixel($x, $y)
            $lum = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
            # If sufficiently dark or saturated (colored text)
            $isText = $false
            if ($lum -lt 180) { $isText = $true }
            if ($c.R -gt 160 -and $c.G -lt 80) { $isText = $true }
            
            if ($isText) {
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
    }
    $h = $maxY - $minY + 1
    $w = $maxX - $minX + 1
    Write-Host "$label -> Height = $h px (on 555px width), Width = $w px, y: $minY..$maxY"
}

# 1. Logo "Điện Việt"
Get-TextBounds "Logo 'Điện Việt'" 58 30 130 45

# 2. Slogan
Get-TextBounds "Slogan" 58 45 150 56

# 3. Nav "Trang chủ"
Get-TextBounds "Nav 'Trang chủ'" 165 48 200 62

# 4. Hotline "1800 1234"
Get-TextBounds "Hotline '1800 1234'" 460 38 525 55

# 5. Banner "Dây điện - Cáp điện"
Get-TextBounds "Banner 'Dây điện - Cáp điện'" 30 90 240 120

# 6. Banner "Chất lượng tạo nên giá trị!"
Get-TextBounds "Banner 'Chất lượng tạo nên giá trị!'" 30 115 285 145

# 7. Section title "Danh mục sản phẩm"
Get-TextBounds "Section 'Danh mục sản phẩm'" 25 228 150 245

# 8. Category name "Dây điện"
Get-TextBounds "Category 'Dây điện'" 20 305 85 325

# 9. Product name "Dây điện Cadivi 2.5mm²"
Get-TextBounds "Product 'Dây điện Cadivi'" 20 495 110 515

# 10. Product price "85.000đ"
Get-TextBounds "Price '85.000đ'" 20 515 75 532

# 11. Product button "Thêm vào giỏ"
Get-TextBounds "Button 'Thêm vào giỏ'" 20 533 110 555

$img.Dispose()

