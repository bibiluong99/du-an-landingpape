const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDB } = require('./db');

const pageRoutes = require('./src/routes/pageRoutes');
const publicApiRoutes = require('./src/routes/publicApi');
const authRoutes = require('./src/routes/authRoutes');
const adminApiRoutes = require('./src/routes/adminApi');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware cơ bản - Tăng giới hạn payload JSON (25MB) để hỗ trợ lưu ảnh Data URL
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Khôi phục URL nguyên bản nếu Vercel rewrite đến /api
app.use((req, res, next) => {
  const originalPath = req.headers['x-invoke-path'] || req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (originalPath && originalPath.startsWith('/api')) {
    const queryStr = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    req.url = originalPath + queryStr;
  }
  next();
});

// Phục vụ thư mục upload file ảnh (hỗ trợ cả thư mục tĩnh và thư mục /tmp trên Vercel)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
if (process.env.VERCEL) {
  app.use('/uploads', express.static(path.join('/tmp', 'uploads')));
}

// 1. Điều hướng các trang HTML (SSR Injection Banner/Logo/Settings) & fallback /uploads/:filename
app.use('/', pageRoutes);

// 2. Phục vụ các file tĩnh trong thư mục public (css, js, images, icons, v.v.)
app.use(express.static(path.join(__dirname, 'public')));

// 3. Hệ thống REST API (Công khai, Xác thực & Quản trị CMS)
app.use('/api', publicApiRoutes);
app.use('/api', authRoutes);
app.use('/api', adminApiRoutes);

// Khởi chạy máy chủ
const startServer = async () => {
  await initDB();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 MÁY CHỦ LANDING PAGE & ADMIN ĐANG CHẠY TẠI:`);
    console.log(`🔗 Trang chủ (Landing Page):    http://localhost:${PORT}`);
    console.log(`🔗 Danh sách sản phẩm:          http://localhost:${PORT}/products`);
    console.log(`🔗 Đăng nhập Quản trị:         http://localhost:${PORT}/login`);
    console.log(`🔗 Bảng điều khiển CMS:        http://localhost:${PORT}/admin`);
    console.log(`💾 Cơ sở dữ liệu SQL lưu tại:  ${path.join(__dirname, 'database.sqlite')}`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Cổng ${PORT} đang bị chiếm dụng. Vui lòng đóng ứng dụng đang chạy trước!`);
    } else {
      console.error('Lỗi máy chủ:', err);
    }
  });
};

// Global error handling middleware - ngăn chặn mọi lỗi làm sập Serverless Function
app.use((err, req, res, next) => {
  console.error('Lỗi xử lý yêu cầu:', err);
  if (!res.headersSent) {
    res.status(500).json({ success: false, message: err.message || 'Lỗi máy chủ nội bộ' });
  }
});

// Khởi chạy máy chủ cục bộ hoặc export cho Vercel Serverless Function
if (process.env.VERCEL) {
  initDB().catch(err => console.error('Lỗi khởi tạo DB trên Vercel:', err));
} else if (require.main === module) {
  startServer();
}

module.exports = app;
