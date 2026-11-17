const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Nạp dữ liệu dự phòng từ db_fallback_data.json
let fallbackData = {
  users: [],
  categories: [],
  products: [],
  blogs: [],
  settings: [],
  contacts: []
};

try {
  let loaded = false;
  if (process.env.VERCEL) {
    const os = require('os');
    const tmpDir = process.env.TMPDIR || (process.platform === 'win32' ? os.tmpdir() : '/tmp');
    const tmpFallback = path.join(tmpDir, 'db_fallback_data.json');
    if (fs.existsSync(tmpFallback)) {
      fallbackData = JSON.parse(fs.readFileSync(tmpFallback, 'utf8'));
      loaded = true;
      console.log('Đã nạp dữ liệu fallback từ /tmp');
    }
  }
  if (!loaded) {
    fallbackData = require('./db_fallback_data.json');
    console.log('Đã nạp thành công bộ dữ liệu dự phòng (Fallback Data Store).');
  }
} catch (e) {
  try {
    let fallbackFile = path.join(__dirname, 'db_fallback_data.json');
    if (!fs.existsSync(fallbackFile)) {
      fallbackFile = path.join(process.cwd(), 'db_fallback_data.json');
    }
    if (fs.existsSync(fallbackFile)) {
      const raw = fs.readFileSync(fallbackFile, 'utf8');
      fallbackData = JSON.parse(raw);
      console.log('Đã nạp thành công bộ dữ liệu dự phòng qua fs.');
    }
  } catch (err) {
    console.warn('Lưu ý đọc db_fallback_data.json:', err.message);
  }
}

// Thử khởi tạo SQLite nếu môi trường hỗ trợ
let sqlite3 = null;
let db = null;
let useFallback = false;

try {
  sqlite3 = require('sqlite3').verbose();
  let DB_PATH = path.join(__dirname, 'database.sqlite');
  if (!fs.existsSync(DB_PATH)) {
    DB_PATH = path.join(process.cwd(), 'database.sqlite');
  }

  // Xử lý môi trường Serverless trên Vercel (thư mục gốc là read-only)
  if (process.env.VERCEL) {
    const os = require('os');
    const tmpDir = process.env.TMPDIR || (process.platform === 'win32' ? os.tmpdir() : '/tmp');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (e) {}

    const tmpDbPath = path.join(tmpDir, 'database.sqlite');
    try {
      if (!fs.existsSync(tmpDbPath) && fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, tmpDbPath);
        console.log('Đã copy database.sqlite sang /tmp để SQLite có quyền đọc ghi trên Vercel.');
      }
      if (fs.existsSync(tmpDbPath)) {
        DB_PATH = tmpDbPath;
      }
    } catch (err) {
      console.warn('Lưu ý copy database sang /tmp:', err.message);
    }
  }

  const openMode = (sqlite3.OPEN_READWRITE || 0x00000002) | (sqlite3.OPEN_CREATE || 0x00000004);
  db = new sqlite3.Database(DB_PATH, openMode, (err) => {
    if (err) {
      console.warn('Lỗi kết nối SQLite, tự động chuyển sang Fallback Store:', err.message);
      useFallback = true;
    } else {
      console.log('Đã kết nối thành công cơ sở dữ liệu SQLite tại:', DB_PATH);
    }
  });
} catch (err) {
  console.warn('sqlite3 native module không khả dụng, sử dụng Fallback Store:', err.message);
  useFallback = true;
}

// ==========================================
// BỘ XỬ LÝ TRUY VẤN DỰ PHÒNG (FALLBACK ENGINE)
// ==========================================
function saveFallbackData() {
  try {
    const jsonStr = JSON.stringify(fallbackData, null, 2);
    try {
      fs.writeFileSync(path.join(__dirname, 'db_fallback_data.json'), jsonStr, 'utf8');
    } catch (e1) {}
    if (process.env.VERCEL) {
      try {
        const os = require('os');
        const tmpDir = process.env.TMPDIR || (process.platform === 'win32' ? os.tmpdir() : '/tmp');
        fs.writeFileSync(path.join(tmpDir, 'db_fallback_data.json'), jsonStr, 'utf8');
      } catch (e2) {}
    }
  } catch (err) {}
}

function fallbackQuery(sql, params = []) {
  const s = sql.trim();
  const lower = s.toLowerCase();

  // 0. Xử lý các truy vấn đếm COUNT(*) khi câu truy vấn chính là SELECT COUNT(...)
  const isCountQuery = lower.startsWith('select count(') || lower.startsWith('select count (') || lower.startsWith('select count*') || lower.startsWith('select count (*');
  if (isCountQuery) {
    let total = 0;
    if (lower.includes('from products')) {
      if (lower.includes('category_id = ?') || lower.includes('p.category_id = ?')) {
        const targetCatId = params[0];
        const childCatIds = fallbackData.categories
          .filter(c => String(c.parent_id) === String(targetCatId))
          .map(c => String(c.id));
        const targetCatIds = [String(targetCatId), ...childCatIds];
        total = fallbackData.products.filter(p => targetCatIds.includes(String(p.category_id))).length;
      } else {
        total = fallbackData.products.length;
      }
    } else if (lower.includes('from categories')) {
      if (lower.includes('parent_id is null') || lower.includes('parent_id = 0')) {
        total = fallbackData.categories.filter(c => !c.parent_id).length;
      } else {
        total = fallbackData.categories.length;
      }
    } else if (lower.includes('from blogs')) {
      total = fallbackData.blogs.length;
    } else if (lower.includes('from contacts')) {
      if (lower.includes('mới') || lower.includes('pending') || lower.includes('new')) {
        total = fallbackData.contacts.filter(c => c.status === 'Mới' || c.status === 'pending').length;
      } else {
        total = fallbackData.contacts.length;
      }
    }
    return [{ total, count: total, c: total }];
  }

  // Settings
  if (lower.includes('from settings')) {
    if (lower.includes('where key = ?')) {
      const found = fallbackData.settings.find(x => x.key === params[0]);
      return found ? [found] : [];
    }
    return fallbackData.settings.map(x => ({ key: x.key, value: x.value }));
  }

  // Users
  if (lower.includes('from users')) {
    if (lower.includes('where username = ?')) {
      const found = fallbackData.users.find(u => u.username === params[0]);
      return found ? [found] : [];
    }
    if (lower.includes('where id = ?')) {
      const found = fallbackData.users.find(u => u.id == params[0]);
      return found ? [found] : [];
    }
    return fallbackData.users;
  }

  // Contacts
  if (lower.includes('from contacts')) {
    let list = [...fallbackData.contacts];
    if (lower.includes('where id = ?')) {
      const found = list.find(c => String(c.id) === String(params[0]));
      return found ? [found] : [];
    }
    return list;
  }

  // Categories (Truy vấn danh mục)
  const isCategoriesQuery =
    lower.startsWith('select c.*') ||
    lower.startsWith('select show_in_slider from categories') ||
    lower.startsWith('select id from categories') ||
    lower.startsWith('select id, name from categories') ||
    lower.startsWith('select * from categories') ||
    (lower.includes('from categories c') && !lower.startsWith('select p.*')) ||
    (lower.includes('from categories') && !lower.startsWith('select p.*') && !lower.includes('from products p left join') && !lower.includes('from products where') && !lower.includes('from products p where'));

  if (isCategoriesQuery) {
    let list = fallbackData.categories.map(c => {
      const parent = c.parent_id ? fallbackData.categories.find(p => String(p.id) === String(c.parent_id)) : null;
      const childIds = !c.parent_id
        ? fallbackData.categories.filter(ch => String(ch.parent_id) === String(c.id)).map(ch => String(ch.id))
        : [];
      const count = fallbackData.products.filter(p =>
        String(p.category_id) === String(c.id) || (!c.parent_id && childIds.includes(String(p.category_id)))
      ).length;

      return {
        ...c,
        parent_name: parent ? parent.name : null,
        product_count: count
      };
    });

    if (lower.includes('where id = ?') || lower.includes('where c.id = ?')) {
      const found = list.find(c => String(c.id) === String(params[0]));
      return found ? [found] : [];
    }
    if (lower.includes('where slug = ?') || lower.includes('where c.slug = ?')) {
      const found = list.find(c => c.slug === params[0]);
      return found ? [found] : [];
    }
    if (lower.includes('parent_only') || lower.includes('where c.parent_id is null') || lower.includes('and c.parent_id is null') || lower.includes('where parent_id is null') || lower.includes('and parent_id is null')) {
      list = list.filter(c => !c.parent_id);
    }
    if (lower.includes('c.show_in_slider = 1') || lower.includes('show_in_slider = 1')) {
      const activeParentIds = new Set(
        list.filter(c => !c.parent_id && c.show_in_slider !== 0 && c.show_in_slider !== '0' && c.show_in_slider !== false).map(c => String(c.id))
      );
      list = list.filter(c => {
        if (c.show_in_slider === 0 || c.show_in_slider === '0' || c.show_in_slider === false) return false;
        if (c.parent_id) {
          return activeParentIds.has(String(c.parent_id));
        }
        return true;
      });
    }

    // Sắp xếp: danh mục cha đứng trước kèm các danh mục con theo thứ tự
    list.sort((a, b) => {
      const rootA = Number(a.parent_id || a.id);
      const rootB = Number(b.parent_id || b.id);
      if (rootA !== rootB) return rootA - rootB;
      const isChildA = a.parent_id ? 1 : 0;
      const isChildB = b.parent_id ? 1 : 0;
      if (isChildA !== isChildB) return isChildA - isChildB;
      if ((a.sort_order || 0) !== (b.sort_order || 0)) return (a.sort_order || 0) - (b.sort_order || 0);
      return Number(a.id) - Number(b.id);
    });

    return list;
  }

  // Products
  const isProductsQuery = lower.startsWith('select p.*') || lower.includes('from products p') || lower.includes('from products where') || lower.includes('from products');

  if (isProductsQuery) {
    let list = fallbackData.products.map(p => {
      const cat = fallbackData.categories.find(c => String(c.id) === String(p.category_id));
      return {
        ...p,
        category_name: cat ? cat.name : ''
      };
    });
    if (lower.includes('where id = ?') || lower.includes('where p.id = ?')) {
      const found = list.find(p => String(p.id) === String(params[0]));
      return found ? [found] : [];
    }
    if (lower.includes('where slug = ?') || lower.includes('where p.slug = ?')) {
      const found = list.find(p => p.slug === params[0]);
      return found ? [found] : [];
    }
    if (lower.includes('p.is_new = 1') || lower.includes('is_new = 1')) {
      list = list.filter(p => p.is_new === 1 || p.is_new === '1');
    }
    if (lower.includes('p.is_promo = 1') || lower.includes('is_promo = 1')) {
      list = list.filter(p => p.is_promo === 1 || p.is_promo === '1');
    }
    if (lower.includes('p.is_active = 1') || lower.includes('is_active = 1')) {
      list = list.filter(p => p.is_active !== 0 && p.is_active !== '0' && p.is_active !== false);
    }

    // Lọc theo show_in_slider của danh mục nếu câu truy vấn công khai yêu cầu
    if (lower.includes('show_in_slider = 1') || (!lower.includes('from products p left join') && !lower.includes('select p.* from products p order by p.id desc'))) {
      const activeParentIds = new Set(
        fallbackData.categories.filter(c => !c.parent_id && c.show_in_slider !== 0 && c.show_in_slider !== '0' && c.show_in_slider !== false).map(c => String(c.id))
      );
      const activeCatIds = new Set(
        fallbackData.categories.filter(c => {
          if (c.show_in_slider === 0 || c.show_in_slider === '0' || c.show_in_slider === false) return false;
          if (c.parent_id) return activeParentIds.has(String(c.parent_id));
          return true;
        }).map(c => String(c.id))
      );
      list = list.filter(p => !p.category_id || activeCatIds.has(String(p.category_id)));
    }

    // Lọc theo category_id: Hỗ trợ cả danh mục cha (lấy luôn sản phẩm thuộc danh mục con) và danh mục con
    if (lower.includes('category_id = ?') || lower.includes('p.category_id = ?')) {
      const targetCatId = params[0];
      const childCatIds = fallbackData.categories
        .filter(c => String(c.parent_id) === String(targetCatId))
        .map(c => String(c.id));
      const targetCatIds = [String(targetCatId), ...childCatIds];
      list = list.filter(p => targetCatIds.includes(String(p.category_id)));
    }

    if (lower.includes('like ?')) {
      const term = String(params[0] || '').replace(/%/g, '').toLowerCase();
      if (term) {
        list = list.filter(p => (p.name && p.name.toLowerCase().includes(term)) || (p.short_desc && p.short_desc.toLowerCase().includes(term)));
      }
    }
    const limitMatch = lower.match(/limit\s+(\d+)/);
    if (limitMatch) {
      list = list.slice(0, parseInt(limitMatch[1]));
    }
    return list;
  }

  // Blogs
  if (lower.includes('from blogs')) {
    let list = [...fallbackData.blogs];
    if (lower.includes('where id = ?')) {
      const found = list.find(b => String(b.id) === String(params[0]));
      return found ? [found] : [];
    }
    if (lower.includes('where slug = ?')) {
      const found = list.find(b => b.slug === params[0]);
      return found ? [found] : [];
    }
    if (lower.includes('category = ?')) {
      const catParam = params.find(p => typeof p === 'string' && !p.startsWith('%'));
      if (catParam && catParam !== 'all') {
        list = list.filter(b => b.category === catParam);
      }
    }
    if (lower.includes('like ?')) {
      const searchParam = params.find(p => typeof p === 'string' && p.startsWith('%'));
      if (searchParam) {
        const term = searchParam.replace(/%/g, '').toLowerCase().trim();
        if (term) {
          list = list.filter(b => (b.title && b.title.toLowerCase().includes(term)) || (b.summary && b.summary.toLowerCase().includes(term)));
        }
      }
    }
    const limitMatch = lower.match(/limit\s+(\d+)/);
    if (limitMatch) {
      list = list.slice(0, parseInt(limitMatch[1]));
    }
    return list;
  }

  return [];
}

