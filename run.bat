@echo off
chcp 65001 > nul
echo ============================================================
echo   🚀 ĐANG KHỞI CHẠY HỆ THỐNG LANDING PAGE ^& ADMIN CMS
echo ============================================================
echo.
echo * Máy chủ web: http://localhost:3000
echo * Trang chủ: http://localhost:3000/
echo * Danh sách sản phẩm: http://localhost:3000/products
echo * Đăng nhập quản trị: http://localhost:3000/login
echo * Bảng điều khiển CMS: http://localhost:3000/admin
echo.
echo Tài khoản mặc định: admin / admin123
echo CSDL SQL cục bộ: database.sqlite
echo ============================================================
echo.
npm start
pause

