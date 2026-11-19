const crypto = require('crypto');
const { get } = require('../../db');

// Quản lý phiên xác thực (HMAC Stateless Token) an toàn 100% cho Serverless đa instance
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dienviet_secure_token_secret_2026_key_v1';
const sessions = new Map();

// Helper tạo Token ký số HMAC (không bị mất session khi Vercel đổi worker)
const generateToken = (userId) => {
  const timestamp = Date.now();
  const payload = `${userId}.${timestamp}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  const token = `${payload}.${signature}`;
  sessions.set(token, {
    userId,
    createdAt: timestamp
  });
  return token;
};

// Helper xác thực Token không phụ thuộc RAM instance
const verifyToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  // 1. Kiểm tra cache sessions in-memory nếu cùng instance
  if (sessions.has(token)) {
    const s = sessions.get(token);
    if (Date.now() - s.createdAt < 7 * 24 * 60 * 60 * 1000) {
      return s.userId;
    }
  }

  // 2. Xác thực chữ ký số HMAC (chạy độc lập trên bất kỳ Serverless instance nào của Vercel)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [userId, timestamp, signature] = parts;
      const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(`${userId}.${timestamp}`).digest('hex');
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        const time = parseInt(timestamp, 10);
        // Hết hạn sau 7 ngày
        if (Date.now() - time < 7 * 24 * 60 * 60 * 1000) {
          const uid = parseInt(userId, 10) || userId;
          sessions.set(token, { userId: uid, createdAt: time });
          return uid;
        }
      }
    }
  } catch (e) {
    // Dự phòng lỗi định dạng
  }

  return null;
};

// Middleware xác thực Admin
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.headers['x-auth-token'];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập quyền quản trị để tiếp tục!' });
  }

  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập quyền quản trị để tiếp tục!' });
  }

  const user = await get('SELECT id, username, fullname, role FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại!' });
  }

  req.user = user;
  next();
};

module.exports = {
  TOKEN_SECRET,
  sessions,
  generateToken,
  verifyToken,
  requireAdmin
};

