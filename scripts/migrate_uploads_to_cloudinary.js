/**
 * SCRIPT ĐẨY ẢNH BANNER & LOGO TRONG PUBLIC/UPLOADS LÊN CLOUDINARY CDN
 * VÀ CẬP NHẬT LINK TRỰC TIẾP VÀO TURSO CLOUD + FALLBACK JSON
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, isCloudinaryConfigured } = require('../src/config/upload');
const { query, run, fallbackData, saveFallbackData } = require('../db');

async function migrateUploadsToCloudinary() {
  if (!isCloudinaryConfigured()) {
    console.error('❌ Chưa cấu hình Cloudinary trong .env');
    process.exit(1);
  }

  const uploadsPath = path.join(__dirname, '..', 'public', 'uploads');
  const files = fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : [];
  console.log(`🚀 Đang đẩy ${files.length} file trong public/uploads lên Cloudinary CDN...`);

  const urlMap = {};
  for (const f of files) {
    const fullPath = path.join(uploadsPath, f);
    if (!fs.statSync(fullPath).isFile()) continue;
    const cloudUrl = await uploadToCloudinary(fullPath, 'dienviet/banners');
    if (cloudUrl) {
      urlMap[`/uploads/${f}`] = cloudUrl;
      console.log(`✅ Đã chuyển /uploads/${f} ➔ ${cloudUrl}`);
    }
  }

  // Cập nhật các giá trị trong bảng settings (Turso & Fallback JSON)
  for (const [oldPath, newUrl] of Object.entries(urlMap)) {
    await run('UPDATE settings SET value = ? WHERE value = ?', [newUrl, oldPath]);
    (fallbackData.settings || []).forEach(s => {
      if (s.value === oldPath) s.value = newUrl;
    });
  }
  saveFallbackData();

  console.log('🎉 Hoàn tất chuyển toàn bộ ảnh trong public/uploads lên Cloudinary CDN!');
  process.exit(0);
}

migrateUploadsToCloudinary().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});

