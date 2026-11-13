Add-Type -AssemblyName System.Drawing

$mockupPath = 'C:/Users/bibil/.gemini/antigravity/brain/77fc0af7-a404-4258-9562-775951a2d57f/.user_uploaded/media_1794118455765_879d497b.jpg'
$img = [System.Drawing.Bitmap]::FromFile($mockupPath)

function Sample-Points($label, $xRange, $yRange, $step=2) {
    Write-Host "=== $label ==="
    $darkest = 999
    $darkColor = $null
    for ($x = $xRange[0]; $x -le $xRange[1]; $x += $step) {
        for ($y = $yRange[0]; $y -le $yRange[1]; $y += $step) {
            $c = $img.GetPixel($x, $y)
            $lum = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
            if ($lum -lt $darkest) {
                $darkest = $lum
                $darkColor = $c
            }
        }
    }
    if ($darkColor) {
        Write-Host "  Darkest text color: R=$($darkColor.R), G=$($darkColor.G), B=$($darkColor.B) (#$($darkColor.R.ToString('X2'))$($darkColor.G.ToString('X2'))$($darkColor.B.ToString('X2')))"
    }
}

# Logo text "Điện Việt" x=58..115, y=32..45
Sample-Points "Logo Điện Việt" @(58, 115) @(32, 45) 1

# Slogan "Kết nối giá trị" x=58..140, y=45..54
Sample-Points "Slogan" @(58, 140) @(45, 54) 1

# Menu Trang chủ (red) x=165..195, y=50..62
Sample-Points "Menu Trang chủ" @(165, 195) @(50, 62) 1

# Menu Giới thiệu (dark) x=205..245, y=50..62
Sample-Points "Menu Giới thiệu" @(205, 245) @(50, 62) 1

# Hotline number x=465..530, y=36..52
Sample-Points "Hotline 1800 1234" @(465, 530) @(36, 52) 1

# Section title "Danh mục sản phẩm" x=28..150, y=230..245
Sample-Points "Section title Danh mục" @(28, 150) @(230, 245) 1

# Banner title "Dây điện - Cáp điện" x=30..230, y=95..115
Sample-Points "Banner text Dây điện" @(30, 230) @(95, 115) 1

# Banner subtitle "Chất lượng tạo nên giá trị!" x=30..280, y=118..145
Sample-Points "Banner text Chất lượng" @(30, 280) @(118, 145) 1

# Price "85.000đ" x=20..80, y=515..530
Sample-Points "Price 85.000đ" @(20, 80) @(515, 530) 1

# Price "100.000đ" (strikethrough) x=60..110, y=515..530
Sample-Points "Price 100.000đ" @(60, 110) @(515, 530) 1

$img.Dispose()

