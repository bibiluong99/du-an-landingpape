const express = require('express');
const path = require('path');
const fs = require('fs');
const { query } = require('../../db');
const { PUBLIC_DIR, getBaseUrl, servePageWithBanner } = require('../utils/ssr');

const router = express.Router();

// ==========================================
// SEO ROUTES: ROBOTS.TXT & SITEMAP.XML ĐỘNG
// ==========================================
router.get('/robots.txt', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const content = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin.html',
    'Disallow: /login',
    'Disallow: /login.html',
    'Disallow: /api/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`
  ].join('\n');

  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(content);
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { loc: '/', changefreq: 'daily', priority: '1.0' },
      { loc: '/products', changefreq: 'daily', priority: '0.9' },
      { loc: '/about', changefreq: 'monthly', priority: '0.7' },
      { loc: '/blogs', changefreq: 'weekly', priority: '0.8' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.8' },
      { loc: '/huong-dan-bao-gia', changefreq: 'monthly', priority: '0.6' },
      { loc: '/chinh-sach-bao-hanh', changefreq: 'monthly', priority: '0.6' },
      { loc: '/chinh-sach-bao-mat', changefreq: 'yearly', priority: '0.5' },
      { loc: '/dieu-khoan-su-dung', changefreq: 'yearly', priority: '0.5' }
    ];

    const urls = staticPages.map(p => ({
      loc: `${baseUrl}${p.loc}`,
      lastmod: today,
      changefreq: p.changefreq,
      priority: p.priority
    }));

    // Tự động nạp các danh mục đang bật từ Turso DB
    try {
      const categories = await query('SELECT id, created_at FROM categories WHERE show_in_slider = 1 OR show_in_slider IS NULL');
      (categories || []).forEach(c => {
        urls.push({
          loc: `${baseUrl}/products?category_id=${c.id}`,
          lastmod: today,
          changefreq: 'weekly',
          priority: '0.8'
        });
      });
    } catch (e) {}

    // Tự động nạp toàn bộ sản phẩm đang hiển thị từ Turso DB
    try {
      const products = await query('SELECT id, created_at FROM products WHERE is_active = 1 OR is_active IS NULL ORDER BY id DESC');
      (products || []).forEach(p => {
        const lm = p.created_at ? String(p.created_at).slice(0, 10) : today;
        urls.push({
          loc: `${baseUrl}/product-detail?id=${p.id}`,
          lastmod: /^\d{4}-\d{2}-\d{2}$/.test(lm) ? lm : today,
          changefreq: 'weekly',
          priority: '0.85'
        });
      });
    } catch (e) {}

    // Tự động nạp toàn bộ bài viết Blog từ Turso DB
    try {
      const blogs = await query('SELECT id, created_at FROM blogs ORDER BY id DESC');
      (blogs || []).forEach(b => {
        const lm = b.created_at ? String(b.created_at).slice(0, 10) : today;
        urls.push({
          loc: `${baseUrl}/blog-detail?id=${b.id}`,
          lastmod: /^\d{4}-\d{2}-\d{2}$/.test(lm) ? lm : today,
          changefreq: 'monthly',
          priority: '0.75'
        });
      });
    } catch (e) {}

    const xmlItems = urls.map(u => `  <url>
    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;

    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(xml);
  } catch (err) {
    res.status(500).type('text/plain').send('Lỗi tạo sitemap.xml');
  }
});

// Xử lý route /uploads/:filename fallback (chống ảnh hỏng trên Vercel serverless)
router.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const localFile = path.join(PUBLIC_DIR, 'uploads', filename);
  if (fs.existsSync(localFile)) {
    return res.sendFile(localFile);
  }
  const tmpFile = path.join('/tmp', 'uploads', filename);
  if (fs.existsSync(tmpFile)) {
    return res.sendFile(tmpFile);
  }
  const fallbackImg = path.join(PUBLIC_DIR, 'images', 'hd', 'cat-day-dien.jpg');
  if (fs.existsSync(fallbackImg)) {
    return res.sendFile(fallbackImg);
  }
  return res.redirect('/images/logo.png');
});

router.get(['/', '/index', '/index.html'], (req, res) => {
  servePageWithBanner(res, 'index.html', 'banner_home', 'page-banner-home', req);
});

router.get(['/products', '/products.html'], (req, res) => {
  servePageWithBanner(res, 'products.html', 'banner_products', 'page-banner-products', req);
});

router.get(['/product-detail', '/product-detail.html'], (req, res) => {
  servePageWithBanner(res, 'product-detail.html', null, null, req);
});

router.get(['/about', '/about.html'], (req, res) => {
  servePageWithBanner(res, 'about.html', 'banner_about', 'page-banner-about', req);
});

router.get(['/blogs', '/blogs.html'], (req, res) => {
  servePageWithBanner(res, 'blogs.html', 'banner_blogs', 'page-banner-blogs', req);
});

router.get(['/blog-detail', '/blog-detail.html'], (req, res) => {
  servePageWithBanner(res, 'blog-detail.html', null, null, req);
});

router.get(['/contact', '/contact.html', '/contact/'], (req, res) => {
  servePageWithBanner(res, 'contact.html', 'banner_contact', 'page-banner-contact', req);
});

router.get(['/huong-dan-bao-gia', '/huong-dan-bao-gia.html', '/huong-dan-bao-gia/'], (req, res) => {
  servePageWithBanner(res, 'huong-dan-bao-gia.html', null, null, req);
});

router.get(['/dieu-khoan-su-dung', '/dieu-khoan-su-dung.html', '/dieu-khoan-su-dung/'], (req, res) => {
  servePageWithBanner(res, 'dieu-khoan-su-dung.html', null, null, req);
});

router.get(['/chinh-sach-bao-hanh', '/chinh-sach-bao-hanh.html', '/chinh-sach-bao-hanh/', '/chinh-sach-bao-hang', '/chinh-sach-bao-hang.html'], (req, res) => {
  servePageWithBanner(res, 'chinh-sach-bao-hanh.html', null, null, req);
});

router.get(['/chinh-sach-bao-mat', '/chinh-sach-bao-mat.html', '/chinh-sach-bao-mat/'], (req, res) => {
  servePageWithBanner(res, 'chinh-sach-bao-mat.html', null, null, req);
});

router.get(['/login', '/login.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

router.get(['/admin', '/admin.html'], (req, res) => {
  try {
    const filePath = path.join(PUBLIC_DIR, 'admin.html');
    let html = fs.readFileSync(filePath, 'utf8');
    const v = Date.now();
    html = html.replace(/\/js\/admin\.js(\?v=[^"']*)?/g, `/js/admin.js?v=${v}`);
    html = html.replace(/\/js\/admin-quotes\.js(\?v=[^"']*)?/g, `/js/admin-quotes.js?v=${v}`);
    html = html.replace(/\/js\/admin-settings\.js(\?v=[^"']*)?/g, `/js/admin-settings.js?v=${v}`);
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(html);
  } catch (err) {
    res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
  }
});

module.exports = router;