function fallbackGet(sql, params = []) {
  const rows = fallbackQuery(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

function fallbackRun(sql, params = []) {
  const s = sql.trim();
  const lower = s.toLowerCase();

  // 1. Categories
  if (lower.startsWith('delete from categories')) {
    const catId = params[0];
    fallbackData.categories = fallbackData.categories.filter(c => String(c.id) !== String(catId));
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update categories set parent_id = null')) {
    const parentId = params[0];
    fallbackData.categories.forEach(c => {
      if (String(c.parent_id) === String(parentId)) {
        c.parent_id = null;
      }
    });
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update categories set show_in_slider = ?')) {
    const [val, id] = params;
    const cat = fallbackData.categories.find(c => String(c.id) === String(id));
    if (cat) cat.show_in_slider = Number(val);
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update categories set name =')) {
    const [name, description, image, show_in_slider, sort_order, parent_id, id] = params;
    const cat = fallbackData.categories.find(c => String(c.id) === String(id));
    if (cat) {
      cat.name = name;
      cat.description = description;
      if (image !== undefined && image !== null) cat.image = image;
      cat.show_in_slider = Number(show_in_slider);
      cat.sort_order = Number(sort_order);
      cat.parent_id = parent_id ? Number(parent_id) : null;
    }
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('insert into categories')) {
    const [name, slug, description, image, show_in_slider, sort_order, parent_id] = params;
    const newId = fallbackData.categories.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
    const newCat = {
      id: newId,
      name,
      slug,
      description: description || '',
      image: image || '/images/hd/cat-day-dien.jpg',
      show_in_slider: Number(show_in_slider) || 0,
      sort_order: Number(sort_order) || 0,
      parent_id: parent_id ? Number(parent_id) : null,
      created_at: new Date().toISOString()
    };
    fallbackData.categories.push(newCat);
    saveFallbackData();
    return { lastID: newId, changes: 1 };
  }

  // 2. Products
  if (lower.startsWith('delete from products')) {
    const prodId = params[0];
    fallbackData.products = fallbackData.products.filter(p => String(p.id) !== String(prodId));
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update products set is_promo = ?')) {
    const [val, id] = params;
    const p = fallbackData.products.find(x => String(x.id) === String(id));
    if (p) p.is_promo = Number(val);
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update products set is_active = ?')) {
    const [val, id] = params;
    const p = fallbackData.products.find(x => String(x.id) === String(id));
    if (p) p.is_active = Number(val);
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update products set price = ?')) {
    const [val, id] = params;
    const p = fallbackData.products.find(x => String(x.id) === String(id));
    if (p) p.price = Number(val);
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update products set')) {
    const id = params[params.length - 1];
    const p = fallbackData.products.find(x => String(x.id) === String(id));
    if (p) {
      p.category_id = Number(params[0]);
      p.name = params[1];
      p.slug = params[2];
      p.price = Number(params[3]);
      p.original_price = Number(params[4]);
      if (params[5]) p.image = params[5];
      if (params[6]) p.images = params[6];
      p.short_desc = params[7];
      p.description = params[8];
      p.specs = params[9];
      p.applications = params[10];
      p.warranty_policy = params[11];
      p.is_new = Number(params[12]);
      p.is_promo = Number(params[13]);
      p.stock = Number(params[14]);
    }
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('insert into products')) {
    const newId = fallbackData.products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    const newProd = {
      id: newId,
      category_id: Number(params[0]),
      name: params[1],
      slug: params[2],
      price: Number(params[3]),
      original_price: Number(params[4]),
      image: params[5],
      images: params[6],
      short_desc: params[7],
      description: params[8],
      specs: params[9],
      applications: params[10],
      warranty_policy: params[11],
      is_new: Number(params[12]),
      is_promo: Number(params[13]),
      stock: Number(params[14]),
      created_at: new Date().toISOString()
    };
    fallbackData.products.unshift(newProd);
    saveFallbackData();
    return { lastID: newId, changes: 1 };
  }

  // 3. Blogs
  if (lower.startsWith('delete from blogs')) {
    const blogId = params[0];
    fallbackData.blogs = fallbackData.blogs.filter(b => String(b.id) !== String(blogId));
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update blogs set')) {
    const id = params[params.length - 1];
    const b = fallbackData.blogs.find(x => String(x.id) === String(id));
    if (b) {
      b.title = params[0];
      b.summary = params[1] || '';
      b.content = params[2];
      if (params[3]) b.image = params[3];
      if (params[4]) b.author = params[4];
      if (params[5]) b.category = params[5];
    }
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('insert into blogs')) {
    const newId = fallbackData.blogs.reduce((max, b) => Math.max(max, Number(b.id) || 0), 0) + 1;
    const newBlog = {
      id: newId,
      title: params[0],
      slug: params[1],
      summary: params[2] || '',
      content: params[3],
      image: params[4] || '',
      author: params[5] || 'Ban Biên Tập',
      category: params[6] || 'Tin công ty',
      created_at: new Date().toISOString()
    };
    fallbackData.blogs.unshift(newBlog);
    saveFallbackData();
    return { lastID: newId, changes: 1 };
  }

  // 4. Contacts
  if (lower.startsWith('delete from contacts')) {
    const contactId = params[0];
    fallbackData.contacts = fallbackData.contacts.filter(c => String(c.id) !== String(contactId));
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update contacts set quote_sent = 1')) {
    const [status, id] = params;
    const c = fallbackData.contacts.find(x => String(x.id) === String(id));
    if (c) {
      c.quote_sent = 1;
      c.status = status;
    }
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('update contacts set status = ?')) {
    const [status, id] = params;
    const c = fallbackData.contacts.find(x => String(x.id) === String(id));
    if (c) c.status = status;
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('insert into contacts')) {
    const newId = fallbackData.contacts.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
    fallbackData.contacts.unshift({
      id: newId,
      fullname: params[0],
      phone: params[1],
      email: params[2],
      type: params[3],
      product_name: params[4] || '',
      message: params[5] || '',
      ip_address: '127.0.0.1',
      status: 'Mới',
      created_at: new Date().toISOString()
    });
    saveFallbackData();
    return { lastID: newId, changes: 1 };
  }

  // 5. Users
  if (lower.startsWith('update users set password = ?')) {
    const [password, id] = params;
    const u = fallbackData.users.find(x => String(x.id) === String(id));
    if (u) u.password = password;
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  // 6. Settings
  if (lower.startsWith('update settings')) {
    const val = params[0];
    const key = params[1];
    const item = fallbackData.settings.find(x => x.key === key);
    if (item) item.value = String(val);
    else fallbackData.settings.push({ key, value: String(val) });
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  if (lower.startsWith('insert into settings')) {
    const [key, val] = params;
    const item = fallbackData.settings.find(x => x.key === key);
    if (item) item.value = String(val);
    else fallbackData.settings.push({ key, value: String(val) });
    saveFallbackData();
    return { lastID: 0, changes: 1 };
  }

  return { lastID: 1, changes: 1 };
}

// Helper wrap SQLite callback thành Promise kèm Fallback an toàn
const query = (sql, params = []) => {
  if (!useFallback && db) {
    return new Promise((resolve) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.warn('SQLite db.all lỗi, dùng Fallback:', err.message);
          return resolve(fallbackQuery(sql, params));
        }
        resolve(rows);
      });
    });
  }
  return Promise.resolve(fallbackQuery(sql, params));
};

