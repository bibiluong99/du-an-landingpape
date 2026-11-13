const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const { query, get, run, hashPassword, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware cơ bản
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Chuẩn hóa req.url trên môi trường Vercel Serverless Function
app.use((req, res, next) => {
  if (process.env.VERCEL && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Endpoint kiểm tra trạng thái API
app.get(['/api', '/api/'], (req, res) => {
  res.json({ success: true, message: 'Điện Việt API đang chạy bình thường trên Vercel' });
});

const os = require('os');

// Tạo thư mục uploads an toàn (hỗ trợ cả máy chủ cục bộ và môi trường Vercel serverless)
let uploadsDir = path.join(__dirname, 'public', 'uploads');
if (process.env.VERCEL) {
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

// Phục vụ thư mục upload file ảnh (hỗ trợ cả thư mục tĩnh và thư mục /tmp trên Vercel)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
if (process.env.VERCEL) {
  app.use('/uploads', express.static(path.join('/tmp', 'uploads')));
}

// Quản lý phiên xác thực (Tokens Store)
const sessions = new Map();

// Helper tạo Token
const generateToken = (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId,
    createdAt: Date.now()
  });
  return token;
};

// Middleware xác thực Admin
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.headers['x-auth-token'];

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập quyền quản trị để tiếp tục!' });
  }

  const session = sessions.get(token);
  // Hết hạn sau 7 ngày
  if (Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!' });
  }

  const user = await get('SELECT id, username, fullname, role FROM users WHERE id = ?', [session.userId]);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại!' });
  }

  req.user = user;
  next();
};

// ==========================================
// ĐIỀU HƯỚNG TRANG WEB (HTML PAGES ROUTING)
// ==========================================

