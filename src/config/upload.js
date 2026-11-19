const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
let cloudinary = null;

try {
  require('dotenv').config();
} catch (e) {}

try {
  cloudinary = require('cloudinary').v2;
} catch (e) {}

// Kiểm tra xem Cloudinary đã được cấu hình trong biến môi trường chưa
const isCloudinaryConfigured = () => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  if (
    cloudinary &&
    cloudName &&
    apiKey &&
    apiSecret &&
    cloudName !== 'ten_cloud_cua_ban'
  ) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  }
  return false;
};

// Helper đẩy file từ đường dẫn tạm lên Cloudinary CDN
const uploadToCloudinary = async (filePath, folder = 'dienviet') => {
  if (!isCloudinaryConfigured()) return null;
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }]
    });
    return result && result.secure_url ? result.secure_url : null;
  } catch (err) {
    console.warn('Lưu ý upload Cloudinary:', err.message);
    return null;
  }
};

// Tạo thư mục uploads an toàn (hỗ trợ cả máy chủ cục bộ và môi trường Vercel serverless)
let uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (process.env.VERCEL || isCloudinaryConfigured()) {
  const tmpBase = process.env.TMPDIR || (process.platform === 'win32' ? os.tmpdir() : '/tmp');
  uploadsDir = path.join(tmpBase, 'uploads');
}

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Lưu ý uploadsDir:', err.message);
}

// Cấu hình Multer để upload hình ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'img-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh!'));
    }
  }
});

module.exports = {
  uploadsDir,
  upload,
  isCloudinaryConfigured,
  uploadToCloudinary
};