const get = (sql, params = []) => {
  if (!useFallback && db) {
    return new Promise((resolve) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          console.warn('SQLite db.get lỗi, dùng Fallback:', err.message);
          return resolve(fallbackGet(sql, params));
        }
        resolve(row);
      });
    });
  }
  return Promise.resolve(fallbackGet(sql, params));
};

const run = (sql, params = []) => {
  if (!useFallback && db) {
    return new Promise((resolve) => {
      db.run(sql, params, function (err) {
        if (err) {
          if (!sql.includes('ALTER TABLE')) {
            console.warn('SQLite db.run lỗi, dùng Fallback:', err.message);
          }
          return resolve(fallbackRun(sql, params));
        }
        try { fallbackRun(sql, params); } catch (e) {}
        resolve({ lastID: this ? this.lastID : 1, changes: this ? this.changes : 1 });
      });
    });
  }
  return Promise.resolve(fallbackRun(sql, params));
};

// Hàm băm mật khẩu chuẩn SHA256 kèm salt
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password + '_salt_vina_2026').digest('hex');
};

// Khởi tạo bảng và dữ liệu mẫu
const initDB = async () => {
  if (useFallback || !db) {
    console.log('Chạy chế độ Fallback Data Store (không cần khởi tạo bảng SQLite)');
    return;
  }
  try {
    // 1. Users
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        fullname VARCHAR(150) DEFAULT 'Quản trị viên',
        role VARCHAR(50) DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Categories
    await run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER DEFAULT NULL,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) UNIQUE,
        description TEXT,
        image TEXT,
        show_in_slider INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    // Tự động bổ sung cột parent_id nếu bảng categories đã tồn tại từ trước
    try {
      await run('ALTER TABLE categories ADD COLUMN parent_id INTEGER DEFAULT NULL');
    } catch (e) {
      // Đã có cột parent_id
    }

    // 3. Products
    await run(`
      CREATE TABLE IF NOT EXISTS products (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    // Tự động bổ sung các cột mới nếu database đã tồn tại từ trước
    try {
      await run('ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1');
    } catch (e) {
      // Đã có cột is_active
    }
    try {
      await run('ALTER TABLE products ADD COLUMN images TEXT');
    } catch (e) {
      // Đã có cột images
    }
    try {
      await run('ALTER TABLE products ADD COLUMN applications TEXT');
    } catch (e) {
      // Đã có cột applications
    }
    try {
      await run('ALTER TABLE products ADD COLUMN warranty_policy TEXT');
    } catch (e) {
      // Đã có cột warranty_policy
    }

    // 4. Blogs
    await run(`
      CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        summary TEXT,
        content TEXT,
        image TEXT,
        author VARCHAR(100) DEFAULT 'Ban Biên Tập',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Contacts
    await run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(150),
        type VARCHAR(100) NOT NULL,
        product_name TEXT,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Mới',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tự động bổ sung cột product_name nếu database đã tồn tại từ trước
    try {
      await run('ALTER TABLE contacts ADD COLUMN product_name TEXT');
    } catch (e) {
      // Đã có cột product_name
    }

    // Tự động bổ sung cột quote_sent
    try {
      await run('ALTER TABLE contacts ADD COLUMN quote_sent INTEGER DEFAULT 0');
    } catch (e) {
      // Đã có cột quote_sent
    }

    // 6. Settings
    await run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT
      )
    `);

    console.log('Khởi tạo bảng cơ sở dữ liệu hoàn tất!');

    // Kiểm tra và gieo dữ liệu mẫu (Seed Data)
    await seedData();
  } catch (error) {
    console.error('Lỗi khi khởi tạo database:', error);
  }
};

const seedData = async () => {
  // 1. Kiểm tra Admin
  const adminUser = await get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminUser) {
    const defaultPasswordHash = hashPassword('admin123');
    await run(
      'INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)',
      ['admin', defaultPasswordHash, 'Quản Trị Viên Hệ Thống', 'admin']
    );
    console.log('Đã tạo tài khoản quản trị mặc định: admin / admin123');
  }

  // 2. Cài đặt hệ thống (Settings)
  const defaultSettings = [
    { key: 'company_name', value: 'Điện Việt' },
    { key: 'company_slogan', value: 'Kết nối giá trị - Thắp sáng tương lai' },
    { key: 'hero_title', value: 'Dây điện - Cáp điện' },
    { key: 'hero_slogan', value: 'Chất lượng tạo nên giá trị!' },
    { key: 'hero_subtitle', value: 'An toàn • Bền bỉ • Hiệu quả' },
    { key: 'hero_image', value: '/images/hero-banner.jpg' },
    { key: 'about_title', value: 'Công ty TNHH Điện Việt' },
    { key: 'about_history', value: 'Với hơn 10 năm kinh nghiệm trong lĩnh vực thiết bị điện, Điện Việt cam kết mang đến cho khách hàng những sản phẩm chất lượng, giải pháp tối ưu và dịch vụ chuyên nghiệp nhất.' },
    { key: 'about_mission', value: 'Sứ mệnh của Điện Việt là đem nguồn điện an toàn, ổn định và hiệu quả đến từng công trình, gia đình Việt.' },
    { key: 'about_values', value: 'Sản phẩm chất lượng • Giá cả cạnh tranh • Dịch vụ tận tâm' },
    { key: 'phone', value: '1800 1234' },
    { key: 'email', value: 'hotro@dienviet.vn' },
    { key: 'address', value: 'Số 123 Nguyễn Văn Cừ, Hà Nội' },
    { key: 'zalo_link', value: 'https://zalo.me/18001234' },
    { key: 'facebook_link', value: 'https://facebook.com/dienviet.official' },
    { key: 'shopee_link', value: 'https://shopee.vn/dienviet' },
    { key: 'maps_embed', value: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.9242941011835!2d105.86790517596956!3d21.035715987541243!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135a987d605ff79%3A0x6b8d2e85ab5ff8aa!2zMTIzIE5ndXnhu4VuIFbEg24gQ-G7qywgTG9uZyBCacOqbiwgSMOgIE7hu5lp!5e0!3m2!1svi!2s!4v1710000000000!5m2!1svi!2s' },
    { key: 'banner_home', value: '/images/hero-banner-main.jpg' },
    { key: 'banner_about', value: '/images/about-hero-banner.jpg' },
    { key: 'banner_products', value: '/images/products-hero-banner.jpg' },
    { key: 'banner_blogs', value: '/images/blogs-hero-banner.jpg' },
    { key: 'banner_contact', value: '/images/contact-hero-banner.jpg' },
    { key: 'quote_types', value: JSON.stringify([
      { name: 'Báo giá sản phẩm', show_products: true },
      { name: 'Tư vấn kỹ thuật', show_products: false },
      { name: 'Hỗ trợ bảo hành / Đổi trả', show_products: false },
      { name: 'Hợp tác đại lý / Dự án', show_products: true },
      { name: 'Góp ý / Khiếu nại', show_products: false }
    ]) }
  ];

  for (const item of defaultSettings) {
    const existing = await get('SELECT id FROM settings WHERE key = ?', [item.key]);
    if (!existing) {
      await run('INSERT INTO settings (key, value) VALUES (?, ?)', [item.key, item.value]);
    }
  }

  // 3. Danh mục sản phẩm (Categories)
  const catCount = await get('SELECT COUNT(*) as count FROM categories');
  if (catCount.count === 0) {
    const defaultCategories = [
      {
        name: 'Dây điện',
        slug: 'day-dien',
        description: 'Dây điện dân dụng Cadivi, LS Vina ruột đồng nguyên chất.',
        image: '/images/cat-day-dien.svg',
        show_in_slider: 1,
        sort_order: 1
      },
      {
        name: 'Dây cáp điện',
        slug: 'day-cap-dien',
        description: 'Cáp điện lực hạ thế CVV, CXV 1-4 lõi đồng cao cấp.',
        image: '/images/cat-day-cap-dien.svg',
        show_in_slider: 1,
        sort_order: 2
      },
      {
        name: 'Thiết bị điện',
        slug: 'thiet-bi-dien',
        description: 'Cầu dao tự động MCB, MCCB, Aptomat chống giật.',
        image: '/images/cat-thiet-bi-dien.svg',
        show_in_slider: 1,
        sort_order: 3
      },
      {
        name: 'Ổ cắm, công tắc',
        slug: 'o-cam-cong-tac',
        description: 'Mặt ổ cắm 3 chấu an toàn, công tắc hạt đơn/đôi cao cấp.',
        image: '/images/cat-o-cam-cong-tac.svg',
        show_in_slider: 1,
        sort_order: 4
      },
      {
        name: 'Phụ kiện điện',
        slug: 'phu-kien-dien',
        description: 'Đầu cosse đồng, ống gen co nhiệt, băng dính cách điện.',
        image: '/images/cat-phu-kien-dien.svg',
        show_in_slider: 1,
        sort_order: 5
      },
      {
        name: 'Đèn chiếu sáng',
        slug: 'den-chieu-sang',
        description: 'Đèn LED âm trần siêu mỏng Downlight, đèn tuýp LED.',
        image: '/images/cat-den-chieu-sang.svg',
        show_in_slider: 1,
        sort_order: 6
      }
    ];

    for (const cat of defaultCategories) {
      await run(
        'INSERT INTO categories (name, slug, description, image, show_in_slider, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [cat.name, cat.slug, cat.description, cat.image, cat.show_in_slider, cat.sort_order]
      );
    }
    console.log('Đã tạo danh mục sản phẩm mẫu thành công!');
  }

  // 4. Sản phẩm mẫu (Products)
  const prodCount = await get('SELECT COUNT(*) as count FROM products');
  if (prodCount.count === 0) {
    const cats = await query('SELECT id, name FROM categories ORDER BY id ASC');
    const c1 = cats[0]?.id || 1;
    const c2 = cats[1]?.id || 2;
    const c3 = cats[2]?.id || 3;
    const c4 = cats[3]?.id || 4;
    const c5 = cats[4]?.id || 5;

    const sampleProducts = [
  // 1. Dây điện (Cat 1)
  {
    category_id: 1,
    name: 'Dây điện đơn ruột đồng Cadivi CV 1.5 mm² (Cu/PVC)',
    price: 5800,
    original_price: 6500,
    image: '/images/prod-cadivi-red.jpg',
    images: JSON.stringify(['/images/prod-cadivi-red.jpg', '/images/prod-cadivi-thumb-1.jpg', '/images/prod-cadivi-big.jpg']),
    short_desc: 'Dây điện đơn Cadivi CV 1.5mm² ruột đồng mềm 99.99%, bọc nhựa PVC cách điện cao cấp.\n- Dẫn điện tốt, an toàn tuyệt đối chống cháy nổ\n- Độ bền cao, tiêu chuẩn TCVN 6610-3 / IEC 60227\n- Phù hợp hệ thống chiếu sáng và công tắc dân dụng',
    description: 'Dây điện đơn Cadivi CV 1.5mm² (Cu/PVC) được sản xuất trên dây chuyền công nghệ hiện đại, ruột dẫn gồm các sợi đồng ủ mềm bện tròn đồng tâm đạt độ tinh khiết 99.99%. Vỏ bọc PVC cách điện chất lượng cao, chịu được điện áp 450/750V và nhiệt độ làm việc dài hạn 70°C. Thích hợp lắp đặt trong hệ thống điện dân dụng và công nghiệp.',
    specs: JSON.stringify({ 'Tiêu chuẩn': 'TCVN 6610-3 / IEC 60227-3', 'Điện áp định mức': '450/750V', 'Ruột dẫn': 'Đồng tinh chất 99.99%', 'Tiết diện': '1.5 mm²', 'Nhiệt độ làm việc': '70°C', 'Xuất xứ': 'Cadivi Việt Nam' }),
    applications: '- Đi dây cấp nguồn cho hệ thống đèn chiếu sáng gia đình, căn hộ, văn phòng.\n- Đấu nối công tắc, ổ cắm phụ và các bảng điện dân dụng.\n- Luồn trong ống ghen PVC âm tường, âm trần hoặc đi nổi an toàn.',
    warranty_policy: '- Bảo hành chính hãng Cadivi 24 tháng theo tiêu chuẩn nhà máy.\n- Cam kết 100% ruột đồng nguyên chất, hoàn tiền 200% nếu phát hiện hàng giả.\n- Đổi mới trong vòng 7 ngày nếu lỗi cách điện hoặc nứt vỏ nhựa do nhà sản xuất.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 1,
    name: 'Dây điện đơn Cadivi CV 2.5 mm² ruột đồng dẫn điện (Cu/PVC)',
    price: 9600,
    original_price: 11000,
    image: '/images/prod-cadivi-red.jpg',
    images: JSON.stringify(['/images/prod-cadivi-red.jpg', '/images/prod-cadivi-thumb-2.jpg', '/images/prod-cadivi-big.jpg']),
    short_desc: 'Dây điện đơn Cadivi 2.5mm² chịu tải cao, chuyên dùng cấp nguồn ổ cắm và thiết bị điện lạnh.\n- Ruột đồng nguyên chất 99.99% dẫn điện tối ưu\n- Vỏ cách điện PVC chịu nhiệt 70°C bền bỉ\n- Đầy đủ chứng nhận CO/CQ từ nhà máy Cadivi',
    description: 'Dây điện Cadivi CV 2.5 mm² là dòng dây điện hạ thế tiêu chuẩn được sử dụng rộng rãi nhất trong các công trình nhà ở, khách sạn và văn phòng. Ruột đồng nguyên chất nhiều sợi bện chặt giúp giảm thiểu suy hao điện áp, đảm bảo an toàn tối đa cho các thiết bị công suất vừa và lớn.',
    specs: JSON.stringify({ 'Tiêu chuẩn': 'TCVN 6610 / IEC 60227', 'Điện áp': '450/750V', 'Ruột dẫn': 'Đồng ủ mềm 99.99%', 'Tiết diện': '2.5 mm²', 'Cách điện': 'PVC cao cấp', 'Xuất xứ': 'Cadivi Việt Nam' }),
    applications: '- Đi dây cấp nguồn cho hệ thống ổ cắm phòng khách, phòng ngủ, nhà bếp.\n- Cấp nguồn cho máy lạnh 1.5HP - 2HP, bình nước nóng gia đình.\n- Lắp đặt cho các tòa nhà căn hộ, biệt thự và nhà xưởng.',
    warranty_policy: '- Bảo hành chính hãng Cadivi 24 tháng.\n- Cam kết chất lượng chính hãng 100% kèm hóa đơn VAT.\n- Hỗ trợ đổi trả miễn phí trong vòng 7 ngày nếu chưa sử dụng.',
    is_new: 1,
    is_promo: 0
  },
  {
    category_id: 1,
    name: 'Dây điện đôi mềm Oval Cadivi VCmd 2x1.5 mm²',
    price: 14500,
    original_price: 16800,
    image: '/images/prod-soft-red.jpg',
    images: JSON.stringify(['/images/prod-soft-red.jpg', '/images/prod-cadivi-thumb-3.jpg']),
    short_desc: 'Dây đôi mềm dẹp Cadivi 2 lõi đồng bọc PVC, chuyên dùng cho thiết bị điện di động.\n- Lõi đồng bện nhiều sợi siêu mềm dẻo, dễ uốn nắn\n- Vỏ PVC màu đỏ hoặc trắng trang nhã, cách điện an toàn\n- Chịu uốn gập liên tục không đứt gãy',
    description: 'Dây điện đôi mềm dẹp Cadivi VCmd 2x1.5 mm² (300/500V) gồm 2 ruột dẫn bằng đồng ủ mềm xoắn nhiều sợi, cách điện và bọc vỏ nhựa PVC phẳng hình oval. Dây có độ mềm dẻo tuyệt vời, rất dễ uốn cong và đấu nối trong không gian hẹp.',
    specs: JSON.stringify({ 'Mã sản phẩm': 'VCmd 2x1.5', 'Điện áp': '300/500V', 'Ruột dẫn': '2 lõi đồng mềm nhiều sợi', 'Tiết diện danh định': '2 x 1.5 mm²', 'Màu vỏ': 'Đỏ / Trắng', 'Hãng sản xuất': 'Cadivi' }),
    applications: '- Làm dây nguồn cắm nối dài cho quạt điện, tivi, máy vi tính và thiết bị văn phòng.\n- Đấu nối đèn bàn, thiết bị chiếu sáng di động trang trí.\n- Dùng trong sửa chữa và lắp ráp thiết bị gia dụng trong nhà.',
    warranty_policy: '- Bảo hành chính hãng 12 tháng.\n- Đổi mới ngay lập tức nếu sản phẩm có lỗi từ nhà sản xuất.',
    is_new: 0,
    is_promo: 1
  },
  {
    category_id: 1,
    name: 'Dây điện đơn LS Vina 4.0 mm² ruột đồng cao cấp',
    price: 16200,
    original_price: 18500,
    image: '/images/prod-ls-yellow.jpg',
    images: JSON.stringify(['/images/prod-ls-yellow.jpg', '/images/prod-day-ls.svg']),
    short_desc: 'Dây điện công nghệ Hàn Quốc LS Vina 4.0mm² chịu tải cực khỏe, ít tỏa nhiệt.\n- Ruột đồng chất lượng cao theo tiêu chuẩn quốc tế KS/IEC\n- Cách điện PVC đặc biệt chống biến dạng khi quá tải nhẹ\n- Thích hợp cấp nguồn trục chính và bếp từ',
    description: 'Dây điện đơn LS-VINA 4.0mm² được chế tạo theo công nghệ hàng đầu của tập đoàn LS Hàn Quốc. Khả năng dẫn dòng lớn, tỷ lệ thất thoát điện cực thấp và lớp cách điện bền bỉ theo năm tháng.',
    specs: JSON.stringify({ 'Tiêu chuẩn': 'IEC 60227 / KS C 8305', 'Điện áp': '450/750V', 'Tiết diện': '4.0 mm²', 'Ruột dẫn': 'Đồng tinh chất', 'Thương hiệu': 'LS-VINA Cable' }),
    applications: '- Đi dây nguồn trục chính từ tủ tổng đến các tủ điện nhánh từng tầng.\n- Cấp nguồn riêng cho bếp từ đôi/ba, lò nướng và máy điều hòa trung tâm.\n- Thi công hệ thống điện cơ quan, xưởng gia công cơ khí nhẹ.',
    warranty_policy: '- Bảo hành chính hãng LS Vina 24 tháng.\n- Đầy đủ chứng chỉ kiểm định chất lượng xuất xưởng.',
    is_new: 0,
    is_promo: 0
  },

  // 2. Dây cáp điện (Cat 2)
  {
    category_id: 2,
    name: 'Cáp điện lực hạ thế Cadivi CXV 3x16 + 1x10 mm² (0.6/1kV)',
    price: 165000,
    original_price: 185000,
    image: '/images/prod-cap-cvv.svg',
    images: JSON.stringify(['/images/prod-cap-cvv.svg', '/images/prod-cvv-black.jpg']),
    short_desc: 'Cáp điện lực 4 lõi đồng hạ thế bọc XLPE/PVC chất lượng số 1 Việt Nam.\n- Cách điện XLPE chịu nhiệt độ ruột dẫn lên tới 90°C\n- Vỏ PVC đen bảo vệ cơ học và chống ẩm xuất sắc\n- Tiêu chuẩn TCVN 5935-1 / IEC 60502-1',
    description: 'Cáp điện lực hạ thế Cadivi CXV 3x16+1x10 mm² ruột đồng, cách điện XLPE, vỏ PVC dùng để truyền tải và phân phối điện áp 0.6/1kV. Cáp có đặc tính cách điện vượt trội, khả năng chịu quá tải cao và tuổi thọ trên 30 năm.',
    specs: JSON.stringify({ 'Tiêu chuẩn': 'TCVN 5935-1 / IEC 60502-1', 'Cấp điện áp': '0.6/1 kV', 'Số lõi': '4 lõi (3 pha + 1 trung tính)', 'Tiết diện': '3x16 + 1x10 mm²', 'Cách điện': 'XLPE', 'Vỏ ngoài': 'PVC màu đen' }),
    applications: '- Cáp ngầm hoặc cáp treo truyền tải điện từ trạm biến áp vào công trình.\n- Cấp nguồn tổng cho tòa nhà, chung cư, nhà máy và khu công nghiệp.\n- Phân phối điện động lực cho hệ thống tủ điện MSB, MDB.',
    warranty_policy: '- Bảo hành chính hãng Cadivi 36 tháng.\n- Đầy đủ chứng chỉ xuất xưởng CO, CQ và biên bản thử nghiệm cao thế.\n- Hỗ trợ kỹ thuật cắt chiều dài theo yêu cầu dự án.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 2,
    name: 'Cáp điện hạ thế Cadivi CVV 2x4.0 mm² ruột đồng bọc PVC',
    price: 38000,
    original_price: 42000,
    image: '/images/prod-cvv-black.jpg',
    images: JSON.stringify(['/images/prod-cvv-black.jpg', '/images/prod-cvv-blue.jpg']),
    short_desc: 'Cáp tròn 2 lõi bọc PVC/PVC chịu lực tốt, truyền tải điện an toàn.\n- Hai lõi đồng tròn bọc cách điện màu riêng biệt (Đỏ/Xanh)\n- Vỏ bọc ngoài PVC đen chống tia cực tím UV ngoài trời\n- Lắp đặt thuận tiện trong nhà và ngoài trời',
    description: 'Cáp điện lực hạ thế CVV 2x4.0 mm² Cadivi có 2 lớp vỏ bảo vệ PVC kép, chống trầy xước và va đập cơ học tốt khi luồn ống hoặc chôn ngầm nông. Ruột đồng tiêu chuẩn cho dòng tải ổn định.',
    specs: JSON.stringify({ 'Cấp điện áp': '0.6/1 kV', 'Số lõi': '2 lõi', 'Tiết diện': '2 x 4.0 mm²', 'Vật liệu': 'Cu / PVC / PVC', 'Hãng sản xuất': 'Cadivi' }),
    applications: '- Cấp nguồn kéo từ công tơ điện chính về tủ điện phân phối gia đình.\n- Cấp nguồn chiếu sáng sân vườn, đèn đường nội khu và cổng ngõ.\n- Đấu nối hệ thống máy bơm chìm, động cơ tưới tiêu nông nghiệp.',
    warranty_policy: '- Bảo hành 24 tháng theo chuẩn Cadivi.\n- Đổi trả linh hoạt trong 7 ngày nếu hàng còn nguyên cuộn.',
    is_new: 0,
    is_promo: 0
  },
  {
    category_id: 2,
    name: 'Cáp chống cháy Cadivi FR-CXV 2x2.5 mm² chịu nhiệt 950°C',
    price: 28500,
    original_price: 32000,
    image: '/images/prod-cvv-blue.jpg',
    images: JSON.stringify(['/images/prod-cvv-blue.jpg', '/images/prod-cadivi-big.jpg']),
    short_desc: 'Cáp chống cháy cao cấp ruột đồng có băng mica chịu nhiệt 950°C trong 3 giờ.\n- Duy trì nguồn điện khi có hỏa hoạn theo tiêu chuẩn BS 6387 CWZ\n- Vỏ bọc ít khói không độc hại LSHF an toàn tính mạng\n- Đáp ứng đầy đủ quy chuẩn PCCC hiện hành',
    description: 'Cáp chống cháy Cadivi FR-CXV được trang bị lớp băng Mica chịu nhiệt cao, kết hợp cách điện XLPE và vỏ bảo vệ chống bắt lửa. Trong điều kiện cháy 950°C, cáp vẫn duy trì dòng điện liên tục suốt 3 giờ để cung cấp cho hệ thống cứu hộ cứu nạn.',
    specs: JSON.stringify({ 'Tiêu chuẩn chống cháy': 'BS 6387 CWZ / IEC 60331', 'Điện áp': '0.6/1 kV', 'Nhiệt độ chịu lửa': '950°C trong 180 phút', 'Tiết diện': '2 x 2.5 mm²', 'Lớp bảo vệ': 'Băng Mica chống cháy + XLPE' }),
    applications: '- Cấp nguồn cho hệ thống báo cháy, chuông còi báo động khẩn cấp.\n- Nguồn cấp thang máy thoát hiểm, quạt hút khói sự cố và bơm cứu hỏa.\n- Hệ thống đèn chiếu sáng sự cố khẩn cấp và biển chỉ dẫn Exit.',
    warranty_policy: '- Bảo hành chính hãng Cadivi 36 tháng.\n- Cung cấp trọn bộ hồ sơ kiểm định PCCC của Cục Cảnh sát PCCC.',
    is_new: 1,
    is_promo: 0
  },

  // 3. Thiết bị điện (Cat 3)
  {
    category_id: 3,
    name: 'Aptomat tự động MCB Schneider Acti9 2P 32A 6kA (A9F74232)',
    price: 185000,
    original_price: 220000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-thiet-bi-dien.jpg']),
    short_desc: 'Cầu dao tự động Schneider Pháp bảo vệ quá tải và ngắn mạch cực nhạy.\n- Dòng cắt định mức 6kA độ bền điện cơ trên 20.000 lần\n- Cửa sổ chỉ thị trạng thái tiếp điểm VisiSafe màu đỏ/xanh\n- Nhựa chống cháy cao cấp, tiếp điểm mạ bạc chống dính',
    description: 'Aptomat MCB Schneider Acti9 iC60N 2P 32A 6kA là giải pháp bảo vệ an toàn hàng đầu thế giới cho hệ thống điện gia đình và công nghiệp. Sản phẩm sở hữu cơ chế dập hồ quang tiên tiến và công nghệ VisiTrip chỉ báo lỗi tức thì.',
    specs: JSON.stringify({ 'Thương hiệu': 'Schneider Electric (Pháp)', 'Mã sản phẩm': 'A9F74232', 'Số cực': '2P', 'Dòng định mức': '32A', 'Dòng cắt ngắn mạch': '6 kA', 'Điện áp': '230/400V AC' }),
    applications: '- Aptomat tổng phân nhánh cho từng tầng nhà ở, căn hộ hoặc văn phòng.\n- Đóng ngắt bảo vệ máy điều hòa công suất lớn, bếp từ, bình nóng lạnh.\n- Lắp đặt trong tủ điện phân phối dân dụng và công nghiệp nhẹ.',
    warranty_policy: '- Bảo hành chính hãng Schneider Electric 24 tháng.\n- 1 đổi 1 trong vòng 30 ngày nếu phát sinh lỗi kỹ thuật từ nhà sản xuất.\n- Hỗ trợ tư vấn thông số tải và kỹ thuật lắp đặt 24/7.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 3,
    name: 'Cầu dao chống giật RCBO Panasonic 2P 32A 30mA (BBDE23231CNV)',
    price: 520000,
    original_price: 590000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-thiet-bi-dien.jpg']),
    short_desc: 'Aptomat chống rò chống giật Panasonic chuẩn Nhật Bản bảo vệ tính mạng gia đình.\n- Tích hợp 3 trong 1: Chống rò điện 30mA, chống quá tải và ngắn mạch\n- Tự động ngắt cực nhanh chỉ trong 0.03 giây khi có dòng rò\n- Nút Test kiểm tra định kỳ tiện lợi, an toàn tuyệt đối',
    description: 'Cầu dao tự động chống rò và ngắn mạch RCBO Panasonic 2P 32A 30mA bảo vệ gia đình toàn diện khỏi các tai nạn giật điện nguy hiểm và sự cố chập cháy. Cơ cấu cảm biến dòng rò siêu nhạy ngắt nguồn trong tích tắc.',
    specs: JSON.stringify({ 'Thương hiệu': 'Panasonic (Nhật Bản)', 'Loại': 'RCBO (Chống giật + Quá tải)', 'Số cực': '2P (1P+N)', 'Dòng định mức': '32A', 'Dòng rò ngắt': '30mA', 'Thời gian ngắt': '< 0.03 giây' }),
    applications: '- Bảo vệ chống giật cho bình nóng lạnh, máy nước nóng trực tiếp phòng tắm.\n- Lắp đặt bảo vệ nhánh ổ cắm phòng trẻ em, phòng bếp và máy giặt.\n- Bảo vệ an toàn chống rò điện cho các thiết bị ngoài trời, hồ bơi.',
    warranty_policy: '- Bảo hành chính hãng Panasonic 24 tháng đổi mới hoàn toàn.\n- Đảm bảo độ chính xác dòng rò 30mA chuẩn an toàn sinh mạng quốc tế.',
    is_new: 1,
    is_promo: 0
  },
  {
    category_id: 3,
    name: 'Aptomat khối MCCB LS 3 Pha 100A 18kA (ABN103c 100A)',
    price: 980000,
    original_price: 1150000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-thiet-bi-dien.jpg']),
    short_desc: 'Aptomat khối MCCB LS công nghiệp Hàn Quốc, sức chịu tải mạnh mẽ.\n- Dòng định mức 100A 3 pha, dòng cắt ngắn mạch 18kA\n- Độ bền cơ học 25.000 lần đóng cắt tin cậy\n- Vỏ đúc Bakelite chịu lực và chịu nhiệt vượt trội',
    description: 'Aptomat khối MCCB LS ABN103c 100A 3P 18kA được thiết kế chuyên dụng cho các tủ điện phân phối tổng công nghiệp, nhà xưởng và tòa nhà thương mại. Thiết kế vỏ đúc chắc chắn, vận hành ổn định trong môi trường khắc nghiệt.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'LS Electric (Hàn Quốc)', 'Model': 'ABN103c 100A', 'Số cực': '3 Pha (3P)', 'Dòng định mức In': '100A', 'Dòng cắt Icu': '18kA tại 380/415V', 'Tiêu chuẩn': 'IEC 60947-2' }),
    applications: '- Cầu dao tổng cho nhà xưởng sản xuất, cơ sở kinh doanh, nhà máy chế biến.\n- Lắp đặt trong tủ phân phối chính MSB cấp nguồn cho hệ thống máy móc 3 pha.\n- Đóng cắt phân phối cho tòa nhà văn phòng, nhà hàng, khách sạn lớn.',
    warranty_policy: '- Bảo hành chính hãng LS Electric 18 tháng.\n- Đầy đủ giấy tờ chứng nhận xuất xứ CO và chứng nhận chất lượng CQ.',
    is_new: 0,
    is_promo: 1
  },
  {
    category_id: 3,
    name: 'Khởi động từ Contactor Schneider LC1D25M7 3P 25A 220V',
    price: 430000,
    original_price: 490000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-thiet-bi-dien.jpg']),
    short_desc: 'Contactor Schneider TeSys D điều khiển động cơ và chiếu sáng tự động.\n- Cuộn hút 220VAC hoạt động êm ái, tiếp điểm bạc chống hồ quang\n- Tích hợp sẵn 1NO + 1NC phụ trợ\n- Dễ dàng kết nối rơ le nhiệt và timer hẹn giờ',
    description: 'Khởi động từ Contactor Schneider LC1D25M7 (TeSys Deca) 3P 25A là thiết bị điều khiển từ xa đáng tin cậy nhất cho các tải động cơ và hệ thống chiếu sáng công suất cao. Tiếp điểm hợp kim bạc độ bền điện cao.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'Schneider Electric', 'Dòng định mức (AC-3)': '25A', 'Công suất động cơ': '11 kW (380V)', 'Điện áp cuộn coil': '220V AC 50/60Hz', 'Tiếp điểm phụ': '1 NO + 1 NC' }),
    applications: '- Điều khiển khởi động và bảo vệ động cơ bơm nước công nghiệp, quạt thông gió.\n- Tự động hóa hệ thống chiếu sáng công cộng, biển quảng cáo ngoài trời.\n- Đấu nối tủ điều khiển máy nén khí, hệ thống sấy và máy công cụ.',
    warranty_policy: '- Bảo hành chính hãng Schneider 24 tháng.\n- 1 đổi 1 trong 15 ngày nếu cuộn coil phát sinh lỗi.',
    is_new: 0,
    is_promo: 0
  },

  // 4. Ổ cắm, công tắc (Cat 4)
  {
    category_id: 4,
    name: 'Bộ công tắc đơn 1 chiều Schneider AvatarOn màu trắng viền mạ',
    price: 68000,
    original_price: 82000,
    image: '/images/prod-cong-tac-don.jpg',
    images: JSON.stringify(['/images/prod-cong-tac-don.jpg', '/images/prod-o-cam-doi.jpg']),
    short_desc: 'Công tắc thiết kế tràn viền phẳng hiện đại phong cách châu Âu.\n- Công nghệ bấm êm ái không gây ồn, độ bền trên 40.000 lần nhấn\n- Mặt phủ bóng chống bám vân tay và chống ố vàng theo thời gian\n- Đèn LED hắt sáng định vị trong đêm sang trọng',
    description: 'Dòng sản phẩm AvatarOn của Schneider Electric mang tính đột phá với thiết kế tràn viền phẳng hoàn toàn, thao tác nhấn cực êm và có thể thay đổi mặt che theo phong cách nội thất cá nhân. Đạt giải thưởng thiết kế quốc tế iF Design Award.',
    specs: JSON.stringify({ 'Thương hiệu': 'Schneider Electric', 'Dòng sản phẩm': 'AvatarOn', 'Màu sắc': 'Trắng bóng (White)', 'Dòng định mức': '16AX 250VAC', 'Độ bền': '40.000 lần bật/tắt', 'Chất liệu': 'Nhựa Polycarbonate cao cấp' }),
    applications: '- Lắp đặt điều khiển đèn cho biệt thự, căn hộ cao cấp, khách sạn và resort.\n- Thi công hệ thống điện âm tường cho văn phòng hiện đại.\n- Thay thế nâng cấp mặt công tắc cũ để tạo vẻ đẹp sang trọng cho ngôi nhà.',
    warranty_policy: '- Bảo hành chính hãng Schneider 10 năm về cơ cấu cơ học.\n- Đổi mới nếu công tắc bị kẹt hạt hoặc gãy chốt trong quá trình sử dụng.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 4,
    name: 'Bộ ổ cắm đôi 3 chấu có màn che an toàn Panasonic Wide Series',
    price: 92000,
    original_price: 110000,
    image: '/images/prod-o-cam-doi.jpg',
    images: JSON.stringify(['/images/prod-o-cam-doi.jpg', '/images/prod-cong-tac-don.jpg']),
    short_desc: 'Ổ cắm đôi 3 chấu Panasonic chuẩn Universal cắm chắc chắn không lỏng lẻo.\n- Màng che bảo vệ chống trẻ nhỏ chọc que vào lỗ điện\n- Chân kẹp đồng đàn hồi cao su đúc nguyên khối chịu tải 16A\n- Nhựa Urea Resin chống cháy nổ tuyệt đối',
    description: 'Ổ cắm đôi 3 chấu có màn che an toàn Panasonic Wide Series (WEV1582-7SW) được tin dùng hàng đầu nhờ độ bền tiếp điểm phi thường. Khả năng giữ phích cắm chặt chẽ, không phát sinh tia lửa điện khi cắm hoặc rút thiết bị công suất lớn.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'Panasonic', 'Dòng sản phẩm': 'Wide Series', 'Số cổng cắm': '2 cổng 3 chấu đa năng', 'Dòng định mức': '16A - 250V', 'Tính năng an toàn': 'Màn che chống giật Shutter', 'Chất liệu': 'Nhựa Urea Resin chống cháy' }),
    applications: '- Hệ thống ổ cắm điện đa năng cho phòng khách, phòng ngủ, phòng làm việc.\n- Cắm các thiết bị công suất cao: Lò nướng, lò vi sóng, bếp điện, nồi chiên.\n- Tương thích tốt với tất cả phích cắm 2 chấu tròn, 2 chấu dẹt và 3 chấu chuẩn Mỹ/Âu/Á.',
    warranty_policy: '- Bảo hành chính hãng Panasonic 24 tháng.\n- Đổi mới trong 7 ngày nếu lỗi chân kẹp tiếp xúc.',
    is_new: 0,
    is_promo: 0
  },
  {
    category_id: 4,
    name: 'Mặt 3 thiết bị kèm 3 công tắc Sino Vanlock S18',
    price: 42000,
    original_price: 50000,
    image: '/images/prod-cong-tac-don.jpg',
    images: JSON.stringify(['/images/prod-cong-tac-don.jpg', '/images/prod-o-cam-doi.jpg']),
    short_desc: 'Bộ công tắc Sino dòng S18 bền bỉ quốc dân, giá thành kinh tế.\n- Hạt công tắc hạt tròn tiếp điểm bạc bật tắt dứt khoát\n- Khung xương kim loại chống cong vênh khi bắt vít vào đế âm\n- Lựa chọn hàng đầu cho các công trình nhà ở và phòng trọ',
    description: 'Bộ mặt 3 công tắc 1 chiều Sino S18 là sản phẩm phổ biến nhất thị trường xây dựng Việt Nam. Với giá thành hợp lý, độ bền bỉ cao và dễ dàng lắp đặt, sản phẩm luôn là sự lựa chọn tối ưu cho các dự án xây dựng dân dụng.',
    specs: JSON.stringify({ 'Thương hiệu': 'Sino - Vanlock', 'Dòng sản phẩm': 'Series S18', 'Cấu hình': 'Mặt 3 lỗ + 3 hạt công tắc 1 chiều', 'Dòng tải': '10A - 250V', 'Xuất xứ': 'Việt Nam' }),
    applications: '- Điều khiển 3 cụm đèn chiếu sáng độc lập trong phòng khách hoặc hành lang.\n- Thi công nhà phố, chung cư bình dân, dãy phòng trọ cho thuê.\n- Thích hợp lắp đặt trên mọi loại đế âm chữ nhật Sino chuẩn.',
    warranty_policy: '- Bảo hành chính hãng Sino 12 tháng.\n- Đổi trả linh hoạt trong 7 ngày.',
    is_new: 0,
    is_promo: 0
  },

  // 5. Phụ kiện điện (Cat 5)
  {
    category_id: 5,
    name: 'Ống luồn dây điện PVC chống cháy Sino Nanoco D20 (Cây 2.92m)',
    price: 25000,
    original_price: 30000,
    image: '/images/prod-ong-luon-pvc.jpg',
    images: JSON.stringify(['/images/prod-ong-luon-pvc.jpg', '/images/prod-mang-cap.svg']),
    short_desc: 'Ống nhựa tròn luồn dây điện cứng chống cháy, chịu lực nén 750N.\n- Chống dập vỡ khi chôn âm tường bê tông hoặc đổ sàn\n- Khả năng tự dập tắt lửa khi nguồn nhiệt rời xa\n- Bề mặt trơn láng kéo dây điện dễ dàng không xước vỏ',
    description: 'Ống luồn dây điện PVC cứng Sino Nanoco D20 (đường kính ngoài 20mm) được sản xuất từ nhựa PVC cao cấp pha phụ gia chống cháy và chống gặm nhấm. Chịu được lực nén cao đến 750N, uốn cong bằng lò xo dễ dàng mà không bị gãy dập.',
    specs: JSON.stringify({ 'Thương hiệu': 'Sino Nanoco', 'Đường kính ngoài': '20 mm (D20)', 'Chiều dài': '2.92 mét/cây', 'Lực nén định mức': '750 N', 'Khả năng chịu nhiệt': '-5°C đến 60°C', 'Chống cháy': 'Tự tắt lửa trong 30 giây' }),
    applications: '- Luồn bảo vệ dây điện chôn âm sàn bê tông, âm tường gạch xây.\n- Đi nổi trên trần thạch cao, tầng hầm để xe và nhà xưởng.\n- Kết hợp cùng các phụ kiện cút nối, tê chia ngả và kẹp đỡ ống D20 đồng bộ.',
    warranty_policy: '- Bảo hành chất lượng vật liệu 24 tháng.\n- Đổi trả nếu ống bị biến dạng nứt gãy trong quá trình giao nhận.',
    is_new: 0,
    is_promo: 1
  },
  {
    category_id: 5,
    name: 'Máng cáp tôn mạ kẽm nhúng nóng 100x50x1.2mm (Cây 2.5m)',
    price: 115000,
    original_price: 135000,
    image: '/images/prod-mang-cap.svg',
    images: JSON.stringify(['/images/prod-mang-cap.svg', '/images/prod-ong-luon-pvc.jpg']),
    short_desc: 'Máng dẫn cáp điện Trunking tôn mạ kẽm dày 1.2mm chịu tải trọng lớn.\n- Bề mặt mạ kẽm chống gỉ sét, chống ăn mòn môi trường\n- Kèm nắp máng bảo vệ ngăn bụi bẩn và côn trùng cắn phá dây\n- Đột lỗ tiếp địa và bắt nối gia cố vững chắc',
    description: 'Máng cáp điện (Cable Trunking) kích thước 100x50mm độ dày 1.2mm chế tạo từ tôn mạ kẽm chất lượng cao. Giúp nâng đỡ và sắp xếp gọn gàng số lượng lớn dây cáp điện trục chính trong công trình.',
    specs: JSON.stringify({ 'Quy cách': 'Rộng 100mm x Cao 50mm', 'Độ dày tôn': '1.2 mm', 'Chiều dài tiêu chuẩn': '2.5 mét/cây', 'Vật liệu': 'Tôn tráng kẽm nhúng nóng', 'Bao gồm': 'Thân máng + Nắp máng + Bulong nối' }),
    applications: '- Đỡ và gom gọn toàn bộ hệ thống cáp điện trục đứng trong tòa nhà cao tầng.\n- Đi cáp treo trần trong siêu thị, trung tâm thương mại và nhà xưởng may.\n- Đảm bảo an toàn kỹ thuật, phòng chống chuột bọ và tăng tính thẩm mỹ.',
    warranty_policy: '- Bảo hành vật liệu 36 tháng không bong tróc lớp mạ kẽm.\n- Đầy đủ giấy chứng nhận xuất xưởng của đơn vị gia công cơ khí.',
    is_new: 1,
    is_promo: 0
  },
  {
    category_id: 5,
    name: 'Tủ điện âm tường chứa 4-8 Aptomat Sino E4FC',
    price: 95000,
    original_price: 115000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-phu-kien-dien.jpg']),
    short_desc: 'Tủ điện âm tường Sino mặt nhựa cao cấp nắp che trong suốt khói mờ.\n- Đế sắt dập sơn tĩnh điện chống rỉ, gắn thanh ray cài MCB chuẩn Din-rail\n- Chứa vừa từ 4 đến 8 module aptomat đơn\n- Thiết kế phẳng ôm sát mặt tường tinh tế',
    description: 'Hộp chứa cầu dao tủ điện âm tường Sino E4FC nắp mở 180 độ màu trà trong suốt giúp dễ dàng quan sát tình trạng các aptomat bên trong. Thiết kế thẩm mỹ, viền vát cạnh trang nhã phù hợp với mọi không gian phòng ở.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'Sino Electric', 'Mã hiệu': 'E4FC 4/8L', 'Sức chứa': '4 đến 8 cực (module) MCB', 'Kiểu lắp': 'Âm tường', 'Vật liệu': 'Mặt nhựa ABS + Đế sắt sơn tĩnh điện' }),
    applications: '- Làm tủ điện phân phối cho từng tầng nhà phố, từng phòng căn hộ chung cư.\n- Bảo vệ tập trung các aptomat nguồn, aptomat đèn và điều hòa.\n- Dễ dàng thao tác mở nắp kiểm tra hoặc bật tắt cầu dao an toàn.',
    warranty_policy: '- Bảo hành chính hãng 12 tháng.\n- Đổi mới nếu đế tủ bị móp méo hoặc nứt vỡ nắp che.',
    is_new: 0,
    is_promo: 0
  },

  // 6. Đèn chiếu sáng (Cat 6)
  {
    category_id: 6,
    name: 'Máng đèn LED tuýp T8 1.2m 18W Điện Việt ánh sáng trắng 6500K',
    price: 85000,
    original_price: 105000,
    image: '/images/prod-den-led-tuyp.jpg',
    images: JSON.stringify(['/images/prod-den-led-tuyp.jpg', '/images/prod-den-led-a60.jpg']),
    short_desc: 'Máng đèn LED tuýp T8 1.2m 18W sáng rực rỡ, góc chiếu rộng cho văn phòng và nhà xưởng.\n- Chip LED SMD 2835 siêu sáng, khởi động tức thì không nhấp nháy\n- Thân máng nhôm tản nhiệt nhanh, chóa nhựa tán quang chống chói mắt\n- Tiết kiệm 60% điện năng so với bóng huỳnh quang cũ',
    description: 'Bộ máng đèn LED tuýp T8 nhôm Điện Việt chiều dài 1.2m công suất 18W là giải pháp chiếu sáng hiện đại, tiết kiệm điện năng tối đa. Đèn khởi động tức thì không cần tắc te chấn lưu, ánh sáng phân bố đều và êm dịu cho thị giác.',
    specs: JSON.stringify({ 'Công suất': '18W', 'Chiều dài': '1.2 mét (1200mm)', 'Chip LED': 'SMD 2835 siêu sáng', 'Vật liệu': 'Máng nhôm tản nhiệt + Nắp mica tán quang', 'Quang thông': '1900 Lm', 'Bảo hành': '24 tháng đổi mới' }),
    applications: '- Chiếu sáng phòng khách, phòng làm việc, trường học, bệnh viện.\n- Lắp đặt cho xưởng may, xưởng cơ khí, kho bãi lưu trữ hàng hóa.\n- Thay thế hoàn hảo các bộ máng đèn huỳnh quang 36W truyền thống.',
    warranty_policy: '- Bảo hành chính hãng 24 tháng đổi mới.\n- 1 đổi 1 tận nơi nếu bóng bị suy giảm độ sáng bất thường hoặc cháy nguồn driver.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 6,
    name: 'Đèn LED Downlight âm trần Rạng Đông 9W đổi 3 màu (D AT04L 90/9W)',
    price: 110000,
    original_price: 135000,
    image: '/images/prod-den-led-a60.jpg',
    images: JSON.stringify(['/images/prod-den-led-a60.jpg', '/images/prod-den-led-tuyp.jpg']),
    short_desc: 'Đèn âm trần Rạng Đông 3 chế độ màu (Trắng / Vàng / Trung tính) chuyển đổi bằng công tắc.\n- Chip LED Samsung thế hệ mới độ bền 30.000 giờ chiếu sáng\n- Chỉ số hoàn màu CRI > 80 cho màu sắc vật thể trung thực\n- Thân vỏ nhôm đúc tản nhiệt cực êm, lỗ khoét trần tiêu chuẩn 90mm',
    description: 'Đèn LED Downlight đổi màu âm trần Rạng Đông D AT04L 90/9W cho phép thay đổi 3 màu ánh sáng linh hoạt: Trắng 6500K sảng khoái, Vàng 3000K ấm cúng và Trung tính 4000K tự nhiên. Sử dụng chip LED Samsung cao cấp.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'Rạng Đông', 'Model': 'D AT04L ĐM 90/9W', 'Công suất': '9W', 'Lỗ khoét trần': 'Phi 90 mm', 'Nhiệt độ màu': 'Đổi 3 màu (3000K/4000K/6500K)', 'Tuổi thọ': '30.000 giờ' }),
    applications: '- Lắp âm trần thạch cao phòng khách, phòng ngủ, phòng ăn gia đình hiện đại.\n- Trang trí showroom, shop thời trang, quán cafe, khách sạn.\n- Đổi màu ánh sáng linh hoạt tùy theo thời điểm và nhu cầu sinh hoạt.',
    warranty_policy: '- Bảo hành chính hãng Rạng Đông 24 tháng.\n- Đổi mới trực tiếp trong vòng 7 ngày.',
    is_new: 1,
    is_promo: 0
  },
  {
    category_id: 6,
    name: 'Bóng đèn LED Bulb trụ nhôm đúc 30W Điện Việt chống nước bụi IP65',
    price: 75000,
    original_price: 95000,
    image: '/images/prod-den-led-a60.jpg',
    images: JSON.stringify(['/images/prod-den-led-a60.jpg', '/images/prod-den-led-tuyp.jpg']),
    short_desc: 'Bóng đèn búp trụ công suất cao 30W đui xoáy E27 thông dụng, quang thông 3000Lm.\n- Bầu bóng nhựa PC xuyên sáng 92%, góc chiếu rộng 270 độ\n- Đế nhôm nguyên khối đúc cánh tản nhiệt sâu tăng tuổi thọ linh kiện\n- Chống côn trùng bay vào và chống bụi ẩm hiệu quả',
    description: 'Bóng đèn LED búp trụ nhôm đúc 30W Điện Việt mang lại nguồn sáng cực mạnh với góc chiếu rộng 270°. Thiết kế kín khít đạt chuẩn IP65 giúp ngăn bụi, ẩm và côn trùng xâm nhập.',
    specs: JSON.stringify({ 'Công suất': '30W', 'Đui đèn': 'E27 tiêu chuẩn xoắn vặn', 'Quang thông': '3000 Lm', 'Cấp bảo vệ': 'IP65', 'Điện áp': '160 - 240V', 'Vật liệu': 'Nhôm đúc nguyên khối + Nhựa PC' }),
    applications: '- Chiếu sáng sân vườn, cổng ngõ, khu vực ban công ngoài trời.\n- Lắp đặt trong nhà kho, xưởng mộc, gara ô tô, chuồng trại nông nghiệp.\n- Chiếu sáng quầy hàng chợ đêm, ki-ốt bán hàng ngoài trời.',
    warranty_policy: '- Bảo hành chính hãng 12 tháng đổi mới 1-1.',
    is_new: 0,
    is_promo: 0
  }
];;

    for (const prod of sampleProducts) {
      const slug = prod.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await run(`
        INSERT INTO products (
          category_id, name, slug, price, original_price, image, images,
          short_desc, description, specs, applications, warranty_policy, is_new, is_promo, stock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `, [
        prod.category_id,
        prod.name,
        slug,
        prod.price,
        prod.original_price,
        prod.image,
        prod.images,
        prod.short_desc,
        prod.description,
        prod.specs,
        prod.applications,
        prod.warranty_policy,
        prod.is_new,
        prod.is_promo
      ]);
    }
    console.log('Đã tạo 20 sản phẩm mẫu chuẩn Điện Việt thành công!');
  }

  // 5. Blog mẫu (Blogs)
  const blogCount = await get('SELECT COUNT(*) as count FROM blogs');
  if (blogCount.count === 0) {
    const sampleBlogs = [
      {
        title: 'Xu Hướng Tai Nghe Không Dây Chống Ồn Chủ Động Trong Năm 2026',
        summary: 'Khám phá sự bùng nổ của trí tuệ nhân tạo tích hợp trong chip xử lý âm thanh, giúp lọc ồn thông minh theo ngữ cảnh môi trường sống.',
        content: '<p>Trong kỷ nguyên công nghệ hiện đại, tai nghe chống ồn chủ động (ANC) không chỉ đơn thuần là triệt tiêu tiếng ồn máy bay hay tiếng tàu xe, mà đã thông minh hơn nhờ sự hỗ trợ của thuật toán AI thời gian thực.</p><p>Các mẫu tai nghe thế hệ mới có thể phân biệt chính xác giọng nói của người đối diện để kích hoạt chế độ xuyên âm tự động, cũng như tùy biến áp suất âm phù hợp với thính lực của từng cá nhân.</p>',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        author: 'Nguyễn Minh Tuấn'
      },
      {
        title: 'Top 5 Tiêu Chí Chọn Mua Đồng Hồ Thông Minh Cho Người Yêu Thể Thao',
        summary: 'Độ chính xác cảm biến GPS, thời lượng pin thực tế và khả năng kháng nước chuẩn 5ATM là những yếu tố tiên quyết cần cân nhắc.',
        content: '<p>Một chiếc Smartwatch thể thao tốt không chỉ là món phụ kiện thời trang bắt mắt mà còn là một huấn luyện viên ảo đắc lực trên cổ tay của bạn.</p><p>Khi lựa chọn, người dùng nên chú trọng vào: Hệ thống định vị đa vệ tinh (GPS, GLONASS, Galileo), màn hình hiển thị rõ nét dưới trời nắng gắt và cảm biến đo chỉ số phục hồi cơ bắp HRV.</p>',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        author: 'Trần Hải Đăng'
      },
      {
        title: 'Cách Tối Ưu Bàn Làm Việc Đạt Chuẩn Công Thái Học Giảm Đau Lưng Cổ',
        summary: 'Bí quyết setup bàn làm việc tối giản, khoa học kết hợp ghế công thái học, bàn phím cơ và giá đỡ màn hình chuẩn khoa học.',
        content: '<p>Ngồi làm việc liên tục 8-10 tiếng mỗi ngày trước máy tính là nguyên nhân hàng đầu dẫn đến các bệnh về cột sống và hội chứng ống cổ tay.</p><p>Bằng cách điều chỉnh tầm mắt vuông góc với 1/3 trên của màn hình, sử dụng chuột nghiêng 57 độ và bàn phím cơ đệm tay, bạn sẽ giảm tải đáng kể căng thẳng lên các nhóm cơ.</p>',
        image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80',
        author: 'Lê Hoàng Yến'
      }
    ];

    for (const blog of sampleBlogs) {
      const slug = blog.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await run(
        'INSERT INTO blogs (title, slug, summary, content, image, author) VALUES (?, ?, ?, ?, ?, ?)',
        [blog.title, slug, blog.summary, blog.content, blog.image, blog.author]
      );
    }
    console.log('Đã tạo các bài viết blog mẫu thành công!');
  }

  // 6. Liên hệ mẫu (Contacts)
  const contactCount = await get('SELECT COUNT(*) as count FROM contacts');
  if (contactCount.count === 0) {
    const sampleContacts = [
      {
        fullname: 'Nguyễn Văn Hùng',
        phone: '0912.345.678',
        email: 'hung.nguyen@vietcorp.com',
        type: 'Báo giá',
        message: 'Tôi muốn nhận báo giá sỉ cho 20 bộ bàn phím cơ RED-Knight và 20 chuột ErgoMaster Pro cho văn phòng công ty tại TP.HCM. Xin vui lòng gửi bảng giá chiết khấu.',
        status: 'Mới'
      },
      {
        fullname: 'Trần Thị Thu Thảo',
        phone: '0908.776.543',
        email: 'thuthao92@gmail.com',
        type: 'Khiếu nại',
        message: 'Đơn hàng tai nghe RED-ANC Pro Ultra của tôi nhận sáng nay bị móp hộp bên ngoài do vận chuyển. Nhờ trung tâm hỗ trợ đổi sản phẩm mới giúp tôi.',
        status: 'Mới'
      },
      {
        fullname: 'Phạm Minh Đức',
        phone: '0977.888.999',
        email: 'ducpm.tech@gmail.com',
        type: 'Báo giá',
        message: 'Bên mình có nhu cầu lắp đặt hệ thống 5 máy lọc không khí PureAir X5 cho showroom. Xin tư vấn chi phí và chính sách bảo hành doanh nghiệp.',
        status: 'Đã xử lý'
      }
    ];

    for (const c of sampleContacts) {
      await run(
        'INSERT INTO contacts (fullname, phone, email, type, message, status) VALUES (?, ?, ?, ?, ?, ?)',
        [c.fullname, c.phone, c.email, c.type, c.message, c.status]
      );
    }
    console.log('Đã tạo liên hệ mẫu thành công!');
  }
};

async function syncStoreData({ customCategories, customProducts, deletedCategoryIds, deletedProductIds, customBlogs, deletedBlogIds }) {
  let updated = false;

  // 1. Categories
  if (Array.isArray(customCategories) && customCategories.length > 0) {
    for (const cat of customCategories) {
      const exist = fallbackData.categories.find(c => String(c.id) === String(cat.id));
      if (!exist) {
        fallbackData.categories.push(cat);
        updated = true;
      } else {
        Object.assign(exist, cat);
        updated = true;
      }

      if (!useFallback && db) {
        try {
          db.run(
            `INSERT OR REPLACE INTO categories (id, name, slug, description, image, show_in_slider, sort_order, parent_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [cat.id, cat.name, cat.slug || '', cat.description || '', cat.image || '', cat.show_in_slider ? 1 : 0, cat.sort_order || 0, cat.parent_id || null, cat.created_at || new Date().toISOString()]
          );
        } catch (e) {}
      }
    }
  }

  // 2. Deleted Categories
  if (Array.isArray(deletedCategoryIds) && deletedCategoryIds.length > 0) {
    const before = fallbackData.categories.length;
    fallbackData.categories = fallbackData.categories.filter(c => !deletedCategoryIds.includes(Number(c.id)) && !deletedCategoryIds.includes(String(c.id)));
    if (fallbackData.categories.length !== before) updated = true;

    if (!useFallback && db) {
      try {
        deletedCategoryIds.forEach(id => db.run(`DELETE FROM categories WHERE id = ?`, [id]));
      } catch (e) {}
    }
  }

  // 3. Products
  if (Array.isArray(customProducts) && customProducts.length > 0) {
    for (const prod of customProducts) {
      const exist = fallbackData.products.find(p => String(p.id) === String(prod.id));
      if (!exist) {
        fallbackData.products.unshift(prod);
        updated = true;
      } else {
        Object.assign(exist, prod);
        updated = true;
      }

      if (!useFallback && db) {
        try {
          db.run(
            `INSERT OR REPLACE INTO products (id, category_id, name, slug, price, original_price, image, images, short_desc, description, specs, applications, warranty_policy, is_new, is_promo, is_active, stock, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              prod.id,
              prod.category_id || null,
              prod.name,
              prod.slug || '',
              prod.price || 0,
              prod.original_price || null,
              prod.image || '',
              typeof prod.images === 'object' ? JSON.stringify(prod.images) : (prod.images || ''),
              prod.short_desc || '',
              prod.description || '',
              typeof prod.specs === 'object' ? JSON.stringify(prod.specs) : (prod.specs || ''),
              prod.applications || '',
              prod.warranty_policy || '',
              prod.is_new ? 1 : 0,
              prod.is_promo ? 1 : 0,
              prod.is_active !== undefined ? (prod.is_active ? 1 : 0) : 1,
              prod.stock || null,
              prod.created_at || new Date().toISOString()
            ]
          );
        } catch (e) {}
      }
    }
  }

  // 4. Deleted Products
  if (Array.isArray(deletedProductIds) && deletedProductIds.length > 0) {
    const before = fallbackData.products.length;
    fallbackData.products = fallbackData.products.filter(p => !deletedProductIds.includes(Number(p.id)) && !deletedProductIds.includes(String(p.id)));
    if (fallbackData.products.length !== before) updated = true;

    if (!useFallback && db) {
      try {
        deletedProductIds.forEach(id => db.run(`DELETE FROM products WHERE id = ?`, [id]));
      } catch (e) {}
    }
  }

  // 5. Blogs
  if (Array.isArray(customBlogs) && customBlogs.length > 0) {
    for (const blog of customBlogs) {
      const exist = fallbackData.blogs.find(b => String(b.id) === String(blog.id));
      if (!exist) {
        fallbackData.blogs.unshift(blog);
        updated = true;
      } else {
        Object.assign(exist, blog);
        updated = true;
      }

      if (!useFallback && db) {
        try {
          db.run(
            `INSERT OR REPLACE INTO blogs (id, title, slug, summary, content, image, author, category, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              blog.id,
              blog.title,
              blog.slug || '',
              blog.summary || '',
              blog.content || '',
              blog.image || '',
              blog.author || 'Điện Việt',
              blog.category || 'Tin công ty',
              blog.created_at || new Date().toISOString()
            ]
          );
        } catch (e) {}
      }
    }
  }

  // 6. Deleted Blogs
  if (Array.isArray(deletedBlogIds) && deletedBlogIds.length > 0) {
    const before = fallbackData.blogs.length;
    fallbackData.blogs = fallbackData.blogs.filter(b => !deletedBlogIds.includes(Number(b.id)) && !deletedBlogIds.includes(String(b.id)));
    if (fallbackData.blogs.length !== before) updated = true;

    if (!useFallback && db) {
      try {
        deletedBlogIds.forEach(id => db.run(`DELETE FROM blogs WHERE id = ?`, [id]));
      } catch (e) {}
    }
  }

  if (updated) {
    saveFallbackData();
  }

  return { success: true };
}

module.exports = {
  db,
  query,
  get,
  run,
  hashPassword,
  initDB,
  syncStoreData,
  fallbackData,
  saveFallbackData
};

