const express = require('express');
const { query, get, run, syncStoreData } = require('../../db');

const router = express.Router();

// 1. Cài đặt hệ thống & thông tin công ty (Công khai - Đã lọc bỏ thông tin nhạy cảm SMTP)
const SENSITIVE_SETTING_KEYS = new Set(['smtp_pass', 'smtp_user', 'smtp_host', 'smtp_port']);

router.get('/settings', async (req, res) => {
  try {
    const rows = await query('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => {
      if (!SENSITIVE_SETTING_KEYS.has(r.key)) {
        settings[r.key] = r.value;
      }
    });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1.1 Danh sách Loại Báo Giá / Liên Hệ
router.get('/quote-types', async (req, res) => {
  try {
    const row = await get('SELECT value FROM settings WHERE key = ?', ['quote_types']);
    let list = [];
    if (row && row.value) {
      try { list = JSON.parse(row.value); } catch (e) {}
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
router.get('/categories', async (req, res) => {
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
    if (req.query.limit) {
      const numLimit = parseInt(req.query.limit, 10);
      if (!isNaN(numLimit) && numLimit > 0) {
        sql += ` LIMIT ${numLimit}`;
      }
    }
    const categories = await query(sql, params);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Danh sách sản phẩm (Chỉ nạp sản phẩm thuộc các danh mục đang BẬT)
router.get('/products', async (req, res) => {
  try {
    const { type, category_id, search, sort, limit = 50, page = 1, id } = req.query;

    if (id) {
      const product = await get(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `, [id]);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
      }
      return res.json({ success: true, data: product });
    }

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
      AND (p.is_active = 1 OR p.is_active IS NULL)
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
    const numLimit = parseInt(limit, 10) || 50;
    const offset = (parseInt(page, 10) - 1) * numLimit;
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
      AND (p.is_active = 1 OR p.is_active IS NULL)
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
        page: parseInt(page, 10),
        limit: numLimit,
        totalPages: Math.ceil(totalRow.total / numLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Chi tiết 1 sản phẩm
router.get('/products/:id', async (req, res) => {
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
router.get('/blogs', async (req, res) => {
  try {
    const { all, limit, search, category, id } = req.query;

    if (id) {
      const blog = await get('SELECT * FROM blogs WHERE id = ?', [id]);
      if (!blog) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết!' });
      }
      return res.json({ success: true, data: blog });
    }

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
      sql += ` LIMIT ${parseInt(limit, 10) || 50}`;
    }

    const blogs = await query(sql, params);
    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Chi tiết 1 bài viết Blog
router.get('/blogs/:id', async (req, res) => {
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
router.post('/contacts', async (req, res) => {
  try {
    const { fullname, phone, email, address, type, product_name, message } = req.body;

    if (!fullname || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Họ tên, Số điện thoại và Nội dung lời nhắn!'
      });
    }

    let contactType = type && type.trim() !== '' ? type.trim() : 'Báo giá sản phẩm';
    if (contactType === 'Báo giá') contactType = 'Báo giá sản phẩm';

    // Sử dụng ID timestamp độc nhất (Date.now()) để không bao giờ bị trùng lặp hay xung đột với ID đã xóa
    const newId = Date.now();

    const result = await run(
      'INSERT INTO contacts (id, fullname, phone, email, address, type, product_name, message, status, quote_sent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newId, fullname.trim(), phone.trim(), (email || '').trim(), (address || '').trim(), contactType, (product_name || '').trim(), message.trim(), 'Mới', 0]
    );

    const generatedId = (result && result.lastID && result.lastID > 0) ? result.lastID : newId;

    const newContact = {
      id: generatedId,
      fullname: fullname.trim(),
      phone: phone.trim(),
      email: (email || '').trim(),
      address: (address || '').trim(),
      type: contactType,
      product_name: (product_name || '').trim(),
      message: message.trim(),
      status: 'Mới',
      quote_sent: 0,
      created_at: new Date().toISOString()
    };

    // Đồng bộ trực tiếp vào fallbackData để các endpoint khác cùng instance đọc được ngay
    try {
      await syncStoreData({ customContacts: [newContact] });
    } catch (sErr) {}

    res.json({
      success: true,
      message: 'Cảm ơn quý khách đã gửi thông tin! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
      id: generatedId,
      data: newContact
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

