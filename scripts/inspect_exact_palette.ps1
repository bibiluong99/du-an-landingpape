Add-Type -AssemblyName System.Drawing

$mockupPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($mockupPath)

function Get-DominantOrKeyColor($label, $x, $y) {
    $c = $img.GetPixel($x, $y)
    $hex = "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B
    Write-Host "$label at ($x, $y): $hex (R=$($c.R), G=$($c.G), B=$($c.B))"
}

# 1. Topbar background
Get-DominantOrKeyColor "Topbar BG" 100 10

# 2. Header background
Get-DominantOrKeyColor "Header BG" 100 40

# 3. Logo square
Get-DominantOrKeyColor "Logo Square" 45 40

# 4. Hotline text "1800 1234"
Get-DominantOrKeyColor "Hotline 1800 1234" 480 46

# 5. Banner sky top
Get-DominantOrKeyColor "Banner sky top" 50 80

# 6. Banner sky mid (behind text)
Get-DominantOrKeyColor "Banner behind text" 50 120

# 7. Banner title "Dây điện"
Get-DominantOrKeyColor "Banner title text" 60 105

# 8. Banner subtitle "Chất lượng"
Get-DominantOrKeyColor "Banner subtitle text" 60 130

# 9. Banner button
Get-DominantOrKeyColor "Banner Mua ngay button" 80 178

# 10. Section title bar (red bar)
Get-DominantOrKeyColor "Section title red bar" 20 236

# 11. Section title text "Danh mục sản phẩm"
Get-DominantOrKeyColor "Section title text" 50 238

# 12. "Xem tất cả" link
Get-DominantOrKeyColor "Xem tat ca link" 510 238

# 13. Promo Left red background
Get-DominantOrKeyColor "Promo Left BG" 100 370

# 14. Promo Left yellow button
Get-DominantOrKeyColor "Promo Left Yellow Button" 235 382

# 15. Promo Right beige background
Get-DominantOrKeyColor "Promo Right BG" 350 370

# 16. Product 1 discount badge (-15%)
Get-DominantOrKeyColor "Product discount badge" 30 442

# 17. Product 1 price (85.000đ)
Get-DominantOrKeyColor "Product 1 price text" 40 525

# 18. Product 1 button (Thêm vào giỏ)
Get-DominantOrKeyColor "Product 1 button" 60 545

# 19. Trust badges strip background
Get-DominantOrKeyColor "Trust badges BG" 100 585

# 20. Trust badges text
Get-DominantOrKeyColor "Trust badges text" 100 588

# 21. Company section card BG
Get-DominantOrKeyColor "Company Card BG" 250 660

# 22. Footer background
Get-DominantOrKeyColor "Footer BG" 100 900

$img.Dispose()

