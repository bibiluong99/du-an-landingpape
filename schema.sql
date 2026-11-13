-- ========================================================
-- TÀI LIỆU CẤU TRÚC SQL DATABASE - LANDING PAGE & ADMIN CMS
-- Hệ quản trị cơ sở dữ liệu: SQLite / SQL Relational Database
-- ========================================================

-- 1. BẢNG TÀI KHOẢN QUẢN TRỊ (USERS)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(150) DEFAULT 'Quản trị viên',
    role VARCHAR(50) DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG DANH MỤC SẢN PHẨM (CATEGORIES)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE,
    description TEXT,
    image TEXT,
    show_in_slider INTEGER DEFAULT 1, -- 1: Hiển thị ở Slider 3s Trang chủ, 0: Ẩn
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG SẢN PHẨM (PRODUCTS)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    price REAL NOT NULL,               -- Giá bán hiện tại (VNĐ)
    original_price REAL DEFAULT NULL,  -- Giá gốc niêm yết (nếu có khuyến mãi)
    image TEXT,                        -- Link ảnh chính sản phẩm
    short_desc TEXT,                   -- Mô tả ngắn
    description TEXT,                  -- Mô tả chi tiết
    specs TEXT,                        -- Thông số kỹ thuật (JSON hoặc văn bản)
    is_new INTEGER DEFAULT 0,          -- 1: Sản phẩm mới (hiện ở khu vực SP Mới)
    is_promo INTEGER DEFAULT 0,        -- 1: Sản phẩm khuyến mãi (hiện ở khu vực Khuyến mãi)
    stock INTEGER DEFAULT 100,         -- Số lượng tồn kho
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 4. BẢNG TIN TỨC / BÀI VIẾT BLOG (BLOGS)
CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    summary TEXT,
    content TEXT,
    image TEXT,
    author VARCHAR(100) DEFAULT 'Ban Biên Tập',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG LIÊN HỆ & PHẢN HỒI (CONTACTS)
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    type VARCHAR(50) NOT NULL CHECK(type IN ('Báo giá', 'Khiếu nại')), -- Phân loại Báo giá hoặc Khiếu nại
    product_name TEXT,                 -- Tên sản phẩm khách hàng chọn yêu cầu báo giá
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Mới',  -- 'Mới', 'Đang xử lý', 'Đã xử lý'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. BẢNG CẤU HÌNH HỆ THỐNG / THÔNG TIN CÔNG TY (SETTINGS)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT
);

-- Tạo chỉ mục (Indexes) để tăng tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new);
CREATE INDEX IF NOT EXISTS idx_products_is_promo ON products(is_promo);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);

