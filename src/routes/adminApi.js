const express = require('express');
const path = require('path');
const fs = require('fs');
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('Nodemailer chưa sẵn sàng:', e.message);
}

const { query, get, run, syncStoreData } = require('../../db');
const { requireAdmin } = require('../middleware/auth');
const { uploadsDir, upload, uploadToCloudinary } = require('../config/upload');
const { PUBLIC_DIR } = require('../utils/ssr');

const router = express.Router();

// API đồng bộ dữ liệu giữa LocalStorage Client và Serverless Store (Yêu cầu xác thực Admin)
router.post(['/admin/sync-store', '/sync-store'], requireAdmin, async (req, res) => {
  try {
    const result = await syncStoreData(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Upload ảnh đơn (Ưu tiên đẩy lên Cloudinary CDN nếu đã cấu hình)
router.post('/admin/upload', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Chưa có file ảnh nào được tải lên!' });
  }

  // 1. Thử upload lên Cloudinary CDN
  const cloudUrl = await uploadToCloudinary(req.file.path, 'dienviet');
  if (cloudUrl) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.json({ success: true, url: cloudUrl, fileUrl: cloudUrl, storage: 'cloudinary' });
  }

  // 2. Fallback lưu cục bộ / Base64 nếu chưa điền key Cloudinary
  const fileUrl = `/uploads/${req.file.filename}`;
  let dataUrl = fileUrl;
  try {
    if (fs.existsSync(req.file.path)) {
      const mime = req.file.mimetype || 'image/jpeg';
      const b64 = fs.readFileSync(req.file.path).toString('base64');
      dataUrl = `data:${mime};base64,${b64}`;
    }
  } catch (e) {}
  res.json({ success: true, url: dataUrl, fileUrl, storage: 'local' });
});

// Upload nhiều ảnh cùng lúc cho sản phẩm (Ưu tiên Cloudinary CDN)
router.post('/admin/upload-multiple', requireAdmin, upload.array('images', 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Chưa có file ảnh nào được tải lên!' });
  }
  const urls = [];
  const fileUrls = [];
  for (const f of req.files) {
    const cloudUrl = await uploadToCloudinary(f.path, 'dienviet/products');
    if (cloudUrl) {
      try { fs.unlinkSync(f.path); } catch (e) {}
      urls.push(cloudUrl);
      fileUrls.push(cloudUrl);
      continue;
    }

    const fileUrl = `/uploads/${f.filename}`;
    fileUrls.push(fileUrl);
    let url = fileUrl;
    try {
      if (fs.existsSync(f.path)) {
        const mime = f.mimetype || 'image/jpeg';
        const b64 = fs.readFileSync(f.path).toString('base64');
        url = `data:${mime};base64,${b64}`;
      }
    } catch (e) {}
    urls.push(url);
  }
  res.json({ success: true, urls, fileUrls });
});

