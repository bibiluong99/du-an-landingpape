/**
 * SCRIPT ĐỒNG BỘ DỮ LIỆU TỪ CỤC BỘ LÊN TURSO CLOUD DATABASE (1-CLICK MIGRATION)
 * Cách chạy: npm run migrate:turso
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

async function migrateToTurso() {
  const url = (process.env.TURSO_DATABASE_URL || '').trim();
  const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

  if (!url || url.includes('ten-db-cua-ban')) {
    console.error('❌ LỖI: Bạn chưa cấu hình TURSO_DATABASE_URL trong file .env!');
    console.log('👉 Hãy mở file .env và điền TURSO_DATABASE_URL và TURSO_AUTH_TOKEN rồi chạy lại: npm run migrate:turso');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU KHỞI TẠO & ĐẨY DỮ LIỆU LÊN TURSO CLOUD...');
  console.log('🔗 URL:', url);
  console.log('====================================================');

  const client = createClient({ url, authToken });

  // 1. Tạo cấu trúc bảng trên Turso
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      fullname VARCHAR(150) DEFAULT 'Quản trị viên',
      role VARCHAR(50) DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER DEFAULT NULL,
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(150) UNIQUE,
      description TEXT,
      image TEXT,
      show_in_slider INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      price REAL NOT NULL,
      original_price REAL DEFAULT NULL,
      image TEXT,
      images TEXT,
      short_desc TEXT,
      description TEXT,
      specs TEXT,
      applications TEXT,
      warranty_policy TEXT,
      is_new INTEGER DEFAULT 0,
      is_promo INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      stock INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      summary TEXT,
      content TEXT,
      image TEXT,
      author VARCHAR(100) DEFAULT 'Ban Biên Tập',
      category VARCHAR(100) DEFAULT 'Tin công ty',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(150),
      address TEXT,
      type VARCHAR(100) NOT NULL,
      product_name TEXT,
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'Mới',
      quote_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT
    )`
  ];

  for (const sql of ddlStatements) {
    await client.execute(sql);
  }
  console.log('✅ 1. Đã tạo đầy đủ 6 bảng trên Turso Cloud.');

  // 2. Đọc dữ liệu từ db_fallback_data.json (đã đồng bộ đầy đủ với database.sqlite)
  const dataPath = path.join(__dirname, '..', 'db_fallback_data.json');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // 2.1 Users
  for (const u of rawData.users || []) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, username, password, fullname, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [u.id, u.username, u.password, u.fullname || 'Quản trị viên', u.role || 'admin', u.created_at || new Date().toISOString()]
    });
  }
  console.log(`✅ 2. Đã đồng bộ ${(rawData.users || []).length} tài khoản quản trị.`);

  // 2.2 Categories
  for (const c of rawData.categories || []) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO categories (id, parent_id, name, slug, description, image, show_in_slider, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [c.id, c.parent_id || null, c.name, c.slug || null, c.description || '', c.image || '', c.show_in_slider !== undefined ? Number(c.show_in_slider) : 1, c.sort_order || 0, c.created_at || new Date().toISOString()]
    });
  }
  console.log(`✅ 3. Đã đồng bộ ${(rawData.categories || []).length} danh mục sản phẩm (cha & con).`);

  // 2.3 Products
  for (const p of rawData.products || []) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO products (id, category_id, name, slug, price, original_price, image, images, short_desc, description, specs, applications, warranty_policy, is_new, is_promo, is_active, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.id,
        p.category_id || null,
        p.name,
        p.slug || '',
        Number(p.price) || 0,
        p.original_price ? Number(p.original_price) : null,
        p.image || '',
        typeof p.images === 'object' ? JSON.stringify(p.images) : (p.images || null),
        p.short_desc || '',
        p.description || '',
        typeof p.specs === 'object' ? JSON.stringify(p.specs) : (p.specs || ''),
        p.applications || '',
        p.warranty_policy || '',
        p.is_new ? 1 : 0,
        p.is_promo ? 1 : 0,
        p.is_active !== undefined ? Number(p.is_active) : 1,
        p.stock || null,
        p.created_at || new Date().toISOString()
      ]
    });
  }
  console.log(`✅ 4. Đã đồng bộ ${(rawData.products || []).length} sản phẩm.`);

  // 2.4 Blogs
  for (const b of rawData.blogs || []) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO blogs (id, title, slug, summary, content, image, author, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [b.id, b.title, b.slug || null, b.summary || '', b.content || '', b.image || '', b.author || 'Ban Biên Tập', b.category || 'Tin công ty', b.created_at || new Date().toISOString()]
    });
  }
  console.log(`✅ 5. Đã đồng bộ ${(rawData.blogs || []).length} bài viết tin tức.`);

  // 2.5 Settings
  for (const s of rawData.settings || []) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      args: [s.key, String(s.value ?? '')]
    });
  }
  console.log(`✅ 6. Đã đồng bộ ${(rawData.settings || []).length} cấu hình hệ thống.`);

  // 2.6 Contacts
  for (const c of rawData.contacts || []) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO contacts (id, fullname, phone, email, address, type, product_name, message, status, quote_sent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [c.id, c.fullname, c.phone, c.email || '', c.address || '', c.type || 'Báo giá sản phẩm', c.product_name || '', c.message || '', c.status || 'Mới', c.quote_sent || 0, c.created_at || new Date().toISOString()]
    });
  }
  console.log(`✅ 7. Đã đồng bộ ${(rawData.contacts || []).length} liên hệ khách hàng.`);

  console.log('====================================================');
  console.log('🎉 HOÀN TẤT ĐỒNG BỘ 100% DỮ LIỆU LÊN TURSO CLOUD!');
  console.log('====================================================');
  process.exit(0);
}

migrateToTurso().catch(err => {
  console.error('❌ Lỗi khi đồng bộ lên Turso:', err.message);
  process.exit(1);
});

