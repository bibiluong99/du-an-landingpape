# HỆ THỐNG LANDING PAGE & ADMIN CMS (THEME ĐỎ & TRẮNG)

Dự án Landing Page và Hệ thống Quản trị (Admin CMS) hoàn chỉnh theo đúng tài liệu yêu cầu, lưu trữ dữ liệu trực tiếp vào cơ sở dữ liệu quan hệ SQL cục bộ (`database.sqlite`) trên máy tính.

---

## 🌟 1. Tổng Quan Kiến Trúc & Tính Năng

### 🎨 Quy chuẩn Theme & Layout:
- **Tone màu chủ đạo**: Đỏ & Trắng (`#DC2626` / `#B91C1C` / `#FFFFFF`).
- **Phong cách**: Hiện đại, mượt mà, tối ưu hiển thị 100% trên cả Desktop, Tablet và Mobile.

### 🌐 Giao diện Người dùng (Client):
1. **Trang chủ (`/` hoặc `/index.html`)**:
   - **Header**: Logo công ty bên trái, hotline, menu điều hướng (*Trang chủ, Giới thiệu, Sản phẩm, Tin tức, Liên hệ*).
   - **Banner chính (Hero Section)**: Bên trái là ảnh đại diện banner nổi bật, bên phải là câu slogan thương hiệu, nút CTA khám phá và số liệu uy tín.
   - **Danh mục sản phẩm nổi bật (Slider/Carousel)**:
     - Hiển thị đồng thời **tối đa 3 danh mục** trên màn hình lớn.
     - Cơ chế trượt tự động (**Auto-play sau mỗi 3 giây**), có nút Prev/Next và indicators.
     - Dữ liệu danh mục được cấu hình trực tiếp từ trang Admin (cờ `show_in_slider`).
   - **Khu vực "Sản phẩm mới"**: Lưới gồm **8 sản phẩm mới nhất**, nhãn "Mới", nút "Xem tất cả" sang trang sản phẩm.
   - **Khu vực "Sản phẩm khuyến mãi"**: Lưới gồm **8 sản phẩm đang có ưu đãi**, nhãn "% Giảm giá", giá gốc gạch ngang và giá ưu đãi, nút "Xem tất cả".
   - **Khu vực "Giới thiệu công ty"**: Tóm tắt lịch sử, sứ mệnh, giá trị cốt lõi, địa chỉ, số điện thoại hotline.
   - **Khu vực "Blog / Tin tức"**: Danh sách bài viết tin tức công nghệ mới nhất kèm popup đọc bài viết.
   - **Khu vực "Liên hệ"**:
     - Bản đồ nhúng Google Maps định vị trụ sở công ty.
     - Kênh kết nối: Hotline, Email, Link Zalo Chat, Link Facebook, Link Shopee.
     - Form gửi thông tin liên hệ: Họ tên, Số điện thoại, Email, **Loại liên hệ (Dropdown/Radio chọn: Báo giá hoặc Khiếu nại)**, Nội dung lời nhắn.
   - **Footer**: Menu điều hướng, thông tin bản quyền (Copyright), liên kết nhanh.
2. **Trang danh sách sản phẩm (`/products`)**:
   - **Bộ lọc (Filter)**: Lọc theo từ khóa tên sản phẩm, lọc theo Loại/Danh mục sản phẩm, sắp xếp giá, lọc nhanh Sản phẩm Mới / Khuyến Mãi.
   - **Danh sách hiển thị**: Danh sách toàn bộ sản phẩm hiện có trong SQL.
   - **Popup Chi tiết sản phẩm**: Nhấn vào bất kỳ sản phẩm nào mở ngay Modal phóng to hình ảnh, xem giá, mô tả, thông số kỹ thuật chi tiết mà **không cần chuyển trang**.

### 🔐 Hệ thống Quản trị (Admin CMS):
1. **Xác thực truy cập**:
   - Đường dẫn: `/login`
   - Nhập Username và Password -> Chuyển hướng đến Dashboard `/admin`.
   - **Tài khoản mặc định**:
     - **Username**: `admin`
     - **Password**: `admin123`