// Thư viện ảnh hệ thống (Uploads & Images)
router.get('/admin/media-library', requireAdmin, async (req, res) => {
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
    const imagesDir = path.join(PUBLIC_DIR, 'images');
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
router.get('/admin/dashboard', requireAdmin, async (req, res) => {
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
router.get('/admin/categories', requireAdmin, async (req, res) => {
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

router.post('/admin/categories', requireAdmin, async (req, res) => {
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

    const parsedParentId = parent_id && parent_id !== '' && parseInt(parent_id, 10) > 0 ? parseInt(parent_id, 10) : null;

    const result = await run(
      'INSERT INTO categories (name, slug, description, image, show_in_slider, sort_order, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, slug, description || '', image || '', show_in_slider ? 1 : 0, sort_order || 0, parsedParentId]
    );

    res.json({ success: true, message: 'Thêm danh mục mới thành công!', id: result.lastID });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, image, show_in_slider, sort_order, parent_id } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống!' });
    }

    const parsedParentId = parent_id && parent_id !== '' && parseInt(parent_id, 10) > 0 ? parseInt(parent_id, 10) : null;

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

router.patch('/admin/categories/:id/toggle-slider', requireAdmin, async (req, res) => {
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

router.delete('/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    await run('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [req.params.id]);
    await run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa danh mục thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Quản lý Sản phẩm (Products)
router.get('/admin/products', requireAdmin, async (req, res) => {
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

router.post('/admin/products', requireAdmin, async (req, res) => {
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
        short_desc, description, specs, applications, warranty_policy, is_new, is_promo, is_active, stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
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
      is_promo ? 1 : 0,
      (req.body.is_active === false || req.body.is_active === 0 || req.body.is_active === '0') ? 0 : 1
    ]);

    res.json({ success: true, message: 'Thêm sản phẩm mới thành công!', id: result.lastID });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/products/:id', requireAdmin, async (req, res) => {
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
        is_active = ?,
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
      (req.body.is_active === false || req.body.is_active === 0 || req.body.is_active === '0') ? 0 : 1,
      req.params.id
    ]);

    res.json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/admin/products/:id/toggle-active', requireAdmin, async (req, res) => {
  try {
    let prod = await get('SELECT is_active FROM products WHERE id = ?', [req.params.id]);

    // Nếu sản phẩm chưa có trong DB (ví dụ sản phẩm tạo offline trong localStorage), tự động thêm vào
    if (!prod && req.body && req.body.product) {
      const p = req.body.product;
      const targetActive = req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 1;
      await run(`
        INSERT OR REPLACE INTO products (
          id, category_id, name, slug, price, original_price, image, images,
          short_desc, description, specs, applications, warranty_policy, is_new, is_promo, is_active, stock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `, [
        req.params.id,
        p.category_id || null,
        p.name || 'Sản phẩm mới',
        p.slug || ('prod-' + req.params.id),
        parseFloat(p.price) || 0,
        p.original_price ? parseFloat(p.original_price) : null,
        p.image || '',
        typeof p.images === 'object' ? JSON.stringify(p.images) : (p.images || null),
        p.short_desc || '',
        p.description || '',
        typeof p.specs === 'object' ? JSON.stringify(p.specs) : (p.specs || ''),
        p.applications || '',
        p.warranty_policy || '',
        p.is_new ? 1 : 0,
        p.is_promo ? 1 : 0,
        targetActive
      ]);
      return res.json({
        success: true,
        message: `Đã ${targetActive === 1 ? 'bật' : 'tắt'} hiển thị sản phẩm trên website!`,
        is_active: targetActive
      });
    }

    if (!prod) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
    }

    const currentVal = (prod.is_active === 0 || prod.is_active === '0' || prod.is_active === false) ? 0 : 1;
    const newValue = req.body && req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : (currentVal === 1 ? 0 : 1);
    await run('UPDATE products SET is_active = ? WHERE id = ?', [newValue, req.params.id]);
    res.json({
      success: true,
      message: `Đã ${newValue === 1 ? 'bật' : 'tắt'} hiển thị sản phẩm trên website!`,
      is_active: newValue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

router.patch('/admin/products/:id/toggle-promo', requireAdmin, async (req, res) => {
  try {
    let prod = await get('SELECT is_promo FROM products WHERE id = ?', [req.params.id]);

    // Nếu sản phẩm chưa có trong DB, tự động thêm vào
    if (!prod && req.body && req.body.product) {
      const p = req.body.product;
      const targetPromo = req.body.is_promo !== undefined ? (req.body.is_promo ? 1 : 0) : 1;
      await run(`
        INSERT OR REPLACE INTO products (
          id, category_id, name, slug, price, original_price, image, images,
          short_desc, description, specs, applications, warranty_policy, is_new, is_promo, is_active, stock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `, [
        req.params.id,
        p.category_id || null,
        p.name || 'Sản phẩm mới',
        p.slug || ('prod-' + req.params.id),
        parseFloat(p.price) || 0,
        p.original_price ? parseFloat(p.original_price) : null,
        p.image || '',
        typeof p.images === 'object' ? JSON.stringify(p.images) : (p.images || null),
        p.short_desc || '',
        p.description || '',
        typeof p.specs === 'object' ? JSON.stringify(p.specs) : (p.specs || ''),
        p.applications || '',
        p.warranty_policy || '',
        p.is_new ? 1 : 0,
        targetPromo,
        p.is_active !== undefined ? (p.is_active ? 1 : 0) : 1
      ]);
      return res.json({
        success: true,
        message: `Đã ${targetPromo === 1 ? 'bật' : 'tắt'} trạng thái Hot cho sản phẩm!`,
        is_promo: targetPromo
      });
    }

    if (!prod) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
    }
    const currentVal = prod.is_promo === 1 ? 1 : 0;
    const newValue = req.body && req.body.is_promo !== undefined ? (req.body.is_promo ? 1 : 0) : (currentVal === 1 ? 0 : 1);
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

router.delete('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa sản phẩm thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Điều chỉnh giá sản phẩm hàng loạt (Tăng / Giảm theo % hoặc số tiền cố định)
router.post('/admin/products/batch-adjust-price', requireAdmin, async (req, res) => {
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
router.get('/admin/blogs', requireAdmin, async (req, res) => {
  try {
    const blogs = await query('SELECT * FROM blogs ORDER BY created_at DESC, id DESC');
    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/blogs', requireAdmin, async (req, res) => {
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
      [title, slug, summary || '', content, image || '', author || 'Điện Việt', category || 'Tin công ty']
    );

    const newBlog = {
      id: result.lastID,
      title,
      slug,
      summary: summary || '',
      content,
      image: image || '',
      author: author || 'Điện Việt',
      category: category || 'Tin công ty',
      created_at: new Date().toISOString()
    };

    res.json({ success: true, message: 'Tạo bài viết mới thành công!', id: result.lastID, data: newBlog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/blogs/:id', requireAdmin, async (req, res) => {
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

router.delete('/admin/blogs/:id', requireAdmin, async (req, res) => {
  try {
    await run('DELETE FROM blogs WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa bài viết thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Quản lý Liên hệ (Contacts)
router.get('/admin/contacts', requireAdmin, async (req, res) => {
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
    let contacts = await query(sql, params);

    // Đảm bảo lọc thứ cấp chính xác 100%
    if (Array.isArray(contacts)) {
      if (status && status !== 'all') {
        contacts = contacts.filter(c => c.status === status);
      }
      if (type && type !== 'all') {
        const filterType = type.toLowerCase().trim();
        contacts = contacts.filter(c => {
          if (!c.type) return false;
          const ct = c.type.toLowerCase().trim();
          if (ct === filterType || ct.includes(filterType) || filterType.includes(ct)) return true;
          if (filterType.includes('báo giá') && ct.includes('báo giá')) return true;
          return false;
        });
      }
    }

    res.json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/contacts/:id/status', requireAdmin, async (req, res) => {
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
router.put('/admin/contacts/:id/quote-sent', requireAdmin, async (req, res) => {
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

// Gửi báo giá qua Gmail kèm file PDF đến khách hàng
router.post('/admin/contacts/:id/send-quote-email', requireAdmin, async (req, res) => {
  try {
    const contactId = req.params.id;
    const { pdfBase64, contractNo, buyerEmail, buyerName, quoteTotal, notes, companyName, smtpUser: reqSmtpUser, smtpPass: reqSmtpPass } = req.body;

    const contact = await get('SELECT * FROM contacts WHERE id = ?', [contactId]);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin liên hệ!' });
    }

    const targetEmail = (buyerEmail || contact.email || '').trim();
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Khách hàng không có địa chỉ email!' });
    }

    // Lấy cấu hình SMTP từ settings hoặc biến môi trường hoặc từ request body
    const smtpUserRow = await get('SELECT value FROM settings WHERE key = ?', ['smtp_user']);
    const smtpPassRow = await get('SELECT value FROM settings WHERE key = ?', ['smtp_pass']);
    const smtpHostRow = await get('SELECT value FROM settings WHERE key = ?', ['smtp_host']);
    const smtpPortRow = await get('SELECT value FROM settings WHERE key = ?', ['smtp_port']);
    const companyNameRow = await get('SELECT value FROM settings WHERE key = ?', ['company_name']);

    const smtpUser = ((reqSmtpUser && reqSmtpUser.trim()) || (smtpUserRow && smtpUserRow.value ? smtpUserRow.value : '')).trim() || process.env.SMTP_USER || process.env.GMAIL_USER || '';
    const smtpPass = ((reqSmtpPass && reqSmtpPass.trim()) || (smtpPassRow && smtpPassRow.value ? smtpPassRow.value : '')).trim() || process.env.SMTP_PASS || process.env.GMAIL_PASS || '';
    const smtpHost = (smtpHostRow && smtpHostRow.value ? smtpHostRow.value : '').trim() || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number((smtpPortRow && smtpPortRow.value) || process.env.SMTP_PORT || 465);
    const firmName = companyName || (companyNameRow && companyNameRow.value) || 'Điện Việt';

    // Tự động lưu cấu hình SMTP nếu được gửi kèm
    if (reqSmtpUser && reqSmtpPass) {
      try {
        await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_user', reqSmtpUser.trim()]);
        await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_pass', reqSmtpPass.trim()]);
      } catch (e) {}
    }

    // Cập nhật trạng thái liên hệ sang "Đang xử lý" và quote_sent = 1
    const newStatus = contact.status === 'Mới' ? 'Đang xử lý' : contact.status;
    await run('UPDATE contacts SET quote_sent = 1, status = ? WHERE id = ?', [newStatus, contactId]);

    // Nếu chưa cấu hình tài khoản Gmail gửi thư hoặc mật khẩu ứng dụng
    if (!smtpUser || !smtpPass) {
      return res.json({
        success: true,
        smtpConfigured: false,
        sent: false,
        status: newStatus,
        message: 'Chưa cấu hình tài khoản Gmail gửi thư trong Cấu Hình Website.'
      });
    }

    if (!nodemailer) {
      return res.json({
        success: true,
        smtpConfigured: false,
        sent: false,
        status: newStatus,
        message: 'Thư viện nodemailer chưa sẵn sàng trên máy chủ.'
      });
    }

    // Khởi tạo Nodemailer Transporter
    const cleanPass = smtpPass.replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: cleanPass
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });

    const safeContractNo = contractNo || `BG-${contactId}`;
    const customerName = buyerName || contact.fullname || 'Quý khách hàng';

    // Nội dung HTML email báo giá chuyên nghiệp
    const emailHtml = `
      <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #c8102e; color: #ffffff; padding: 24px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${firmName}</h1>
          <p style="margin: 6px 0 0; font-size: 13.5px; opacity: 0.95;">BẢNG BÁO GIÁ THIẾT BỊ ĐIỆN & VẬT TƯ</p>
        </div>
        <div style="padding: 26px 22px;">
          <p style="font-size: 15px; margin-top: 0;">Kính gửi <strong>${customerName}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">
            ${firmName} trân trọng cảm ơn Quý khách đã quan tâm và liên hệ yêu cầu báo giá sản phẩm, thiết bị điện.
            Chúng tôi xin gửi đến Quý khách bảng báo giá chi tiết theo yêu cầu <strong>(Số: ${safeContractNo})</strong>.
          </p>
          ${quoteTotal ? `
          <div style="background: #f8fafc; border-left: 4px solid #c8102e; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Tổng giá trị báo giá:</div>
            <div style="font-size: 20px; font-weight: bold; color: #c8102e; margin-top: 4px;">${quoteTotal}</div>
          </div>
          ` : ''}
          <p style="font-size: 14px; color: #334155;">
            📄 <strong>File báo giá chính thức định dạng PDF đã được đính kèm ở thư này.</strong> Quý khách có thể tải về để xem chi tiết hoặc in ấn trực tiếp.
          </p>
          ${notes ? `
          <div style="font-size: 12.5px; color: #64748b; background: #fffbeb; border: 1px dashed #f59e0b; padding: 12px; border-radius: 8px; margin: 18px 0; white-space: pre-line;">
            <strong>Ghi chú:</strong><br>${notes}
          </div>
          ` : ''}
          <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
            <p style="margin: 4px 0;">Nếu cần thêm thông tin kỹ thuật hoặc trao đổi chiết khấu số lượng lớn, xin vui lòng phản hồi email này hoặc liên hệ qua Hotline.</p>
            <p style="margin: 4px 0;">Trân trọng cảm ơn và kính chúc Quý khách nhiều thành công!</p>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <strong>${firmName}</strong> - Cam kết sản phẩm chính hãng, bảo hành uy tín.
        </div>
      </div>
    `;

    const attachments = [];
    if (pdfBase64) {
      const cleanBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
      const pdfBuffer = Buffer.from(cleanBase64, 'base64');
      attachments.push({
        filename: `Bao_Gia_${safeContractNo}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const mailOptions = {
      from: `"${firmName}" <${smtpUser}>`,
      to: targetEmail,
      subject: `[BÁO GIÁ] ${firmName} gửi Báo giá thiết bị điện - Số: ${safeContractNo}`,
      html: emailHtml,
      attachments
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      smtpConfigured: true,
      sent: true,
      status: newStatus,
      message: `Đã gửi báo giá kèm file PDF đến Gmail ${targetEmail} thành công!`
    });
  } catch (error) {
    console.error('Lỗi khi gửi email báo giá:', error);
    res.status(500).json({
      success: false,
      smtpConfigured: true,
      sent: false,
      message: `Không thể gửi email: ${error.message}`
    });
  }
});

router.delete('/admin/contacts/:id', requireAdmin, async (req, res) => {
  try {
    await run('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa phản hồi liên hệ thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Xem & Cập nhật Cài đặt hệ thống (Settings - Dành riêng cho Admin, bao gồm cả cấu hình SMTP)
router.get('/admin/settings', requireAdmin, async (req, res) => {
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

router.put('/admin/settings', requireAdmin, async (req, res) => {
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

module.exports = router;