// Helper phục vụ trang HTML kèm theo Banner & Logo mới nhất trực tiếp từ cơ sở dữ liệu
async function servePageWithBanner(res, fileName, bannerKey, bannerId) {
  try {
    let filePath = path.join(__dirname, 'public', fileName);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public', fileName);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), fileName);
    }

    if (!fs.existsSync(filePath)) {
      // Trên môi trường Serverless nếu public/ không nằm trong Lambda bundle, chuyển hướng về URL tĩnh
      return res.redirect(`/${fileName}`);
    }

    let html = fs.readFileSync(filePath, 'utf8');

    // 1. Lấy banner mới nhất từ database
    if (bannerKey && bannerId) {
      const bannerSetting = await get('SELECT value FROM settings WHERE key = ?', [bannerKey]);
      if (bannerSetting && bannerSetting.value) {
        const val = bannerSetting.value;
        const regex1 = new RegExp(`id=["']${bannerId}["']([\\s\\S]*?)src=["'][^"']*["']`, 'i');
        const regex2 = new RegExp(`src=["'][^"']*["']([\\s\\S]*?)id=["']${bannerId}["']`, 'i');
        
        if (regex1.test(html)) {
          html = html.replace(regex1, `id="${bannerId}"$1src="${val}"`);
        } else if (regex2.test(html)) {
          html = html.replace(regex2, `src="${val}"$1id="${bannerId}"`);
        }
      }
    }

    // 2. Lấy logo mới nhất từ database và inject trực tiếp vào HTML (Header & Footer)
    const logoSetting = await get('SELECT value FROM settings WHERE key = ?', ['logo_url']);
    if (logoSetting && logoSetting.value && logoSetting.value.trim()) {
      const logoUrl = logoSetting.value.trim();

      // Header: Ẩn site-logo-icon, hiện site-logo-img với src mới nhất
      html = html.replace(/(class=["'][^"']*site-logo-icon)([^"']*["'])/g, (m, p1, p2) => {
        return p1.includes('hidden') ? m : p1 + ' hidden' + p2;
      });
      html = html.replace(/(<img[^>]*class=["'][^"']*site-logo-img[^"']*["'][^>]*)/g, (imgTag) => {
        let updated = imgTag.replace(/\bhidden\b\s*/g, '');
        if (/src=["'][^"']*["']/.test(updated)) {
          updated = updated.replace(/src=["'][^"']*["']/, `src="${logoUrl}"`);
        } else {
          updated = updated.replace('<img', `<img src="${logoUrl}"`);
        }
        return updated;
      });

      // Footer: Ẩn footer-logo-icon, hiện footer-logo-img với src mới nhất
      html = html.replace(/(class=["'][^"']*footer-logo-icon)([^"']*["'])/g, (m, p1, p2) => {
        return p1.includes('hidden') ? m : p1 + ' hidden' + p2;
      });
      html = html.replace(/(<img[^>]*class=["'][^"']*footer-logo-img[^"']*["'][^>]*)/g, (imgTag) => {
        let updated = imgTag.replace(/\bhidden\b\s*/g, '');
        if (/src=["'][^"']*["']/.test(updated)) {
          updated = updated.replace(/src=["'][^"']*["']/, `src="${logoUrl}"`);
        } else {
          updated = updated.replace('<img', `<img src="${logoUrl}"`);
        }
        return updated;
      });
    }

    // 3. Lấy Tên thương hiệu & Slogan mới nhất từ database và inject trực tiếp vào HTML
    const nameSetting = await get('SELECT value FROM settings WHERE key = ?', ['company_name']);
    const sloganSetting = await get('SELECT value FROM settings WHERE key = ?', ['company_slogan']);

    if (nameSetting && nameSetting.value && nameSetting.value.trim()) {
      const name = nameSetting.value.trim();
      const words = name.split(/\s+/);
      let headerNameHtml = name;
      let footerNameHtml = name;
      if (words.length > 1) {
        const last = words.slice(-1)[0];
        const rest = words.slice(0, -1).join(' ');
        headerNameHtml = `${rest} <span class="text-[#c8102e]">${last}</span>`;
        footerNameHtml = `${rest} <span class="text-red-200">${last}</span>`;
      }
      
      html = html.replace(
        /(<div[^>]*id=["']company-name-header["'][^>]*>)([\s\S]*?)(<\/div>)/i,
        `$1${headerNameHtml}$3`
      );
      html = html.replace(
        /(<span[^>]*class=["'][^"']*site-footer-company-name[^"']*["'][^>]*>)([\s\S]*?)(<\/span>)/i,
        `$1${footerNameHtml}$3`
      );
    }

    if (sloganSetting && sloganSetting.value && sloganSetting.value.trim()) {
      const slogan = sloganSetting.value.trim();
      html = html.replace(
        /(<span[^>]*id=["']company-slogan-header["'][^>]*>)([\s\S]*?)(<\/span>)/i,
        `$1${slogan}$3`
      );
      html = html.replace(
        /(<span[^>]*class=["'][^"']*site-footer-slogan[^"']*["'][^>]*>)([\s\S]*?)(<\/span>)/i,
        `$1${slogan}$3`
      );
    }

    // 4. Lấy Nội dung Giới thiệu (Về chúng tôi) mới nhất từ database và inject trực tiếp
    const aboutTitleSetting = await get('SELECT value FROM settings WHERE key = ?', ['about_title']);
    const aboutHistorySetting = await get('SELECT value FROM settings WHERE key = ?', ['about_history']);

    if (aboutTitleSetting && aboutTitleSetting.value && aboutTitleSetting.value.trim()) {
      const aTitle = aboutTitleSetting.value.trim();
      html = html.replace(
        /(<h[2-4][^>]*id=["']about-title["'][^>]*>)([\s\S]*?)(<\/h[2-4]>)/i,
        `$1${aTitle}$3`
      );
      html = html.replace(
        /(<h[2-4][^>]*id=["']about-us-title["'][^>]*>)([\s\S]*?)(<\/h[2-4]>)/i,
        `$1${aTitle}$3`
      );
    }

    if (aboutHistorySetting && aboutHistorySetting.value && aboutHistorySetting.value.trim()) {
      let aHistory = aboutHistorySetting.value.trim();
      if (aHistory.includes('<style') && !aHistory.includes('</style>')) {
        aHistory += '\n</style>';
      }

      const isRichHtml = /<div\b|<article\b|<section\b|<style\b|company-intro-card/i.test(aHistory);

      if (isRichHtml && fileName === 'about.html') {
        html = html.replace(/id=["']about-us-col-right["']\s+class=["'][^"']*["']/i, 'id="about-us-col-right" class="hidden"');
        html = html.replace(/id=["']about-us-col-left["']\s+class=["'][^"']*["']/i, 'id="about-us-col-left" class="w-full"');
        html = html.replace(/id=["']about-us-grid["']\s+class=["'][^"']*["']/i, 'id="about-us-grid" class="w-full"');
        if (/<h[1-3]\b|class=["'][^"']*company-title[^"']*["']/i.test(aHistory)) {
          html = html.replace(/id=["']about-us-title["']\s+class=["'][^"']*["']/i, 'id="about-us-title" class="hidden"');
        }
      }

      if (isRichHtml && fileName === 'index.html') {
        const cleanHtml = aHistory.replace(/<style\b[^>]*>[\s\S]*?(<\/style>|$)/gi, '');
        const pMatches = cleanHtml.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi);
        let summary = '';
        if (pMatches && pMatches.length > 0) {
          summary = pMatches.slice(0, 3).map(p => p.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join('\n\n');
        } else {
          summary = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        html = html.replace(
          /(<p[^>]*id=["']about-history["'][^>]*>)([\s\S]*?)(<\/p>)/i,
          (match, p1, p2, p3) => `${p1}${summary}${p3}`
        );
      } else {
        html = html.replace(
          /(<(?:p|div)[^>]*id=["']about-history["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
          (match, p1, p2, p3) => `${p1}${aHistory}${p3}`
        );
      }

      html = html.replace(
        /(<(?:p|div)[^>]*id=["']about-us-desc["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
        (match, p1, p2, p3) => `${p1}${aHistory}${p3}`
      );
    }

    const aboutWhySetting = await get('SELECT value FROM settings WHERE key = ?', ['about_why_choose']);
    if (aboutWhySetting && aboutWhySetting.value && aboutWhySetting.value.trim()) {
      const aWhy = aboutWhySetting.value.trim();
      html = html.replace(
        /(<(?:p|div)[^>]*id=["']about-why-desc["'][^>]*class=["'][^"']*?)\bhidden\b([^"']*["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
        (match, p1, p2, p3, p4) => `${p1}${p2}>${aWhy}${p4}`
      );
    }

    const aboutValuesSetting = await get('SELECT value FROM settings WHERE key = ?', ['about_values']);
    if (aboutValuesSetting && aboutValuesSetting.value && aboutValuesSetting.value.trim()) {
      const aVal = aboutValuesSetting.value.trim();
      html = html.replace(
        /(<(?:p|div)[^>]*id=["']about-values-desc["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
        (match, p1, p2, p3) => `${p1}${aVal}${p3}`
      );
    }

    // 5. Inject Danh sách Loại Báo Giá / Liên Hệ vào trang contact.html & index.html
    if (fileName === 'contact.html') {
      const quoteTypesSetting = await get('SELECT value FROM settings WHERE key = ?', ['quote_types']);
      if (quoteTypesSetting && quoteTypesSetting.value) {
        try {
          const list = JSON.parse(quoteTypesSetting.value);
          if (Array.isArray(list) && list.length > 0) {
            let optionsHtml = '<option value="" selected>-- Chọn loại --</option>\n';
            list.forEach((item) => {
              const name = typeof item === 'string' ? item : item.name;
              const showProducts = typeof item === 'object' && item.show_products ? 'true' : 'false';
              optionsHtml += `                  <option value="${name}" data-show-products="${showProducts}">${name}</option>\n`;
            });
            html = html.replace(
              /(<select[^>]*id=["']form-type["'][^>]*>)([\s\S]*?)(<\/select>)/i,
              (match, p1, p2, p3) => `${p1}\n${optionsHtml}                ${p3}`
            );
          }
        } catch (e) {}
      }
    }

    if (fileName === 'index.html') {
      const quoteTypesSetting = await get('SELECT value FROM settings WHERE key = ?', ['quote_types']);
      if (quoteTypesSetting && quoteTypesSetting.value) {
        try {
          const list = JSON.parse(quoteTypesSetting.value);
          if (Array.isArray(list) && list.length > 0) {
            const radiosHtml = list.map((item, idx) => {
              const name = typeof item === 'string' ? item : item.name;
              const show = typeof item === 'object' && item.show_products ? 'true' : 'false';
              return `<label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-xs sm:text-sm text-slate-700"><input type="radio" name="contact-type" value="${name}" data-show-products="${show}" ${idx === 0 ? 'checked' : ''} class="text-[#c8102e] focus:ring-[#c8102e] w-4 h-4"><span>${name}</span></label>`;
            }).join('\n            ');
            html = html.replace(
              /(<div[^>]*id=["']contact-modal-type-group["'][^>]*>)([\s\S]*?)(<\/div>)/i,
              (match, p1, p2, p3) => `${p1}\n            ${radiosHtml}\n          ${p3}`
            );
          }
        } catch (e) {}
      }
    }

    // Luôn gắn query version chống cache cho các file js
    const v = Date.now();
    html = html.replace(/\/js\/main\.js(\?v=[^"']*)?/g, `/js/main.js?v=${v}`);
    html = html.replace(/\/js\/products\.js(\?v=[^"']*)?/g, `/js/products.js?v=${v}`);
    html = html.replace(/\/js\/product-detail\.js(\?v=[^"']*)?/g, `/js/product-detail.js?v=${v}`);
    html = html.replace(/\/js\/blogs\.js(\?v=[^"']*)?/g, `/js/blogs.js?v=${v}`);
    html = html.replace(/\/js\/blog-detail\.js(\?v=[^"']*)?/g, `/js/blog-detail.js?v=${v}`);
    html = html.replace(/\/js\/contact\.js(\?v=[^"']*)?/g, `/js/contact.js?v=${v}`);
    html = html.replace(/\/js\/admin\.js(\?v=[^"']*)?/g, `/js/admin.js?v=${v}`);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(html);
  } catch (err) {
    console.warn('Lưu ý render trang:', err.message);
    try {
      res.sendFile(path.join(__dirname, 'public', fileName));
    } catch (e) {
      res.redirect(`/${fileName}`);
    }
  }
}

app.get(['/', '/index', '/index.html'], (req, res) => {
  servePageWithBanner(res, 'index.html', 'banner_home', 'page-banner-home');
});

app.get(['/products', '/products.html'], (req, res) => {
  servePageWithBanner(res, 'products.html', 'banner_products', 'page-banner-products');
});

app.get(['/product-detail', '/product-detail.html'], (req, res) => {
  servePageWithBanner(res, 'product-detail.html', null, null);
});

app.get(['/about', '/about.html'], (req, res) => {
  servePageWithBanner(res, 'about.html', 'banner_about', 'page-banner-about');
});

app.get(['/blogs', '/blogs.html'], (req, res) => {
  servePageWithBanner(res, 'blogs.html', 'banner_blogs', 'page-banner-blogs');
});

app.get(['/blog-detail', '/blog-detail.html'], (req, res) => {
  servePageWithBanner(res, 'blog-detail.html', null, null);
});

app.get(['/contact', '/contact.html', '/contact/'], (req, res) => {
  servePageWithBanner(res, 'contact.html', 'banner_contact', 'page-banner-contact');
});

app.get(['/huong-dan-bao-gia', '/huong-dan-bao-gia.html', '/huong-dan-bao-gia/'], (req, res) => {
  servePageWithBanner(res, 'huong-dan-bao-gia.html', null, null);
});

app.get(['/dieu-khoan-su-dung', '/dieu-khoan-su-dung.html', '/dieu-khoan-su-dung/'], (req, res) => {
  servePageWithBanner(res, 'dieu-khoan-su-dung.html', null, null);
});

app.get(['/chinh-sach-bao-hanh', '/chinh-sach-bao-hanh.html', '/chinh-sach-bao-hanh/', '/chinh-sach-bao-hang', '/chinh-sach-bao-hang.html'], (req, res) => {
  servePageWithBanner(res, 'chinh-sach-bao-hanh.html', null, null);
});

app.get(['/chinh-sach-bao-mat', '/chinh-sach-bao-mat.html', '/chinh-sach-bao-mat/'], (req, res) => {
  servePageWithBanner(res, 'chinh-sach-bao-mat.html', null, null);
});

app.get(['/login', '/login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get(['/admin', '/admin.html'], (req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'admin.html');
    let html = fs.readFileSync(filePath, 'utf8');
    const v = Date.now();
    html = html.replace(/\/js\/admin\.js(\?v=[^"']*)?/g, `/js/admin.js?v=${v}`);
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(html);
  } catch (err) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  }
});

// Phục vụ các file tĩnh trong thư mục public (css, js, images, icons, v.v.)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CÁC API CÔNG KHAI (PUBLIC APIS)
// ==========================================

// 1. Cài đặt hệ thống & thông tin công ty
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await query('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1.1 Danh sách Loại Báo Giá / Liên Hệ
app.get('/api/quote-types', async (req, res) => {
  try {
    const row = await get('SELECT value FROM settings WHERE key = ?', ['quote_types']);
    let list = [];
    if (row && row.value) {
      try { list = JSON.parse(row.value); } catch(e) {}
    }
    if (!Array.isArray(list) || list.length === 0) {
      list = [
        { name: 'Báo giá sản phẩm', show_products: true },
        { name: 'Tư vấn kỹ thuật', show_products: false },
        { name: 'Hỗ trợ bảo hành / Đổi trả', show_products: false },
        { name: 'Hợp tác đại lý / Dự án', show_products: true },
        { name: 'Góp ý / Khiếu nại', show_products: false }
      ];
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Danh mục sản phẩm (Chỉ hiển thị các danh mục đang BẬT: show_in_slider = 1 và cha cũng bật)
app.get('/api/categories', async (req, res) => {
  try {
    let sql = `
      SELECT c.*, (
        SELECT COUNT(*) 
        FROM products p 
        WHERE p.category_id = c.id
           OR (c.parent_id IS NULL AND p.category_id IN (SELECT id FROM categories WHERE parent_id = c.id))
      ) as product_count
      FROM categories c
      LEFT JOIN categories p_cat ON c.parent_id = p_cat.id
      WHERE (c.show_in_slider = 1 OR c.show_in_slider IS NULL)
        AND (c.parent_id IS NULL OR (p_cat.show_in_slider = 1 OR p_cat.show_in_slider IS NULL))
    `;
    const params = [];
    const conditions = [];

    if (req.query.parent_only === 'true' || req.query.parents_only === 'true' || req.query.only_parents === 'true') {
      conditions.push('c.parent_id IS NULL');
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY COALESCE(c.parent_id, c.id) ASC, (CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END) ASC, c.sort_order ASC, c.id ASC';
    const categories = await query(sql, params);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Danh sách sản phẩm (Chỉ nạp sản phẩm thuộc các danh mục đang BẬT)
app.get('/api/products', async (req, res) => {
  try {
    const { type, category_id, search, sort, limit = 50, page = 1 } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories p_cat ON c.parent_id = p_cat.id
      WHERE (
        p.category_id IS NULL 
        OR (
          (c.show_in_slider = 1 OR c.show_in_slider IS NULL)
          AND (c.parent_id IS NULL OR (p_cat.show_in_slider = 1 OR p_cat.show_in_slider IS NULL))
        )
      )
    `;
    const params = [];

    if (type === 'new') {
      sql += ' AND p.is_new = 1 ORDER BY p.id DESC LIMIT 8';
      const products = await query(sql, params);
      return res.json({ success: true, data: products });
    }

    if (type === 'promo' || type === 'bestseller') {
      sql += ' AND p.is_promo = 1 ORDER BY p.id ASC LIMIT 8';
      const products = await query(sql, params);
      return res.json({ success: true, data: products });
    }

    if (category_id && category_id !== 'all') {
      sql += ` AND (
        p.category_id = ? 
        OR p.category_id IN (
          SELECT id FROM categories 
          WHERE parent_id = ? AND (show_in_slider = 1 OR show_in_slider IS NULL)
        )
      )`;
      params.push(category_id, category_id);
    }

    if (search && search.trim() !== '') {
      const s = search.trim();
      sql += ' AND (p.name LIKE ? OR p.short_desc LIKE ? OR LOWER(p.name) LIKE ? OR LOWER(p.short_desc) LIKE ?)';
      params.push(`%${s}%`, `%${s}%`, `%${s.toLowerCase()}%`, `%${s.toLowerCase()}%`);
    }

    // Sắp xếp
    if (sort === 'price_asc') {
      sql += ' ORDER BY p.price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY p.price DESC';
    } else {
      sql += ' ORDER BY p.id DESC';
    }

    // Phân trang
    const numLimit = parseInt(limit) || 50;
    const offset = (parseInt(page) - 1) * numLimit;
    sql += ` LIMIT ${numLimit} OFFSET ${offset}`;

    const products = await query(sql, params);

    // Đếm tổng số lượng (áp dụng cùng điều kiện lọc danh mục BẬT)
    let countSql = `
      SELECT COUNT(*) as total 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories p_cat ON c.parent_id = p_cat.id
      WHERE (
        p.category_id IS NULL 
        OR (
          (c.show_in_slider = 1 OR c.show_in_slider IS NULL)
          AND (c.parent_id IS NULL OR (p_cat.show_in_slider = 1 OR p_cat.show_in_slider IS NULL))
        )
      )
    `;
    const countParams = [];
    if (category_id && category_id !== 'all') {
      countSql += ` AND (
        p.category_id = ? 
        OR p.category_id IN (
          SELECT id FROM categories 
          WHERE parent_id = ? AND (show_in_slider = 1 OR show_in_slider IS NULL)
        )
      )`;
      countParams.push(category_id, category_id);
    }
    if (search && search.trim() !== '') {
      const s = search.trim();
      countSql += ' AND (p.name LIKE ? OR p.short_desc LIKE ? OR LOWER(p.name) LIKE ? OR LOWER(p.short_desc) LIKE ?)';
      countParams.push(`%${s}%`, `%${s}%`, `%${s.toLowerCase()}%`, `%${s.toLowerCase()}%`);
    }
    const totalRow = await get(countSql, countParams);

    res.json({
      success: true,
      data: products,
      pagination: {
        total: totalRow.total,
        page: parseInt(page),
        limit: numLimit,
        totalPages: Math.ceil(totalRow.total / numLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Chi tiết 1 sản phẩm
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await get(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Danh sách bài viết Blog
app.get('/api/blogs', async (req, res) => {
  try {
    const { all, limit, search, category } = req.query;
    let sql = 'SELECT * FROM blogs WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim() !== '') {
      sql += ' AND (title LIKE ? OR summary LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY created_at DESC, id DESC';

    if (all !== '1' && !limit) {
      sql += ' LIMIT 6';
    } else if (limit) {
      sql += ` LIMIT ${parseInt(limit) || 50}`;
    }

    const blogs = await query(sql, params);
    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Chi tiết 1 bài viết Blog
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await get('SELECT * FROM blogs WHERE id = ?', [req.params.id]);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết!' });
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Gửi thông tin Form liên hệ
app.post('/api/contacts', async (req, res) => {
  try {
    const { fullname, phone, email, type, product_name, message } = req.body;

    if (!fullname || !phone || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Họ tên, Số điện thoại, Email và Nội dung lời nhắn!'
      });
    }

    const contactType = type && type.trim() !== '' ? type.trim() : 'Báo giá sản phẩm';

    const result = await run(
      'INSERT INTO contacts (fullname, phone, email, type, product_name, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fullname.trim(), phone.trim(), (email || '').trim(), contactType, (product_name || '').trim(), message.trim(), 'Mới']
    );

    res.json({
      success: true,
      message: 'Cảm ơn quý khách đã gửi thông tin! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
      id: result.lastID
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// XÁC THỰC ADMIN CMS (AUTHENTICATION)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
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

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ success: true, user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.headers['x-auth-token'];
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Đã đăng xuất thành công!' });
});

// Cập nhật mật khẩu Admin
app.put('/api/admin/change-password', requireAdmin, async (req, res) => {
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

// ==========================================
// CÁC API QUẢN TRỊ ADMIN (PROTECTED CMS APIS)
// ==========================================

// Upload ảnh đơn
app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Chưa có file ảnh nào được tải lên!' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// Upload nhiều ảnh cùng lúc cho sản phẩm
app.post('/api/admin/upload-multiple', requireAdmin, upload.array('images', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Chưa có file ảnh nào được tải lên!' });
  }
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ success: true, urls });
});

// Thư viện ảnh hệ thống (Uploads & Images)
app.get('/api/admin/media-library', requireAdmin, async (req, res) => {
  try {
    const list = [];
    if (fs.existsSync(uploadsDir)) {
      const uploadFiles = await fs.promises.readdir(uploadsDir);
      for (const f of uploadFiles) {
        if (/\.(jpg|jpeg|png|webp|svg|gif)$/i.test(f)) {
          list.push({ url: `/uploads/${f}`, name: f, folder: 'Ảnh tải lên (Uploads)' });
        }
      }
    }
    const imagesDir = path.join(__dirname, 'public', 'images');
    if (fs.existsSync(imagesDir)) {
      const imgFiles = await fs.promises.readdir(imagesDir);
      for (const f of imgFiles) {
        if (/\.(jpg|jpeg|png|webp|svg|gif)$/i.test(f)) {
          list.push({ url: `/images/${f}`, name: f, folder: 'Ảnh hệ thống (Images)' });
        }
      }
    }
    res.json({ success: true, data: list.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1. Dashboard Thống kê tổng quan
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const productCount = await get('SELECT COUNT(*) as total FROM products');
    // Chỉ đếm số lượng danh mục cha (parent_id IS NULL hoặc parent_id = 0 hoặc rỗng)
    const categoryCount = await get('SELECT COUNT(*) as total FROM categories WHERE parent_id IS NULL OR parent_id = 0 OR parent_id = ""');
    const blogCount = await get('SELECT COUNT(*) as total FROM blogs');
    const contactCount = await get('SELECT COUNT(*) as total FROM contacts');
    const newContactCount = await get("SELECT COUNT(*) as total FROM contacts WHERE status = 'Mới'");

    // Phân loại chính xác Báo giá và Khiếu nại từ toàn bộ liên hệ
    const allContactsForStats = await query('SELECT type FROM contacts');
    let quoteContacts = 0;
    let complaintContacts = 0;

    if (Array.isArray(allContactsForStats)) {
      allContactsForStats.forEach(c => {
        const t = (c.type || '').toLowerCase();
        if (t.includes('báo giá') || t.includes('bao gia')) {
          quoteContacts++;
        } else if (t.includes('khiếu nại') || t.includes('khieu nai') || t.includes('góp ý') || t.includes('gop y')) {
          complaintContacts++;
        }
      });
    }

    const recentContacts = await query('SELECT * FROM contacts ORDER BY id DESC LIMIT 5');

    res.json({
      success: true,
      stats: {
        totalProducts: productCount?.total || 0,
        totalCategories: categoryCount?.total || 0,
        totalBlogs: blogCount?.total || 0,
        totalContacts: contactCount?.total || 0,
        quoteContacts,
        complaintContacts,
        newContacts: newContactCount?.total || 0
      },
      recentContacts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Quản lý Danh mục (Categories)
app.get('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await query(`
      SELECT c.*, p_cat.name as parent_name,
             (
               SELECT COUNT(*) FROM products p 
               WHERE p.category_id = c.id 
                  OR (c.parent_id IS NULL AND p.category_id IN (SELECT id FROM categories WHERE parent_id = c.id))
             ) as product_count
      FROM categories c
      LEFT JOIN categories p_cat ON c.parent_id = p_cat.id
      ORDER BY COALESCE(c.parent_id, c.id) ASC, (CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END) ASC, c.sort_order ASC, c.id ASC
    `);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const { name, description, image, show_in_slider, sort_order, parent_id } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống!' });
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);

    const parsedParentId = parent_id && parent_id !== '' && parseInt(parent_id) > 0 ? parseInt(parent_id) : null;

    const result = await run(
      'INSERT INTO categories (name, slug, description, image, show_in_slider, sort_order, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, slug, description || '', image || '', show_in_slider ? 1 : 0, sort_order || 0, parsedParentId]
    );

    res.json({ success: true, message: 'Thêm danh mục mới thành công!', id: result.lastID });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, image, show_in_slider, sort_order, parent_id } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống!' });
    }

    const parsedParentId = parent_id && parent_id !== '' && parseInt(parent_id) > 0 ? parseInt(parent_id) : null;

    if (parsedParentId && String(parsedParentId) === String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Danh mục cha không thể là chính danh mục này!' });
    }

    await run(
      'UPDATE categories SET name = ?, description = ?, image = ?, show_in_slider = ?, sort_order = ?, parent_id = ? WHERE id = ?',
      [name, description, image, show_in_slider ? 1 : 0, sort_order || 0, parsedParentId, req.params.id]
    );

    res.json({ success: true, message: 'Cập nhật danh mục thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/admin/categories/:id/toggle-slider', requireAdmin, async (req, res) => {
  try {
    const cat = await get('SELECT show_in_slider FROM categories WHERE id = ?', [req.params.id]);
    if (!cat) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục!' });
    }

    const newValue = cat.show_in_slider === 1 ? 0 : 1;
    await run('UPDATE categories SET show_in_slider = ? WHERE id = ?', [newValue, req.params.id]);

    res.json({
      success: true,
      message: `Đã ${newValue === 1 ? 'bật' : 'tắt'} hiển thị ở Slider trang chủ!`,
      show_in_slider: newValue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    await run('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [req.params.id]);
    await run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa danh mục thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Quản lý Sản phẩm (Products)
app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const products = await query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const {
      category_id,
      name,
      price,
      original_price,
      image,
      images,
      short_desc,
      description,
      specs,
      applications,
      warranty_policy,
      is_new,
      is_promo
    } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm và Giá bán là bắt buộc!' });
    }

    // Xử lý danh sách nhiều ảnh
    let imagesArr = [];
    if (images) {
      if (Array.isArray(images)) imagesArr = images;
      else if (typeof images === 'string') {
        try { imagesArr = JSON.parse(images); } catch (e) { if (images.trim()) imagesArr = [images.trim()]; }
      }
    }
    let mainImage = image || (imagesArr.length > 0 ? imagesArr[0] : '');
    if (mainImage && !imagesArr.includes(mainImage)) {
      imagesArr.unshift(mainImage);
    }
    const imagesJson = imagesArr.length > 0 ? JSON.stringify(imagesArr) : null;

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);

    const result = await run(`
      INSERT INTO products (
        category_id, name, slug, price, original_price, image, images,
        short_desc, description, specs, applications, warranty_policy, is_new, is_promo, stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `, [
      category_id || null,
      name,
      slug,
      parseFloat(price),
      original_price ? parseFloat(original_price) : null,
      mainImage || '',
      imagesJson,
      short_desc || '',
      description || '',
      typeof specs === 'object' ? JSON.stringify(specs) : (specs || ''),
      applications || '',
      warranty_policy || '',
      is_new ? 1 : 0,
      is_promo ? 1 : 0
    ]);

    res.json({ success: true, message: 'Thêm sản phẩm mới thành công!', id: result.lastID });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const {
      category_id,
      name,
      price,
      original_price,
      image,
      images,
      short_desc,
      description,
      specs,
      applications,
      warranty_policy,
      is_new,
      is_promo
    } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm và Giá bán là bắt buộc!' });
    }

    // Xử lý danh sách nhiều ảnh
    let imagesArr = [];
    if (images) {
      if (Array.isArray(images)) imagesArr = images;
      else if (typeof images === 'string') {
        try { imagesArr = JSON.parse(images); } catch (e) { if (images.trim()) imagesArr = [images.trim()]; }
      }
    }
    let mainImage = image || (imagesArr.length > 0 ? imagesArr[0] : '');
    if (mainImage && !imagesArr.includes(mainImage)) {
      imagesArr.unshift(mainImage);
    }
    const imagesJson = imagesArr.length > 0 ? JSON.stringify(imagesArr) : null;

    await run(`
      UPDATE products SET
        category_id = ?,
        name = ?,
        price = ?,
        original_price = ?,
        image = ?,
        images = ?,
        short_desc = ?,
        description = ?,
        specs = ?,
        applications = ?,
        warranty_policy = ?,
        is_new = ?,
        is_promo = ?,
        stock = NULL
      WHERE id = ?
    `, [
      category_id || null,
      name,
      parseFloat(price),
      original_price ? parseFloat(original_price) : null,
      mainImage || '',
      imagesJson,
      short_desc || '',
      description || '',
      typeof specs === 'object' ? JSON.stringify(specs) : (specs || ''),
      applications || '',
      warranty_policy || '',
      is_new ? 1 : 0,
      is_promo ? 1 : 0,
      req.params.id
    ]);

    res.json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/admin/products/:id/toggle-promo', requireAdmin, async (req, res) => {
  try {
    const prod = await get('SELECT is_promo FROM products WHERE id = ?', [req.params.id]);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
    }
    const newValue = prod.is_promo === 1 ? 0 : 1;
    await run('UPDATE products SET is_promo = ? WHERE id = ?', [newValue, req.params.id]);
    res.json({
      success: true,
      message: `Đã ${newValue === 1 ? 'bật' : 'tắt'} trạng thái Hot cho sản phẩm!`,
      is_promo: newValue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa sản phẩm thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Điều chỉnh giá sản phẩm hàng loạt (Tăng / Giảm theo % hoặc số tiền cố định)
app.post('/api/admin/products/batch-adjust-price', requireAdmin, async (req, res) => {
  try {
    const { scope, category_id, action, type, value, roundTo = 0, product_ids } = req.body;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return res.status(400).json({ success: false, message: 'Giá trị điều chỉnh phải lớn hơn 0!' });
    }

    if (!['increase', 'decrease'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Hành động điều chỉnh không hợp lệ!' });
    }

    if (!['percent', 'fixed'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Hình thức tính giá không hợp lệ!' });
    }

    if (type === 'percent' && numValue > 100) {
      return res.status(400).json({ success: false, message: 'Mức điều chỉnh theo phần trăm tối đa là 100%!' });
    }

    // Lấy danh sách sản phẩm theo danh sách ID đã chọn hoặc theo danh mục
    let selectSql = '';
    const params = [];

    if (Array.isArray(product_ids)) {
      const cleanIds = product_ids.map(Number).filter(id => !isNaN(id) && id > 0);
      if (cleanIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 sản phẩm để cập nhật giá!' });
      }
      const placeholders = cleanIds.map(() => '?').join(',');
      selectSql = `SELECT id, price FROM products WHERE id IN (${placeholders})`;
      params.push(...cleanIds);
    } else if (scope === 'category' && category_id && category_id !== 'all') {
      selectSql = 'SELECT id, price FROM products WHERE (category_id = ? OR category_id IN (SELECT id FROM categories WHERE parent_id = ?))';
      params.push(category_id, category_id);
    } else if (scope === 'all') {
      selectSql = 'SELECT id, price FROM products';
    } else {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 sản phẩm để cập nhật giá!' });
    }

    const products = await query(selectSql, params);
    if (!products || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy sản phẩm nào được chọn để cập nhật giá!' });
    }

    let updatedCount = 0;
    for (const p of products) {
      const currentPrice = parseFloat(p.price) || 0;
      let delta = 0;
      if (type === 'percent') {
        delta = currentPrice * (numValue / 100);
      } else {
        delta = numValue;
      }

      let newPrice = action === 'increase' ? (currentPrice + delta) : (currentPrice - delta);
      if (newPrice < 0) newPrice = 0;

      // Làm tròn chính xác theo số nguyên đồng (không cưỡng ép làm tròn đến 1.000 VNĐ)
      if (roundTo && parseInt(roundTo, 10) > 0) {
        const roundBase = parseInt(roundTo, 10);
        newPrice = Math.round(newPrice / roundBase) * roundBase;
      } else {
        newPrice = Math.round(newPrice);
      }

      await run('UPDATE products SET price = ? WHERE id = ?', [newPrice, p.id]);
      updatedCount++;
    }

    res.json({
      success: true,
      message: `Đã cập nhật giá cho ${updatedCount} sản phẩm thành công!`,
      count: updatedCount
    });
  } catch (error) {
    console.error('Lỗi điều chỉnh giá hàng loạt:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Quản lý Tin tức / Blog
app.get('/api/admin/blogs', requireAdmin, async (req, res) => {
  try {
    const blogs = await query('SELECT * FROM blogs ORDER BY created_at DESC, id DESC');
    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/blogs', requireAdmin, async (req, res) => {
  try {
    const { title, summary, content, image, author, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và Nội dung bài viết là bắt buộc!' });
    }

    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);

    const result = await run(
      'INSERT INTO blogs (title, slug, summary, content, image, author, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now", "localtime"))',
      [title, slug, summary || '', content, image || '', author || 'Ban Biên Tập', category || 'Tin công ty']
    );

    res.json({ success: true, message: 'Tạo bài viết mới thành công!', id: result.lastID });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/blogs/:id', requireAdmin, async (req, res) => {
  try {
    const { title, summary, content, image, author, category, created_at } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và Nội dung bài viết là bắt buộc!' });
    }

    if (created_at) {
      await run(
        'UPDATE blogs SET title = ?, summary = ?, content = ?, image = ?, author = COALESCE(?, author, "Điện Việt"), category = ?, created_at = ? WHERE id = ?',
        [title, summary || '', content, image || '', author || null, category || 'Tin công ty', created_at, req.params.id]
      );
    } else {
      await run(
        'UPDATE blogs SET title = ?, summary = ?, content = ?, image = ?, author = COALESCE(?, author, "Điện Việt"), category = ?, created_at = datetime("now", "localtime") WHERE id = ?',
        [title, summary || '', content, image || '', author || null, category || 'Tin công ty', req.params.id]
      );
    }

    res.json({ success: true, message: 'Cập nhật bài viết thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/blogs/:id', requireAdmin, async (req, res) => {
  try {
    await run('DELETE FROM blogs WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa bài viết thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Quản lý Liên hệ (Contacts)
app.get('/api/admin/contacts', requireAdmin, async (req, res) => {
  try {
    const { type, status } = req.query;
    let sql = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];

    if (type && type !== 'all') {
      sql += ' AND (type = ? OR type LIKE ?)';
      params.push(type, `%${type}%`);
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC, id DESC';
    const contacts = await query(sql, params);
    res.json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/contacts/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Mới', 'Đang xử lý', 'Đã xử lý'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ!' });
    }

    await run('UPDATE contacts SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Cập nhật trạng thái liên hệ thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật trạng thái đã gửi báo giá cho liên hệ
app.put('/api/admin/contacts/:id/quote-sent', requireAdmin, async (req, res) => {
  try {
    const contactId = req.params.id;
    const contact = await get('SELECT * FROM contacts WHERE id = ?', [contactId]);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ!' });
    }

    const newStatus = contact.status === 'Mới' ? 'Đang xử lý' : contact.status;
    await run('UPDATE contacts SET quote_sent = 1, status = ? WHERE id = ?', [newStatus, contactId]);
    res.json({ success: true, message: 'Đã gửi báo giá thành công!', status: newStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/contacts/:id', requireAdmin, async (req, res) => {
  try {
    await run('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa phản hồi liên hệ thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Cập nhật Cài đặt hệ thống (Settings)
app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      const existing = await get('SELECT id FROM settings WHERE key = ?', [key]);
      if (existing) {
        await run('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
      } else {
        await run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
      }
    }
    res.json({ success: true, message: 'Lưu cài đặt thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
} else {
  startServer();
}

module.exports = app;

