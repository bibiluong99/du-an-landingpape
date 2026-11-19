const express = require('express');
const { get, run, hashPassword } = require('../../db');
const { sessions, generateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu!' });
    }

    const user = await get('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
    }

    const hashedInput = hashPassword(password);
    if (user.password !== hashedInput) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/auth/me', requireAdmin, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.headers['x-auth-token'];
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Đã đăng xuất thành công!' });
});

// Cập nhật mật khẩu Admin
router.put('/admin/change-password', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới!' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có độ dài ít nhất 6 ký tự!' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại!' });
    }

    const hashedCurrent = hashPassword(currentPassword);
    if (user.password !== hashedCurrent) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác!' });
    }

    const hashedNew = hashPassword(newPassword);
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedNew, req.user.id]);

    res.json({ success: true, message: 'Cập nhật mật khẩu quản trị thành công! Vui lòng ghi nhớ mật khẩu mới.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

