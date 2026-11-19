const express = require('express');
const path = require('path');
const fs = require('fs');
const { PUBLIC_DIR, servePageWithBanner } = require('../utils/ssr');

const router = express.Router();

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
  servePageWithBanner(res, 'index.html', 'banner_home', 'page-banner-home');
});

router.get(['/products', '/products.html'], (req, res) => {
  servePageWithBanner(res, 'products.html', 'banner_products', 'page-banner-products');
});

router.get(['/product-detail', '/product-detail.html'], (req, res) => {
  servePageWithBanner(res, 'product-detail.html', null, null);
});

router.get(['/about', '/about.html'], (req, res) => {
  servePageWithBanner(res, 'about.html', 'banner_about', 'page-banner-about');
});

router.get(['/blogs', '/blogs.html'], (req, res) => {
  servePageWithBanner(res, 'blogs.html', 'banner_blogs', 'page-banner-blogs');
});

router.get(['/blog-detail', '/blog-detail.html'], (req, res) => {
  servePageWithBanner(res, 'blog-detail.html', null, null);
});

router.get(['/contact', '/contact.html', '/contact/'], (req, res) => {
  servePageWithBanner(res, 'contact.html', 'banner_contact', 'page-banner-contact');
});

router.get(['/huong-dan-bao-gia', '/huong-dan-bao-gia.html', '/huong-dan-bao-gia/'], (req, res) => {
  servePageWithBanner(res, 'huong-dan-bao-gia.html', null, null);
});

router.get(['/dieu-khoan-su-dung', '/dieu-khoan-su-dung.html', '/dieu-khoan-su-dung/'], (req, res) => {
  servePageWithBanner(res, 'dieu-khoan-su-dung.html', null, null);
});

router.get(['/chinh-sach-bao-hanh', '/chinh-sach-bao-hanh.html', '/chinh-sach-bao-hanh/', '/chinh-sach-bao-hang', '/chinh-sach-bao-hang.html'], (req, res) => {
  servePageWithBanner(res, 'chinh-sach-bao-hanh.html', null, null);
});

router.get(['/chinh-sach-bao-mat', '/chinh-sach-bao-mat.html', '/chinh-sach-bao-mat/'], (req, res) => {
  servePageWithBanner(res, 'chinh-sach-bao-mat.html', null, null);
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