2. **Các phân hệ quản lý**:
   - **Tổng quan (Dashboard)**: Thống kê số lượng Sản phẩm, Danh mục, Bài viết, Yêu cầu Báo giá, Khiếu nại.
   - **Quản lý Loại sản phẩm (Danh mục)**: Thêm / Sửa / Xóa danh mục, **thiết lập danh mục nào được phép xuất hiện tại slider 3 giây trên trang chủ** (nút bật/tắt 1-click hoặc trong form).
   - **Quản lý Sản phẩm**: Thêm / Sửa / Xóa sản phẩm, cập nhật ảnh (tải ảnh từ máy hoặc URL), giá bán, giá gốc, gắn nhãn **Mới** (`is_new`) hoặc **Khuyến mãi** (`is_promo`), thông số kỹ thuật (specs).
   - **Quản lý Blog**: Tạo mới, chỉnh sửa, xóa bài viết tin tức.
   - **Quản lý Liên hệ**: Tiếp nhận phản hồi từ form liên hệ, **phân loại rõ mục Báo giá hay Khiếu nại bằng badge màu nổi bật**, chuyển đổi trạng thái xử lý (*Mới, Đang xử lý, Đã xử lý*), xem chi tiết nội dung.
   - **Cấu hình Website**: Tùy chỉnh Slogan Hero, thông tin công ty, hotline, email, địa chỉ, link Zalo, FB, Shopee, Google Maps embed.

### 💾 Cơ sở dữ liệu SQL trên máy:
- Hệ quản trị: **SQLite** (file `database.sqlite` nằm ngay tại thư mục dự án).
- Toàn bộ câu lệnh tạo bảng DDL và chú thích được lưu trong file: `schema.sql`.

---

## 🚀 2. Cách Khởi Chạy Dự Án

### Cách 1: Khởi chạy bằng lệnh Terminal
```bash
npm start
```
Hoặc:
```bash
node server.js
```

### Cách 2: Nhấp đúp chuột trên Windows
- Chỉ cần nhấp đúp vào file `run.bat`.

---

## 🔗 3. Các Đường Dẫn Truy Cập Chính

| Trang | Đường dẫn URL | Mô tả |
|---|---|---|
| **Trang chủ (Landing Page)** | `http://localhost:3000/` | Giao diện chính đầy đủ Hero, Slider 3s, 8 SP Mới, 8 SP Khuyến mãi, Giới thiệu, Blog, Form liên hệ, Maps |
| **Danh sách sản phẩm** | `http://localhost:3000/products` | Danh sách toàn bộ sản phẩm có bộ lọc tìm kiếm & Modal popup chi tiết |
| **Đăng nhập Quản trị** | `http://localhost:3000/login` | Cổng đăng nhập (`admin` / `admin123`) |
| **Hệ thống Quản trị CMS** | `http://localhost:3000/admin` | Bảng điều khiển quản lý Danh mục, Sản phẩm, Tin tức, Phản hồi liên hệ, Cài đặt |

---

## 📁 4. Cấu Trúc Thư Mục Dự Án

```
LandingPage/
├── database.sqlite       # Tệp cơ sở dữ liệu quan hệ SQL cục bộ
├── schema.sql            # File định nghĩa cấu trúc bảng SQL tiêu chuẩn
├── db.js                 # Module kết nối SQLite, tạo bảng và nạp dữ liệu mẫu
├── server.js             # Máy chủ Express & toàn bộ hệ thống REST API
├── run.bat               # File khởi chạy nhanh 1-click cho Windows
├── package.json          # Quản lý dependencies (express, sqlite3, multer, cors)
└── public/               # Tài nguyên giao diện tĩnh
    ├── index.html        # Trang chủ Landing Page
    ├── products.html     # Trang danh sách sản phẩm & bộ lọc
    ├── login.html        # Trang đăng nhập quản trị (/login)
    ├── admin.html        # Trang quản trị Admin CMS
    ├── css/
    │   └── style.css     # CSS phong cách Đỏ & Trắng hiện đại
    ├── js/
    │   ├── main.js       # Xử lý sự kiện trang chủ (Slider 3s, 8 SP mới, 8 SP KM, form...)
    │   ├── products.js   # Xử lý bộ lọc sản phẩm & modal popup
    │   └── admin.js      # Xử lý chức năng CMS, CRUD, phân loại Báo giá/Khiếu nại
    └── uploads/          # Thư mục lưu trữ hình ảnh tải lên từ Admin
```

