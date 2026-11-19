// ========================================================
// JAVASCRIPT: HỆ THỐNG QUẢN TRỊ ADMIN CMS (ADMIN.JS)
// ========================================================

const token = localStorage.getItem('admin_token');

// Helper Headers có Bearer Token
function getAuthHeaders(contentType = 'application/json') {
  const currentToken = localStorage.getItem('admin_token') || token;
  const headers = {
    'Authorization': `Bearer ${currentToken}`
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

// ========================================================
// QUẢN LÝ DỮ LIỆU ĐỒNG BỘ LOCALSTORAGE & SERVER
// Giúp dữ liệu tạo/sửa luôn được bảo toàn 100% khi F5 hoặc Ctrl+Shift+R
// ========================================================
const LOCAL_STORAGE_KEYS = {
  CATEGORIES: 'dienviet_persistent_categories',
  DELETED_CAT_IDS: 'dienviet_deleted_cat_ids',
  PRODUCTS: 'dienviet_persistent_products',
  DELETED_PROD_IDS: 'dienviet_deleted_prod_ids',
  BLOGS: 'dienviet_persistent_blogs',
  DELETED_BLOG_IDS: 'dienviet_deleted_blog_ids',
  CONTACTS: 'dienviet_persistent_contacts',
  DELETED_CONTACT_IDS: 'dienviet_deleted_contact_ids',
  SETTINGS: 'dienviet_persistent_settings'
};

function getLocalStore(key, defaultVal = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setLocalStore(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

async function syncLocalStoreToServer() {
  const customCategories = getLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES);
  const deletedCategoryIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CAT_IDS);
  const customProducts = getLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS);
  const deletedProductIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_PROD_IDS);
  const customBlogs = getLocalStore(LOCAL_STORAGE_KEYS.BLOGS);
  const deletedBlogIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_BLOG_IDS);
  const customContacts = getLocalStore(LOCAL_STORAGE_KEYS.CONTACTS);
  const deletedContactIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CONTACT_IDS);
  const customSettings = getLocalStore(LOCAL_STORAGE_KEYS.SETTINGS, {});

  if (customCategories.length === 0 && customProducts.length === 0 &&
      deletedCategoryIds.length === 0 && deletedProductIds.length === 0 &&
      customBlogs.length === 0 && deletedBlogIds.length === 0 &&
      customContacts.length === 0 && deletedContactIds.length === 0 &&
      Object.keys(customSettings).length === 0) {
    return;
  }

  try {
    await fetch('/api/admin/sync-store', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        customCategories,
        deletedCategoryIds,
        customProducts,
        deletedProductIds,
        customBlogs,
        deletedBlogIds,
        customContacts,
        deletedContactIds,
        customSettings
      })
    });
  } catch (e) {
    console.warn('Lưu ý syncLocalStoreToServer:', e);
  }
}

// Format VNĐ
function formatVND(val) {
  const n = Number(val) || 0;
  return new Intl.NumberFormat('vi-VN').format(n);
}

// Helper Escape HTML tránh XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toast Thông Báo (Hiển thị phía trên và chính giữa trang)
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  let icon = 'fa-circle-check text-emerald-500';
  if (type === 'error') icon = 'fa-circle-xmark text-red-500';
  else if (type === 'warning') icon = 'fa-triangle-exclamation text-amber-500';
  else if (type === 'info') icon = 'fa-circle-info text-blue-500';

  toast.innerHTML = `
    <i class="fa-solid ${icon} text-lg shrink-0"></i>
    <span class="flex-1 font-bold text-xs sm:text-sm text-slate-800">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px) scale(0.95)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// State lưu danh sách tạm
let categoriesCache = [];
let productsCache = [];
let contactsCache = [];
let websiteSettingsCache = null;
let currentContactTypeFilter = 'all';
let currentContactStatusFilter = 'all';

// ========================================================
// 1. KIỂM TRA PHIÊN XÁC THỰC KHI KHỞI ĐỘNG
// ========================================================
document.addEventListener('DOMContentLoaded', async () => {
  const currentFullUrl = window.location.pathname + window.location.search + window.location.hash;
  if (!token) {
    window.location.href = '/login?redirect=' + encodeURIComponent(currentFullUrl);
    return;
  }

  try {
    const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login?redirect=' + encodeURIComponent(currentFullUrl);
      return;
    }

    if (data.user) {
      const nameEl = document.getElementById('admin-fullname');
      if (nameEl) nameEl.textContent = data.user.fullname || data.user.username;
    }
  } catch (err) {
    window.location.href = '/login';
    return;
  }

  // Tự động đồng bộ dữ liệu bền vững từ LocalStorage lên máy chủ ngay khi tải trang
  try {
    await syncLocalStoreToServer();
  } catch (e) {}

  // Kiểm tra tham số URL để mở trực tiếp tab tương ứng (VD: /admin?tab=contacts hoặc /admin#contacts)
  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get('tab') || window.location.hash.replace('#', '');
  if (targetTab && ['dashboard', 'categories', 'products', 'blogs', 'contacts', 'settings'].includes(targetTab)) {
    switchTab(targetTab);
  } else {
    loadDashboard();
  }
  loadSettings();
  ensureProductsLoaded();
  ensureCategoriesLoaded();

  // Lắng nghe sự kiện storage để đồng bộ tức thì giữa các tab khi khách hàng gửi liên hệ ở tab khác
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_STORAGE_KEYS.CONTACTS) {
      loadContacts();
      loadDashboard();
    }
  });

  // Lắng nghe khi chuyển tab hoặc focus vào trang Admin để tự động làm mới danh sách liên hệ
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadContacts();
      loadDashboard();
    }
  });

  window.addEventListener('focus', () => {
    loadContacts();
    loadDashboard();
  });

  // BroadcastChannel kết nối tức thì 0ms giữa Client (Landing/Contact) và Admin
  try {
    const contactSyncChannel = new BroadcastChannel('dienviet_contact_sync');
    contactSyncChannel.onmessage = (event) => {
      if (event.data && (event.data.type === 'NEW_CONTACT' || event.data.type === 'SYNC_CONTACTS')) {
        loadContacts();
        loadDashboard();
      }
    };
  } catch (e) {}

  // Setup sidebar mobile toggle
  const toggleBtn = document.getElementById('toggle-sidebar-btn');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
      sidebar.classList.toggle('absolute');
    });
  }

  // Setup các form sự kiện
  setupForms();
});

// Đăng xuất Admin
async function logoutAdmin() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?')) {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
    } catch (e) {}
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/login';
  }
}

// ========================================================
// 2. CHUYỂN ĐỔI TAB GIAO DIỆN
// ========================================================
function switchTab(tabId) {
  // Ẩn tất cả tab
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(el => {
    el.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-slate-600 hover:text-brand-600 hover:bg-red-50 transition nav-item';
  });

  // Hiện tab được chọn
  const activeSection = document.getElementById(`tab-${tabId}`);
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeSection) activeSection.classList.remove('hidden');
  if (activeNav) {
    activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition nav-item active bg-brand-600 text-white shadow-sm shadow-red-200';
  }

  // Cập nhật Page Title
  const titles = {
    dashboard: 'Tổng Quan Dashboard',
    categories: 'Quản Lý Danh Mục Sản Phẩm',
    products: 'Quản Lý Danh Sách Sản Phẩm',
    blogs: 'Quản Lý Tin Tức & Blog',
    contacts: 'Quản Lý Liên hệ',
    settings: 'Cấu Hình Thông Tin Hệ Thống'
  };
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = titles[tabId] || 'Quản Trị';

  // Tải dữ liệu tương ứng
  if (tabId === 'dashboard') loadDashboard();
  if (tabId === 'categories') loadCategories();
  if (tabId === 'products') { loadCategoriesForDropdown(); loadProducts(); }
  if (tabId === 'blogs') loadBlogs();
  if (tabId === 'contacts') loadContacts();
  if (tabId === 'settings') loadSettings();
}

// ========================================================
// 3. TAB 1: TỔNG QUAN DASHBOARD & HELPER PHÂN LOẠI LIÊN HỆ
// ========================================================

/**
 * Cấu hình màu sắc, icon và badge riêng biệt cho từng loại liên hệ
 * Đảm bảo mỗi phân loại mang một màu nhận diện trực quan khác nhau
 */
function getContactTypeBadgeConfig(rawType) {
  const type = (rawType || '').trim();
  const lower = type.toLowerCase();

  // 1. Báo giá sản phẩm -> Màu Xanh Dương (Blue)
  if (lower.includes('báo giá') || lower.includes('bao gia') || lower.includes('báo gia')) {
    return {
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'fa-solid fa-file-invoice',
      label: type || 'Báo giá sản phẩm',
      cardBg: 'bg-blue-50/70 border border-blue-200',
      textColor: 'text-blue-700'
    };
  }

  // 2. Tư vấn kỹ thuật -> Màu Tím (Purple / Violet)
  if (lower.includes('kỹ thuật') || lower.includes('ky thuat') || lower.includes('tư vấn') || lower.includes('tu van')) {
    return {
      classes: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: 'fa-solid fa-screwdriver-wrench',
      label: type || 'Tư vấn kỹ thuật',
      cardBg: 'bg-purple-50/70 border border-purple-200',
      textColor: 'text-purple-700'
    };
  }

  // 3. Đổi trả / Bảo hành -> Màu Xanh Ngọc Lục Bảo (Emerald)
  if (lower.includes('đổi trả') || lower.includes('doi tra') || lower.includes('bảo hành') || lower.includes('bao hanh')) {
    return {
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: 'fa-solid fa-rotate-left',
      label: type || 'Đổi trả',
      cardBg: 'bg-emerald-50/70 border border-emerald-200',
      textColor: 'text-emerald-700'
    };
  }

  // 4. Hủy đơn -> Màu Hổ Phách / Cam Đậm (Amber / Orange)
  if (lower.includes('hủy đơn') || lower.includes('huy don') || lower.includes('hủy') || lower.includes('huy')) {
    return {
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: 'fa-solid fa-ban',
      label: type || 'Hủy đơn',
      cardBg: 'bg-amber-50/70 border border-amber-200',
      textColor: 'text-amber-800'
    };
  }

  // 5. Góp ý / Khiếu nại -> Màu Đỏ / Hồng Đào (Rose / Red)
  if (lower.includes('khiếu nại') || lower.includes('khieu nai') || lower.includes('góp ý') || lower.includes('gop y')) {
    return {
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: 'fa-solid fa-triangle-exclamation',
      label: type || 'Góp ý / Khiếu nại',
      cardBg: 'bg-rose-50/70 border border-rose-200',
      textColor: 'text-rose-700'
    };
  }

  // 6. Các loại tự tạo khác: Luân phiên theo bảng màu phong phú (Teal, Cyan, Indigo, Fuchsia, Sky)
  const palettes = [
    { classes: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'fa-solid fa-headset', cardBg: 'bg-teal-50/70 border border-teal-200', textColor: 'text-teal-700' },
    { classes: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: 'fa-solid fa-comment-dots', cardBg: 'bg-cyan-50/70 border border-cyan-200', textColor: 'text-cyan-700' },
    { classes: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'fa-solid fa-circle-info', cardBg: 'bg-indigo-50/70 border border-indigo-200', textColor: 'text-indigo-700' },
    { classes: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', icon: 'fa-solid fa-envelope', cardBg: 'bg-fuchsia-50/70 border border-fuchsia-200', textColor: 'text-fuchsia-700' },
    { classes: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'fa-solid fa-bell', cardBg: 'bg-sky-50/70 border border-sky-200', textColor: 'text-sky-700' }
  ];
  let hash = 0;
  for (let i = 0; i < lower.length; i++) hash = (hash * 31 + lower.charCodeAt(i)) & 0xffffffff;
  const picked = palettes[Math.abs(hash) % palettes.length];
  return {
    classes: picked.classes,
    icon: picked.icon,
    label: type || 'Liên hệ',
    cardBg: picked.cardBg,
    textColor: picked.textColor
  };
}

function renderContactTypeBadge(type, isSmall = false) {
  const cfg = getContactTypeBadgeConfig(type);
  if (isSmall) {
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.classes}">
      <i class="${cfg.icon} mr-1 text-[9px]"></i> ${escapeHtml(cfg.label)}
    </span>`;
  }
  return `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${cfg.classes}">
    <i class="${cfg.icon} mr-1.5 text-xs"></i> <span>${escapeHtml(cfg.label)}</span>
  </span>`;
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard', { headers: getAuthHeaders() });
    const result = await res.json();
    if (!result.success) return;

    const s = result.stats;
    document.getElementById('stat-products').textContent = s.totalProducts || 0;
    document.getElementById('stat-categories').textContent = s.totalCategories || 0;
    document.getElementById('stat-quotes').textContent = s.quoteContacts || 0;
    document.getElementById('stat-complaints').textContent = s.complaintContacts || 0;

    // Cập nhật badge tin nhắn mới
    const badge = document.getElementById('badge-new-contacts');
    if (badge) {
      const localContacts = getLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, []);
      const localNewCount = localContacts.filter(c => c.status === 'Mới').length;
      const count = Math.max(Number(s.newContacts) || 0, localNewCount);
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    // Đồng bộ danh bạ gần đây vào contactsCache để mở xem chi tiết trực tiếp
    if (Array.isArray(result.recentContacts)) {
      if (!Array.isArray(contactsCache)) contactsCache = [];
      result.recentContacts.forEach(rc => {
        if (!contactsCache.some(x => x.id === rc.id)) {
          contactsCache.push(rc);
        }
      });
    }

    // Render danh sách gần đây
    const tbody = document.getElementById('dashboard-recent-contacts');
    if (tbody && result.recentContacts) {
      if (result.recentContacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">Chưa có liên hệ nào gần đây.</td></tr>`;
        return;
      }

      tbody.innerHTML = result.recentContacts.map(c => {
        const typeBadgeHtml = renderContactTypeBadge(c.type, true);

        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-6 font-bold text-slate-900">${escapeHtml(c.fullname)}</td>
            <td class="py-3 px-6 font-mono text-slate-600">${escapeHtml(c.phone)}</td>
            <td class="py-3 px-6">
              ${typeBadgeHtml}
            </td>
            <td class="py-3 px-6">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${c.status === 'Mới' ? 'bg-amber-100 text-amber-800' : (c.status === 'Đang xử lý' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800')}">
                ${escapeHtml(c.status)}
              </span>
            </td>
            <td class="py-3 px-6 text-slate-400">${new Date(c.created_at).toLocaleString('vi-VN')}</td>
            <td class="py-3 px-6 text-right">
              <button onclick="viewContactDetail(${c.id})" class="text-brand-600 hover:text-brand-800 font-bold cursor-pointer">
                Xem
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Lỗi khi tải dashboard:', err);
  }
}

// ========================================================
// 4. TAB 2: QUẢN LÝ LOẠI SẢN PHẨM (DANH MỤC)
// ========================================================
// Cấu hình phân trang Admin (Mặc định 10 mục / trang theo yêu cầu)
const ADMIN_PAGE_SIZE = 10;
let categoriesPage = 1;
let productsPage = 1;
let blogsPage = 1;
let contactsPage = 1;
let currentAdminProductsList = [];
let currentAdminBlogsList = [];

// Hàm render thanh phân trang dùng chung cho các bảng Admin
function renderAdminPagination(containerId, currentPage, totalItems, pageSize, onPageChangeName) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalItems === 0) {
    container.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  let buttonsHtml = '';

  // Nút Trang trước (Previous)
  if (currentPage > 1) {
    buttonsHtml += `
      <button type="button" onclick="${onPageChangeName}(${currentPage - 1})" class="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#c8102e] hover:text-[#c8102e] font-bold text-xs transition flex items-center justify-center cursor-pointer shadow-2xs" title="Trang trước">
        <i class="fa-solid fa-chevron-left text-[10px]"></i>
      </button>
    `;
  } else {
    buttonsHtml += `
      <button type="button" disabled class="w-8 h-8 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 font-bold text-xs flex items-center justify-center cursor-not-allowed">
        <i class="fa-solid fa-chevron-left text-[10px]"></i>
      </button>
    `;
  }

  // Danh sách các số trang
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === currentPage;
    buttonsHtml += `
      <button type="button" onclick="${onPageChangeName}(${i})" class="w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer shadow-2xs ${
        isActive 
          ? 'bg-brand-600 text-white shadow-xs' 
          : 'bg-white border border-slate-200 hover:border-[#c8102e] hover:text-[#c8102e] text-slate-700'
      }">
        ${i}
      </button>
    `;
  }

  // Nút Trang tiếp (Next)
  if (currentPage < totalPages) {
    buttonsHtml += `
      <button type="button" onclick="${onPageChangeName}(${currentPage + 1})" class="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#c8102e] hover:text-[#c8102e] font-bold text-xs transition flex items-center justify-center cursor-pointer shadow-2xs" title="Trang tiếp">
        <i class="fa-solid fa-chevron-right text-[10px]"></i>
      </button>
    `;
  } else {
    buttonsHtml += `
      <button type="button" disabled class="w-8 h-8 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 font-bold text-xs flex items-center justify-center cursor-not-allowed">
        <i class="fa-solid fa-chevron-right text-[10px]"></i>
      </button>
    `;
  }

  container.innerHTML = `
    <div class="font-medium text-slate-500">
      Hiển thị <span class="font-bold text-slate-800">${startIdx} - ${endIdx}</span> trên <span class="font-bold text-slate-800">${totalItems}</span> mục (Trang ${currentPage}/${totalPages})
    </div>
    <div class="flex items-center space-x-1.5">
      ${buttonsHtml}
    </div>
  `;
}

window.changeCategoriesPage = function(page) {
  categoriesPage = page;
  loadCategories();
};

let adminExpandedCats = new Set(); // Mặc định không tự mở danh mục con nào

async function loadCategories() {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400"><i class="fa-solid fa-spinner fa-spin text-lg text-brand-600"></i> Đang tải danh mục...</td></tr>`;

  try {
    const res = await fetch('/api/admin/categories', { headers: getAuthHeaders() });
    const result = await res.json();
    if (!result.success) return;

    let serverCats = result.data || [];
    const localCats = getLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES);
    const delCatIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CAT_IDS);

    // Lọc bỏ các ID đã bị xóa
    serverCats = serverCats.filter(c => !delCatIds.includes(Number(c.id)) && !delCatIds.includes(String(c.id)));

    // Hợp nhất các danh mục từ LocalStorage nếu server chưa có
    let needsSync = false;
    localCats.forEach(lc => {
      if (delCatIds.includes(Number(lc.id)) || delCatIds.includes(String(lc.id))) return;
      const exist = serverCats.find(sc => String(sc.id) === String(lc.id));
      if (!exist) {
        serverCats.push(lc);
        needsSync = true;
      } else {
        // Đồng bộ trạng thái mới nhất từ server vào localCats
        if (exist.show_in_slider !== undefined) {
          lc.show_in_slider = (exist.show_in_slider === 0 || exist.show_in_slider === '0' || exist.show_in_slider === false) ? 0 : 1;
        }
        if (exist.image && !lc.image) {
          lc.image = exist.image;
        }
        Object.assign(exist, lc);
        exist.show_in_slider = (exist.show_in_slider === 0 || exist.show_in_slider === '0' || exist.show_in_slider === false) ? 0 : 1;
      }
    });
    setLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES, localCats);

    categoriesCache = serverCats;

    if (needsSync || delCatIds.length > 0) {
      syncLocalStoreToServer();
    }

    if (categoriesCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!</td></tr>`;
      renderAdminPagination('categories-pagination', 1, 0, ADMIN_PAGE_SIZE, 'changeCategoriesPage');
      return;
    }

    const parents = categoriesCache.filter(c => !c.parent_id);
    const totalParents = parents.length;
    const totalPages = Math.ceil(totalParents / ADMIN_PAGE_SIZE) || 1;
    if (categoriesPage > totalPages) categoriesPage = totalPages;
    if (categoriesPage < 1) categoriesPage = 1;
    const pagedParents = parents.slice((categoriesPage - 1) * ADMIN_PAGE_SIZE, categoriesPage * ADMIN_PAGE_SIZE);

    let html = '';

    pagedParents.forEach(parent => {
      const children = categoriesCache.filter(c => String(c.parent_id) === String(parent.id));
      const hasChildren = children.length > 0;
      const isExpanded = adminExpandedCats.has(String(parent.id));

      // Tổng số sản phẩm cha = sản phẩm trực tiếp của cha + tổng số sản phẩm của các danh mục con (Hình 1)
      const childrenProductCount = children.reduce((sum, ch) => sum + (Number(ch.product_count) || 0), 0);
      const totalParentProducts = Math.max(Number(parent.product_count) || 0, childrenProductCount);

      // Hàng Danh Mục Cha
      html += `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 bg-white" id="cat-row-${parent.id}">
          <!-- Cột 1: HÌNH ẢNH (Di chuyển nút mũi tên show danh mục con ra trước hình ảnh theo yêu cầu 2) -->
          <td class="py-3.5 px-6">
            <div class="flex items-center space-x-2.5">
              ${hasChildren ? `
                <button type="button" onclick="toggleCollapseCategory(${parent.id})" class="w-6 h-6 rounded-lg bg-red-50 text-[#c8102e] hover:bg-red-100 flex items-center justify-center transition shrink-0" title="Thu gọn / Mở rộng danh mục con">
                  <i id="cat-toggle-icon-${parent.id}" class="fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-xs transition duration-200"></i>
                </button>
              ` : `
                <span class="w-6 h-6 inline-block shrink-0"></span>
              `}
              <img src="${parent.image || '/images/hd/cat-day-dien.jpg'}" 
                   alt="${parent.name}" 
                   class="w-12 h-12 rounded-xl object-contain border border-slate-200 p-1 bg-slate-50 shadow-2xs shrink-0"
                   onerror="this.onerror=null; this.src='/images/hd/cat-day-dien.jpg';">
            </div>
          </td>

          <!-- Cột 2: TÊN DANH MỤC (Ẩn icon thư mục và ẩn /slug theo yêu cầu 3) -->
          <td class="py-3.5 px-6">
            <div class="flex items-center space-x-1.5">
              <span class="font-normal text-slate-800 text-sm">${parent.name}</span>
              ${hasChildren ? `<span class="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">${children.length} con</span>` : ''}
            </div>
          </td>

          <td class="py-3.5 px-6 text-slate-500 max-w-xs truncate">${parent.description || '<span class="italic text-slate-300">Không có mô tả</span>'}</td>
          
          <!-- Cột 4: HIỂN THỊ (Chỉ hiển thị text Bật hoặc Tắt theo yêu cầu 1) -->
          <td class="py-3.5 px-6 text-center">
            <button onclick="toggleCategorySlider(${parent.id})" class="px-3 py-1 rounded-full text-[11px] font-bold transition inline-flex items-center justify-center space-x-1 ${parent.show_in_slider ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}" title="Nhấn để Bật / Tắt hiển thị trên trang chủ">
              <i class="fa-solid ${parent.show_in_slider ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark'}"></i>
              <span>${parent.show_in_slider ? 'Bật' : 'Tắt'}</span>
            </button>
          </td>

          <td class="py-3.5 px-6 text-center">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
              ${totalParentProducts} sản phẩm
            </span>
          </td>

          <!-- Cột 6: THAO TÁC (Căn giữa, thẳng hàng với text THAO TÁC theo yêu cầu 4) -->
          <td class="py-3.5 px-6 text-center whitespace-nowrap">
            <div class="inline-flex items-center justify-center space-x-1.5">
              <!-- Nút Thêm Danh Mục Con -->
              <button onclick="openCategoryModal(null, ${parent.id})" class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 transition" title="Thêm danh mục con vào ${parent.name}">
                <i class="fa-solid fa-folder-plus text-sm"></i>
              </button>
              <button onclick="editCategory(${parent.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-red-50 transition" title="Chỉnh sửa">
                <i class="fa-solid fa-pen-to-square text-sm"></i>
              </button>
              <button onclick="deleteCategory(${parent.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition" title="Xóa">
                <i class="fa-solid fa-trash-can text-sm"></i>
              </button>
            </div>
          </td>
        </tr>
      `;

      // Các Hàng Danh Mục Con (Mặc định ẩn, khi user bấm mũi tên mới show)
      children.forEach(child => {
        html += `
          <tr class="subcat-row-${parent.id} ${isExpanded ? '' : 'hidden'} bg-[#fdfaf8] hover:bg-amber-50/50 transition border-b border-slate-100/80">
            <!-- Cột 1: HÌNH ẢNH (Thụt lề ngang bằng với ảnh cha) -->
            <td class="py-2.5 px-6">
              <div class="flex items-center space-x-2.5 pl-8 sm:pl-9">
                <img src="${child.image || '/images/hd/cat-day-dien.jpg'}" 
                     alt="${child.name}" 
                     class="w-9 h-9 rounded-lg object-contain border border-amber-200/80 p-0.5 bg-white shadow-2xs shrink-0"
                     onerror="this.onerror=null; this.src='/images/hd/cat-day-dien.jpg';">
              </div>
            </td>

            <!-- Cột 2: TÊN DANH MỤC CON (Đã ẩn icon và text Con) -->
            <td class="py-2.5 px-6">
              <span class="font-normal text-slate-700 text-xs sm:text-[13px]">${child.name}</span>
            </td>

            <td class="py-2.5 px-6 text-slate-500 max-w-xs truncate text-[11px]">${child.description || '<span class="italic text-slate-300">Không có mô tả</span>'}</td>
            
            <!-- Cột 4: HIỂN THỊ (Chỉ hiển thị text Bật hoặc Tắt theo yêu cầu 1) -->
            <td class="py-2.5 px-6 text-center">
              <button onclick="toggleCategorySlider(${child.id})" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold transition inline-flex items-center justify-center space-x-1 ${child.show_in_slider ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}" title="Nhấn để Bật / Tắt hiển thị">
                <i class="fa-solid ${child.show_in_slider ? 'fa-check' : 'fa-xmark'}"></i>
                <span>${child.show_in_slider ? 'Bật' : 'Tắt'}</span>
              </button>
            </td>

            <td class="py-2.5 px-6 text-center">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                ${child.product_count || 0} SP
              </span>
            </td>

            <!-- Cột 6: THAO TÁC (Thẳng hàng với cột cha) -->
            <td class="py-2.5 px-6 text-center whitespace-nowrap">
              <div class="inline-flex items-center justify-center space-x-1.5">
                <span class="w-[26px] inline-block"></span>
                <button onclick="editCategory(${child.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-red-50 transition" title="Chỉnh sửa danh mục con">
                  <i class="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button onclick="deleteCategory(${child.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Xóa danh mục con">
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    });

    tbody.innerHTML = html;
    renderAdminPagination('categories-pagination', categoriesPage, totalParents, ADMIN_PAGE_SIZE, 'changeCategoriesPage');
  } catch (err) {
    console.error('Lỗi khi tải danh mục:', err);
  }
}

// Thu gọn / hiển thị danh mục con (Khi user bấm mũi tên mới show)
function toggleCollapseCategory(parentId) {
  const strId = String(parentId);
  const rows = document.querySelectorAll(`.subcat-row-${parentId}`);
  const icon = document.getElementById(`cat-toggle-icon-${parentId}`);
  if (!rows || rows.length === 0) return;

  const willBeExpanded = !adminExpandedCats.has(strId);
  if (willBeExpanded) {
    adminExpandedCats.add(strId);
    rows.forEach(r => r.classList.remove('hidden'));
    if (icon) icon.className = 'fa-solid fa-chevron-down text-xs transition duration-200';
  } else {
    adminExpandedCats.delete(strId);
    rows.forEach(r => r.classList.add('hidden'));
    if (icon) icon.className = 'fa-solid fa-chevron-right text-xs transition duration-200';
  }
}

// Bật/tắt nhanh hiển thị ở Slider 3s Trang chủ & Danh mục sản phẩm
async function toggleCategorySlider(catId) {
  try {
    const res = await fetch(`/api/admin/categories/${catId}/toggle-slider`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');

      const newStatus = (result.show_in_slider !== undefined && result.show_in_slider !== null) ? Number(result.show_in_slider) : 0;
      
      // 1. Cập nhật cache giao diện admin
      if (Array.isArray(categoriesCache)) {
        const found = categoriesCache.find(x => String(x.id) === String(catId));
        if (found) found.show_in_slider = newStatus;
      }

      // 2. Cập nhật LocalStorage
      const localCats = getLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES);
      const lCat = localCats.find(x => String(x.id) === String(catId));
      if (lCat) {
        lCat.show_in_slider = newStatus;
      } else {
        const found = categoriesCache.find(x => String(x.id) === String(catId));
        if (found) localCats.push({ ...found, show_in_slider: newStatus });
      }
      setLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES, localCats);

      // 3. Đồng bộ lên Serverless Store
      await syncLocalStoreToServer();

      loadCategories();
    } else {
      showToast(result.message || 'Lỗi khi cập nhật slider!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ!', 'error');
  }
}



function openCategoryModal(cat = null, defaultParentId = null) {
  const modal = document.getElementById('category-modal');
  const title = document.getElementById('category-modal-title');
  const idInput = document.getElementById('cat-id');
  const parentGroup = document.getElementById('cat-parent-group');
  const parentSelect = document.getElementById('cat-parent-id');
  const nameInput = document.getElementById('cat-name');
  const descInput = document.getElementById('cat-desc');
  const imgInput = document.getElementById('cat-image');
  const sliderInput = document.getElementById('cat-slider');

  // Nạp danh sách danh mục cha vào select (Ẩn icon trước tên danh mục cha theo yêu cầu 6)
  if (parentSelect) {
    const parentCats = categoriesCache.filter(c => !c.parent_id && (!cat || String(c.id) !== String(cat.id)));
    parentSelect.innerHTML = `<option value="">-- Chọn danh mục cha --</option>` +
      parentCats.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  if (cat) {
    title.textContent = 'Chỉnh Sửa Danh Mục';
    idInput.value = cat.id;
    nameInput.value = cat.name;
    descInput.value = cat.description || '';
    imgInput.value = cat.image || '';
    sliderInput.checked = cat.show_in_slider === 1;

    const catPreview = document.getElementById('cat-image-preview');
    if (catPreview) {
      catPreview.src = cat.image || '/images/hd/cat-day-dien.jpg';
    }

    // Nếu sửa danh mục con, hiển thị ô chọn cha. Nếu sửa danh mục gốc, ẩn đi
    if (cat.parent_id) {
      if (parentGroup) parentGroup.classList.remove('hidden');
      if (parentSelect) parentSelect.value = String(cat.parent_id);
    } else {
      if (parentGroup) parentGroup.classList.add('hidden');
      if (parentSelect) parentSelect.value = '';
    }
  } else if (defaultParentId !== null && defaultParentId !== undefined) {
    // Tạo danh mục con từ nút thao tác -> HIỆN trường chọn Danh mục cha (Yêu cầu 5)
    title.textContent = 'Thêm Danh Mục Con';
    idInput.value = '';
    if (parentGroup) parentGroup.classList.remove('hidden');
    // Tự động chọn danh mục cha tương ứng
    if (parentSelect) parentSelect.value = String(defaultParentId);
    nameInput.value = '';
    descInput.value = '';
    imgInput.value = '';
    sliderInput.checked = true;

    const catPreview = document.getElementById('cat-image-preview');
    if (catPreview) {
      catPreview.src = '/images/hd/cat-day-dien.jpg';
    }
  } else {
    // Tạo danh mục mới gốc -> ẨN trường chọn Danh mục cha (Yêu cầu 5)
    title.textContent = 'Thêm Danh Mục Mới';
    idInput.value = '';
    if (parentGroup) parentGroup.classList.add('hidden');
    if (parentSelect) parentSelect.value = '';
    nameInput.value = '';
    descInput.value = '';
    imgInput.value = '';
    sliderInput.checked = true;

    const catPreview = document.getElementById('cat-image-preview');
    if (catPreview) {
      catPreview.src = '/images/hd/cat-day-dien.jpg';
    }
  }

  modal.classList.add('active');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.remove('active');
}

function updateCatImagePreview(val) {
  const prev = document.getElementById('cat-image-preview');
  if (prev) {
    prev.src = val ? val.trim() : '/images/hd/cat-day-dien.jpg';
  }
}
window.updateCatImagePreview = updateCatImagePreview;

function editCategory(id) {
  const cat = categoriesCache.find(c => c.id === id);
  if (cat) openCategoryModal(cat);
}

async function deleteCategory(id) {
  if (confirm('Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm thuộc danh mục sẽ không bị xóa.')) {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message, 'success');

        const localCats = getLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES).filter(c => String(c.id) !== String(id));
        setLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES, localCats);

        const delCatIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CAT_IDS);
        if (!delCatIds.includes(Number(id))) delCatIds.push(Number(id));
        setLocalStore(LOCAL_STORAGE_KEYS.DELETED_CAT_IDS, delCatIds);

        loadCategories();
      } else {
        showToast(result.message, 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối!', 'error');
    }
  }
}

// Helper tạo HTML các option danh mục theo phân cấp cha/con (optgroup) chuẩn như tạo sản phẩm
function buildCategoryDropdownHtml(includeAllOption = false, allLabel = '-- Tất cả danh mục --') {
  if (!Array.isArray(categoriesCache) || categoriesCache.length === 0) return '';
  const parents = categoriesCache.filter(c => !c.parent_id);
  let html = includeAllOption ? `<option value="all">${allLabel}</option>` : '';
  parents.forEach(p => {
    const children = categoriesCache.filter(c => String(c.parent_id) === String(p.id));
    if (children.length > 0) {
      html += `<optgroup label="${escapeHtml(p.name)}">`;
      children.forEach(ch => {
        html += `<option value="${ch.id}">${escapeHtml(ch.name)}</option>`;
      });
      html += `</optgroup>`;
    } else {
      html += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
    }
  });
  return html;
}

// 5. TAB 3: QUẢN LÝ SẢN PHẨM - HỖ TRỢ CHỌN CẢ DANH MỤC CHA VÀ DANH MỤC CON (Yêu cầu 12)
async function loadCategoriesForDropdown() {
  const select = document.getElementById('prod-cat');
  const filterSelect = document.getElementById('admin-product-cat-filter');
  const priceCatSelect = document.getElementById('price-config-category-id');

  try {
    const res = await fetch('/api/admin/categories', { headers: getAuthHeaders() });
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      let serverCats = result.data || [];
    const localCats = getLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES);
    const delCatIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CAT_IDS);

    // Lọc bỏ các ID đã bị xóa
    serverCats = serverCats.filter(c => !delCatIds.includes(Number(c.id)) && !delCatIds.includes(String(c.id)));

    // Hợp nhất các danh mục từ LocalStorage nếu server chưa có
    let needsSync = false;
    localCats.forEach(lc => {
      if (delCatIds.includes(Number(lc.id)) || delCatIds.includes(String(lc.id))) return;
      const exist = serverCats.find(sc => String(sc.id) === String(lc.id));
      if (!exist) {
        serverCats.push(lc);
        needsSync = true;
      } else {
        // Đồng bộ trạng thái mới nhất từ server vào localCats
        if (exist.show_in_slider !== undefined) {
          lc.show_in_slider = (exist.show_in_slider === 0 || exist.show_in_slider === '0' || exist.show_in_slider === false) ? 0 : 1;
        }
        if (exist.image && !lc.image) {
          lc.image = exist.image;
        }
        Object.assign(exist, lc);
        exist.show_in_slider = (exist.show_in_slider === 0 || exist.show_in_slider === '0' || exist.show_in_slider === false) ? 0 : 1;
      }
    });
    setLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES, localCats);

    categoriesCache = serverCats;

    if (needsSync || delCatIds.length > 0) {
      syncLocalStoreToServer();
    }
      
      const optHtml = buildCategoryDropdownHtml(false);
      if (select) select.innerHTML = optHtml;

      if (filterSelect) {
        filterSelect.innerHTML = buildCategoryDropdownHtml(true, '-- Tất cả danh mục --');
      }

      if (priceCatSelect) {
        priceCatSelect.innerHTML = buildCategoryDropdownHtml(true, '-- Tất cả sản phẩm --');
      }
    }
  } catch (err) {
    console.error('Lỗi nạp categories dropdown:', err);
  }
}

async function loadProducts() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400"><i class="fa-solid fa-spinner fa-spin text-lg text-brand-600"></i> Đang tải sản phẩm...</td></tr>`;

  try {
    const res = await fetch('/api/admin/products', { headers: getAuthHeaders() });
    const result = await res.json();
    if (!result.success) return;

    let serverProds = result.data || [];
    const localProds = getLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS);
    const delProdIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_PROD_IDS);

    serverProds = serverProds.filter(p => !delProdIds.includes(Number(p.id)) && !delProdIds.includes(String(p.id)));

    let needsSync = false;
    localProds.forEach(lp => {
      if (delProdIds.includes(Number(lp.id)) || delProdIds.includes(String(lp.id))) return;
      const exist = serverProds.find(sp => String(sp.id) === String(lp.id));
      if (!exist) {
        serverProds.unshift(lp);
        needsSync = true;
      } else {
        Object.assign(exist, lp);
      }
    });

    productsCache = serverProds;
    renderProductsTable(productsCache);

    if (needsSync || delProdIds.length > 0) {
      syncLocalStoreToServer();
    }
  } catch (err) {
    console.error('Lỗi khi tải sản phẩm:', err);
  }
}

async function ensureProductsLoaded() {
  if (Array.isArray(productsCache) && productsCache.length > 0) return productsCache;
  try {
    const res = await fetch('/api/admin/products', { headers: getAuthHeaders() });
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      let serverProds = result.data || [];
      const localProds = getLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS);
      const delProdIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_PROD_IDS);

      serverProds = serverProds.filter(p => !delProdIds.includes(Number(p.id)) && !delProdIds.includes(String(p.id)));

      localProds.forEach(lp => {
        if (delProdIds.includes(Number(lp.id)) || delProdIds.includes(String(lp.id))) return;
        const exist = serverProds.find(sp => String(sp.id) === String(lp.id));
        if (!exist) {
          serverProds.unshift(lp);
        } else {
          Object.assign(exist, lp);
        }
      });
      productsCache = serverProds;
    }
  } catch (e) {
    console.error('Lỗi nạp sản phẩm:', e);
  }
  return productsCache || [];
}

async function ensureCategoriesLoaded() {
  if (Array.isArray(categoriesCache) && categoriesCache.length > 0) return categoriesCache;
  try {
    const res = await fetch('/api/admin/categories', { headers: getAuthHeaders() });
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      let serverCats = result.data || [];
    const localCats = getLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES);
    const delCatIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CAT_IDS);

    // Lọc bỏ các ID đã bị xóa
    serverCats = serverCats.filter(c => !delCatIds.includes(Number(c.id)) && !delCatIds.includes(String(c.id)));

    // Hợp nhất các danh mục từ LocalStorage nếu server chưa có
    let needsSync = false;
    localCats.forEach(lc => {
      if (delCatIds.includes(Number(lc.id)) || delCatIds.includes(String(lc.id))) return;
      const exist = serverCats.find(sc => String(sc.id) === String(lc.id));
      if (!exist) {
        serverCats.push(lc);
        needsSync = true;
      } else {
        // Đồng bộ trạng thái mới nhất từ server vào localCats
        if (exist.show_in_slider !== undefined) {
          lc.show_in_slider = (exist.show_in_slider === 0 || exist.show_in_slider === '0' || exist.show_in_slider === false) ? 0 : 1;
        }
        if (exist.image && !lc.image) {
          lc.image = exist.image;
        }
        Object.assign(exist, lc);
        exist.show_in_slider = (exist.show_in_slider === 0 || exist.show_in_slider === '0' || exist.show_in_slider === false) ? 0 : 1;
      }
    });
    setLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES, localCats);

    categoriesCache = serverCats;

    if (needsSync || delCatIds.length > 0) {
      syncLocalStoreToServer();
    }
    }
  } catch (e) {
    console.error('Lỗi nạp danh mục:', e);
  }
  return categoriesCache || [];
}

window.changeProductsPage = function(page) {
  productsPage = page;
  renderProductsTable(currentAdminProductsList);
};

function renderProductsTable(products) {
  currentAdminProductsList = products || productsCache;
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  if (!currentAdminProductsList || currentAdminProductsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Không có sản phẩm nào.</td></tr>`;
    renderAdminPagination('products-pagination', 1, 0, ADMIN_PAGE_SIZE, 'changeProductsPage');
    return;
  }

  const totalItems = currentAdminProductsList.length;
  const totalPages = Math.ceil(totalItems / ADMIN_PAGE_SIZE) || 1;
  if (productsPage > totalPages) productsPage = totalPages;
  if (productsPage < 1) productsPage = 1;

  const pagedItems = currentAdminProductsList.slice((productsPage - 1) * ADMIN_PAGE_SIZE, productsPage * ADMIN_PAGE_SIZE);

  tbody.innerHTML = pagedItems.map(p => {
    const hasPromo = p.original_price && p.original_price > p.price;
    const isAct = (p.is_active !== 0 && p.is_active !== '0' && p.is_active !== false);

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-6">
          <img src="${p.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80'}" 
               alt="${escapeHtml(p.name)}" 
               class="w-12 h-12 rounded-xl object-cover border border-slate-200"
               onerror="this.onerror=null; this.src='/images/hd/cat-day-dien.jpg';">
        </td>
        <td class="py-3 px-6 font-bold text-slate-900 max-w-xs">
          <span class="block truncate" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          <p class="text-[11px] text-slate-400 font-normal leading-relaxed line-clamp-2 mt-0.5 overflow-hidden" 
             style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-word;" 
             title="${escapeHtml(p.short_desc || '')}">
            ${escapeHtml(p.short_desc || '')}
          </p>
        </td>
        <td class="py-3 px-6">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            ${p.category_name || 'Chưa phân loại'}
          </span>
        </td>
        <td class="py-3 px-6">
          <span class="font-black text-brand-600 block">${formatVND(p.price)}</span>
        </td>
        <!-- Cột Hot: Hiển thị Bật hoặc Tắt có thể bấm đổi trạng thái trực tiếp -->
        <td class="py-3 px-6 text-center">
          <button onclick="toggleProductPromo('${p.id}')" class="px-3 py-1 rounded-full text-[11px] font-bold transition inline-flex items-center justify-center space-x-1 ${p.is_promo ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}" title="Nhấn để Bật / Tắt trạng thái Hot">
            <i class="fa-solid ${p.is_promo ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark'}"></i>
            <span>${p.is_promo ? 'Bật' : 'Tắt'}</span>
          </button>
        </td>
        <!-- Cột Hiển thị: Hiển thị Bật hoặc Tắt trên landing page / website -->
        <td class="py-3 px-6 text-center">
          <button onclick="toggleProductActive('${p.id}')" class="px-3 py-1 rounded-full text-[11px] font-bold transition inline-flex items-center justify-center space-x-1 ${isAct ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}" title="Nhấn để Bật / Tắt hiển thị trên website">
            <i class="fa-solid ${isAct ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark'}"></i>
            <span>${isAct ? 'Bật' : 'Tắt'}</span>
          </button>
        </td>
        <td class="py-3 px-6 text-right space-x-2">
          <button onclick="editProduct('${p.id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-red-50 transition" title="Chỉnh sửa">
            <i class="fa-solid fa-pen-to-square text-sm"></i>
          </button>
          <button onclick="deleteProduct('${p.id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition" title="Xóa">
            <i class="fa-solid fa-trash-can text-sm"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderAdminPagination('products-pagination', productsPage, totalItems, ADMIN_PAGE_SIZE, 'changeProductsPage');
}

// Lọc sản phẩm ở Admin theo tên và danh mục
const adminSearch = document.getElementById('admin-product-search');
const adminCatFilter = document.getElementById('admin-product-cat-filter');

if (adminSearch) {
  adminSearch.addEventListener('input', applyAdminProductFilters);
}
if (adminCatFilter) {
  adminCatFilter.addEventListener('change', applyAdminProductFilters);
}

function applyAdminProductFilters() {
  productsPage = 1;
  const keyword = adminSearch ? adminSearch.value.toLowerCase().trim() : '';
  const catId = adminCatFilter ? adminCatFilter.value : 'all';

  const filtered = productsCache.filter(p => {
    const matchName = !keyword || p.name.toLowerCase().includes(keyword) || (p.short_desc && p.short_desc.toLowerCase().includes(keyword));
    const matchCat = catId === 'all' || String(p.category_id) === String(catId);
    return matchName && matchCat;
  });

  renderProductsTable(filtered);
}

// Quản lý nhiều ảnh cho sản phẩm
let currentProductImages = [];

function renderProductImagePreviews() {
  const grid = document.getElementById('product-images-grid');
  const mainImageInput = document.getElementById('prod-image');
  const imagesJsonInput = document.getElementById('prod-images');

  if (mainImageInput) mainImageInput.value = currentProductImages[0] || '';
  if (imagesJsonInput) imagesJsonInput.value = currentProductImages.length > 0 ? JSON.stringify(currentProductImages) : '';

  if (!grid) return;

  if (currentProductImages.length === 0) {
    grid.innerHTML = `
      <div class="w-full py-4 text-center text-slate-400 text-xs">
        <i class="fa-solid fa-images text-2xl mb-1 text-slate-300 block"></i>
        <span>Chưa có ảnh nào. Nhấn <strong>"Tải Lên Nhiều Ảnh"</strong> hoặc dán link URL để thêm.</span>
      </div>
    `;
    return;
  }

  let html = currentProductImages.map((imgUrl, idx) => `
    <div class="relative group w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden border-2 ${idx === 0 ? 'border-[#c8102e] shadow-sm' : 'border-slate-200'} bg-white flex items-center justify-center shrink-0">
      <img src="${imgUrl}" alt="Ảnh ${idx + 1}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='/images/hd/cat-day-dien.jpg';">
      ${idx === 0 ? '<span class="absolute top-1 left-1 bg-[#c8102e] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow pointer-events-none">Ảnh chính</span>' : ''}
      <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition duration-200">
        ${idx !== 0 ? `<button type="button" onclick="setPrimaryProductImage(${idx})" class="w-6 h-6 rounded-full bg-white text-amber-500 hover:bg-amber-100 flex items-center justify-center text-[10px] shadow" title="Đặt làm ảnh chính"><i class="fa-solid fa-star"></i></button>` : ''}
        <button type="button" onclick="removeProductImage(${idx})" class="w-6 h-6 rounded-full bg-white text-red-600 hover:bg-red-100 flex items-center justify-center text-[10px] shadow" title="Xóa ảnh này"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');

  // Plus button inside grid
  html += `
    <label class="w-20 h-20 sm:w-22 sm:h-22 border-2 border-dashed border-slate-300 hover:border-[#c8102e] rounded-xl flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-[#c8102e] hover:bg-red-50/20 transition shrink-0" title="Thêm ảnh">
      <i class="fa-solid fa-plus text-base"></i>
      <span class="text-[10px] font-bold mt-1">Thêm ảnh</span>
      <input type="file" multiple accept="image/*" class="hidden" onchange="uploadMultipleProductImages(this)">
    </label>
  `;

  grid.innerHTML = html;
}

async function uploadMultipleProductImages(fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) return;

  const files = Array.from(fileInput.files);
  showToast(`Đang tối ưu & tải lên ${files.length} ảnh...`, 'info');

  try {
    // 1. Thử đẩy lên server (Cloudinary CDN nếu đã cấu hình)
    let uploadedUrls = [];
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('images', f));
      const currentToken = localStorage.getItem('admin_token') || token;
      const res = await fetch('/api/admin/upload-multiple', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}` },
        body: formData
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.fileUrls)) {
        // Nếu là link Cloudinary (https://...) thì dùng trực tiếp link CDN siêu nhẹ
        uploadedUrls = data.fileUrls.filter(u => u && u.startsWith('http'));
      }
    } catch (e) {}

    if (uploadedUrls.length === files.length && uploadedUrls.length > 0) {
      currentProductImages.push(...uploadedUrls);
      renderProductImagePreviews();
      showToast(`Đã tải ${uploadedUrls.length} ảnh lên Cloudinary CDN thành công!`, 'success');
      return;
    }

    // 2. Fallback: Nén ảnh qua Canvas tại trình duyệt
    let addedCount = 0;
    for (const f of files) {
      try {
        const dataUrl = await compressImageToDataUrl(f, 1200, 1200, 0.82);
        if (dataUrl) {
          currentProductImages.push(dataUrl);
          addedCount++;
        }
      } catch (err) {
        console.warn('Lỗi nén ảnh:', err);
      }
    }

    renderProductImagePreviews();
    showToast(`Đã thêm ${addedCount} ảnh sản phẩm thành công!`, 'success');
  } catch (err) {
    showToast('Lỗi khi tải ảnh lên!', 'error');
  } finally {
    fileInput.value = '';
  }
}

function addProductImageFromUrl() {
  const input = document.getElementById('prod-add-url-input');
  if (!input) return;
  const url = input.value.trim();
  if (!url) {
    showToast('Vui lòng nhập đường dẫn URL ảnh!', 'warning');
    return;
  }
  currentProductImages.push(url);
  input.value = '';
  renderProductImagePreviews();
  showToast('Đã thêm link ảnh thành công!', 'success');
}

function removeProductImage(index) {
  if (index >= 0 && index < currentProductImages.length) {
    currentProductImages.splice(index, 1);
    renderProductImagePreviews();
  }
}

function setPrimaryProductImage(index) {
  if (index > 0 && index < currentProductImages.length) {
    const [selected] = currentProductImages.splice(index, 1);
    currentProductImages.unshift(selected);
    renderProductImagePreviews();
    showToast('Đã đặt làm ảnh đại diện chính!', 'success');
  }
}

function openProductModal(prod = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const idInput = document.getElementById('prod-id');
  const nameInput = document.getElementById('prod-name');
  const catInput = document.getElementById('prod-cat');
  const priceInput = document.getElementById('prod-price');
  const origPriceInput = document.getElementById('prod-orig-price');
  const shortDescInput = document.getElementById('prod-short-desc');
  const descInput = document.getElementById('prod-desc');
  const specsInput = document.getElementById('prod-specs');
  const appInput = document.getElementById('prod-applications');
  const warrantyInput = document.getElementById('prod-warranty');
  const isNewInput = document.getElementById('prod-is-new');
  const isPromoInput = document.getElementById('prod-is-promo');
  const isActiveInput = document.getElementById('prod-is-active');

  if (prod) {
    title.textContent = 'Chỉnh Sửa Sản Phẩm';
    idInput.value = prod.id;
    nameInput.value = prod.name;
    catInput.value = prod.category_id || '';
    priceInput.value = prod.price;
    origPriceInput.value = prod.original_price || '';
    shortDescInput.value = prod.short_desc || '';
    descInput.value = prod.description || '';
    specsInput.value = prod.specs || '';
    if (appInput) appInput.value = prod.applications || '';
    if (warrantyInput) warrantyInput.value = prod.warranty_policy || '';
    isNewInput.checked = prod.is_new === 1;
    isPromoInput.checked = prod.is_promo === 1;
    if (isActiveInput) {
      isActiveInput.checked = (prod.is_active !== 0 && prod.is_active !== '0' && prod.is_active !== false);
    }

    // Cấu hình danh sách nhiều ảnh
    currentProductImages = [];
    if (prod.images) {
      try {
        const parsed = typeof prod.images === 'string' ? JSON.parse(prod.images) : prod.images;
        if (Array.isArray(parsed)) currentProductImages = parsed.filter(Boolean);
      } catch (e) {
        if (typeof prod.images === 'string' && prod.images.trim()) currentProductImages = [prod.images.trim()];
      }
    }
    if (currentProductImages.length === 0 && prod.image) {
      currentProductImages = [prod.image];
    }
    renderProductImagePreviews();
  } else {
    title.textContent = 'Thêm Sản Phẩm Mới';
    idInput.value = '';
    nameInput.value = '';
    priceInput.value = '';
    origPriceInput.value = '';
    shortDescInput.value = '';
    descInput.value = '';
    specsInput.value = '';
    if (appInput) appInput.value = '';
    if (warrantyInput) warrantyInput.value = '';
    isNewInput.checked = false;
    isPromoInput.checked = false;
    if (isActiveInput) isActiveInput.checked = true;
    currentProductImages = [];
    renderProductImagePreviews();
  }

  modal.classList.add('active');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
}

// ========================================================
// CẤU HÌNH ĐIỀU CHỈNH GIÁ BÁN HÀNG LOẠT
// ========================================================
let selectedPriceProductIds = new Set();

async function openPriceConfigModal() {
  const modal = document.getElementById('price-config-modal');
  if (!modal) return;

  // Đảm bảo nạp đầy đủ danh sách sản phẩm nếu cache chưa có
  if (!productsCache || productsCache.length === 0) {
    try {
      const res = await fetch('/api/admin/products', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        productsCache = result.data;
      }
    } catch (e) {
      console.error('Lỗi nạp sản phẩm trước khi mở cấu hình giá:', e);
    }
  }

  // Đảm bảo nạp đầy đủ danh sách danh mục nếu cache chưa có
  if (!categoriesCache || categoriesCache.length === 0) {
    try {
      const resCat = await fetch('/api/admin/categories', { headers: getAuthHeaders() });
      const resultCat = await resCat.json();
      if (resultCat.success && Array.isArray(resultCat.data)) {
        categoriesCache = resultCat.data;
      }
    } catch (e) {
      console.error('Lỗi nạp danh mục trước khi mở cấu hình giá:', e);
    }
  }

  // Điền danh sách danh mục vào dropdown theo nhóm phân cấp (optgroup) chuẩn như khi chọn danh mục ở tạo sản phẩm
  const catSelect = document.getElementById('price-config-category-id');
  if (catSelect) {
    catSelect.innerHTML = buildCategoryDropdownHtml(true, '-- Tất cả sản phẩm --');
    catSelect.value = 'all';
  }

  // Mặc định KHÔNG chọn sản phẩm nào khi mới mở modal (để người dùng tự chọn hoặc bấm Chọn tất cả)
  selectedPriceProductIds = new Set();

  // Đặt lại hành động mặc định: Tăng giá (+)
  const increaseRadio = document.querySelector('input[name="price-action"][value="increase"]');
  if (increaseRadio) increaseRadio.checked = true;

  // Đặt lại hình thức tính giá mặc định: % với giá trị là 0
  const percentRadio = document.querySelector('input[name="price-type"][value="percent"]');
  if (percentRadio) percentRadio.checked = true;
  handlePriceTypeChange('percent');

  const valInput = document.getElementById('price-config-value');
  if (valInput) {
    valInput.value = '0';
    valInput.classList.remove('border-rose-500', 'bg-rose-50/20', 'text-rose-700');
    valInput.classList.add('border-slate-200');
  }

  const errorEl = document.getElementById('price-config-error');
  if (errorEl) errorEl.classList.add('hidden');

  const submitBtn = document.getElementById('btn-submit-price-config');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
  }

  const roundCheckbox = document.getElementById('price-config-round');
  if (roundCheckbox) roundCheckbox.checked = true;

  updatePricePreview();
  modal.classList.add('active');
}

function closePriceConfigModal() {
  const modal = document.getElementById('price-config-modal');
  if (modal) modal.classList.remove('active');
}

function handlePriceCategoryChange() {
  // Khi chọn danh mục mới, không mặc định chọn tất cả
  selectedPriceProductIds.clear();
  updatePricePreview();
}

function toggleSelectAllPriceProducts(isChecked) {
  const targetProducts = getFilteredPriceProducts();
  if (isChecked) {
    targetProducts.forEach(p => selectedPriceProductIds.add(Number(p.id)));
  } else {
    selectedPriceProductIds.clear();
  }

  const selectAllTop = document.getElementById('price-config-select-all');
  const selectAllHeader = document.getElementById('price-config-header-check');
  if (selectAllTop) selectAllTop.checked = isChecked;
  if (selectAllHeader) selectAllHeader.checked = isChecked;

  updatePricePreview();
}

function togglePriceProductSelection(productId, isChecked) {
  const idNum = Number(productId);
  if (isChecked) {
    selectedPriceProductIds.add(idNum);
  } else {
    selectedPriceProductIds.delete(idNum);
  }

  // Cập nhật lại toàn bộ bảng và số đếm ngay lập tức
  updatePricePreview();
}

function handlePriceTypeChange(type) {
  const unitLabel = document.getElementById('price-config-unit-label');
  const valInput = document.getElementById('price-config-value');
  const errorEl = document.getElementById('price-config-error');
  const submitBtn = document.getElementById('btn-submit-price-config');

  if (type === 'percent') {
    if (unitLabel) unitLabel.textContent = '%';
    if (valInput) {
      valInput.placeholder = '0';
      if (!valInput.value) valInput.value = '0';
    }
  } else {
    if (unitLabel) unitLabel.textContent = 'VNĐ';
    if (valInput) {
      valInput.placeholder = '0';
      if (!valInput.value) valInput.value = '0';
      valInput.classList.remove('border-rose-500', 'bg-rose-50/20', 'text-rose-700');
      valInput.classList.add('border-slate-200');
    }
    if (errorEl) errorEl.classList.add('hidden');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    }
  }
  handlePriceValueInput(valInput);
}

// Xử lý kiểm tra phần trăm: Nếu nhập > 100% hiển thị lỗi ở trường mức điều chỉnh và chặn áp dụng
function handlePriceValueInput(el) {
  const typeRadio = document.querySelector('input[name="price-type"]:checked');
  const type = typeRadio ? typeRadio.value : 'percent';
  const valInput = el || document.getElementById('price-config-value');
  const errorEl = document.getElementById('price-config-error');
  const errorText = document.getElementById('price-config-error-text');
  const submitBtn = document.getElementById('btn-submit-price-config');

  let hasPercentError = false;
  if (type === 'percent' && valInput && valInput.value !== '') {
    const num = parseFloat(valInput.value);
    if (!isNaN(num) && num > 100) {
      hasPercentError = true;
    }
  }

  if (hasPercentError) {
    if (errorEl) errorEl.classList.remove('hidden');
    if (errorText) errorText.textContent = 'Mức điều chỉnh theo phần trăm tối đa là 100%!';
    if (valInput) {
      valInput.classList.add('border-rose-500', 'bg-rose-50/20', 'text-rose-700');
      valInput.classList.remove('border-slate-200');
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    }
  } else {
    if (errorEl) errorEl.classList.add('hidden');
    if (valInput) {
      valInput.classList.remove('border-rose-500', 'bg-rose-50/20', 'text-rose-700');
      valInput.classList.add('border-slate-200');
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    }
  }

  updatePricePreview();
}

// Lấy ID danh mục và toàn bộ danh mục con trực thuộc
function getCategoryAndChildIds(catId) {
  const ids = [String(catId)];
  if (Array.isArray(categoriesCache)) {
    categoriesCache.forEach(c => {
      if (String(c.parent_id) === String(catId)) {
        ids.push(String(c.id));
      }
    });
  }
  return ids;
}

// Lấy danh sách sản phẩm theo bộ lọc danh mục hiện tại
function getFilteredPriceProducts() {
  const catSelect = document.getElementById('price-config-category-id');
  const catId = catSelect ? catSelect.value : 'all';
  let targetProducts = Array.isArray(productsCache) ? productsCache : [];
  if (catId && catId !== 'all') {
    const validCatIds = getCategoryAndChildIds(catId);
    targetProducts = targetProducts.filter(p => validCatIds.includes(String(p.category_id)));
  }
  return targetProducts;
}

function updatePriceSummaryText(selectedCount) {
  const previewText = document.getElementById('price-config-preview-text');
  if (!previewText) return;

  const actionRadio = document.querySelector('input[name="price-action"]:checked');
  const typeRadio = document.querySelector('input[name="price-type"]:checked');
  const valInput = document.getElementById('price-config-value');
  const roundCheckbox = document.getElementById('price-config-round');
  const catSelect = document.getElementById('price-config-category-id');

  const action = actionRadio ? actionRadio.value : 'increase';
  const type = typeRadio ? typeRadio.value : 'percent';
  const val = valInput && valInput.value ? parseFloat(valInput.value) : 0;
  const catId = catSelect ? catSelect.value : 'all';

  let scopeText = '<strong>Tất cả sản phẩm</strong>';
  if (catId !== 'all' && catSelect && catSelect.selectedOptions.length > 0) {
    scopeText = `sản phẩm thuộc danh mục "<strong>${catSelect.selectedOptions[0].textContent}</strong>"`;
  }

  const actionText = action === 'increase' ? 'Tăng giá' : 'Giảm giá';
  const valueText = type === 'percent' ? `${val}%` : `${formatVND(val)}`;

  if (type === 'percent' && val > 100) {
    previewText.innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Lỗi: Mức điều chỉnh theo phần trăm (${val}%) vượt quá 100%. Vui lòng nhập từ 0.1% đến 100%!</span>`;
    return;
  }

  if (selectedCount === 0) {
    previewText.innerHTML = `Chưa chọn sản phẩm nào. Vui lòng tích chọn sản phẩm muốn sửa giá ở danh sách bên dưới hoặc nhấn <strong>Chọn tất cả</strong>.`;
    return;
  }

  if (val <= 0 || isNaN(val)) {
    previewText.innerHTML = `Đã chọn <strong>${selectedCount}</strong> sản phẩm (${scopeText}). Vui lòng nhập mức điều chỉnh lớn hơn 0 để tính giá mới.`;
    return;
  }

  const samplePrice = 100000;
  let sampleDelta = type === 'percent' ? samplePrice * (val / 100) : val;
  let sampleNew = action === 'increase' ? (samplePrice + sampleDelta) : (samplePrice - sampleDelta);
  if (sampleNew < 0) sampleNew = 0;
  sampleNew = Math.round(sampleNew);

  previewText.innerHTML = `
    Áp dụng <strong>${actionText} ${valueText}</strong> cho <strong>${selectedCount}</strong> sản phẩm được chọn (${scopeText}).<br>
    Ví dụ: Sản phẩm <strong>100.000đ</strong> ➔ sẽ thành <strong class="${action === 'increase' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}">${formatVND(sampleNew)}</strong>.
  `;
}

function updatePricePreview() {
  const previewTbody = document.getElementById('price-config-preview-tbody');
  const countBadge = document.getElementById('price-config-item-count');
  const submitCount = document.getElementById('price-config-submit-count');
  const selectAllTop = document.getElementById('price-config-select-all');
  const selectAllHeader = document.getElementById('price-config-header-check');

  const actionRadio = document.querySelector('input[name="price-action"]:checked');
  const typeRadio = document.querySelector('input[name="price-type"]:checked');
  const valInput = document.getElementById('price-config-value');
  const roundCheckbox = document.getElementById('price-config-round');

  const action = actionRadio ? actionRadio.value : 'increase';
  const type = typeRadio ? typeRadio.value : 'percent';
  const val = valInput && valInput.value ? parseFloat(valInput.value) : 0;
  const isPercentError = (type === 'percent' && val > 100);

  const targetProducts = getFilteredPriceProducts();
  const totalItems = targetProducts.length;

  // Đếm số sản phẩm được chọn
  const selectedCount = targetProducts.filter(p => selectedPriceProductIds.has(Number(p.id))).length;

  if (countBadge) countBadge.textContent = `${selectedCount} / ${totalItems} sản phẩm`;
  if (submitCount) submitCount.textContent = `${selectedCount}`;

  const isAllChecked = totalItems > 0 && selectedCount === totalItems;
  if (selectAllTop) selectAllTop.checked = isAllChecked;
  if (selectAllHeader) selectAllHeader.checked = isAllChecked;

  // Tóm tắt công thức
  updatePriceSummaryText(selectedCount);

  // Render bảng danh sách sản phẩm hiển thị giá cũ và giá mới
  if (!previewTbody) return;

  if (targetProducts.length === 0) {
    previewTbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400 font-medium">
          <i class="fa-solid fa-box-open text-2xl text-slate-300 mb-2 block"></i>
          Không có sản phẩm nào thuộc danh mục này.
        </td>
      </tr>
    `;
    return;
  }

  previewTbody.innerHTML = targetProducts.map(p => {
    const isChecked = selectedPriceProductIds.has(Number(p.id));
    const oldPrice = parseFloat(p.price) || 0;
    let newPrice = oldPrice;
    let diff = 0;
    let badgeHtml = '';

    if (isChecked && !isNaN(val) && val > 0 && !isPercentError) {
      const delta = type === 'percent' ? (oldPrice * (val / 100)) : val;
      newPrice = action === 'increase' ? (oldPrice + delta) : (oldPrice - delta);
      if (newPrice < 0) newPrice = 0;
      newPrice = Math.round(newPrice);

      diff = newPrice - oldPrice;
      if (diff > 0) {
        const badgeText = type === 'percent' ? `+${val}%` : `+${formatVND(diff)}`;
        badgeHtml = `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">${badgeText}</span>`;
      } else if (diff < 0) {
        const badgeText = type === 'percent' ? `-${val}%` : `-${formatVND(Math.abs(diff))}`;
        badgeHtml = `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">${badgeText}</span>`;
      } else {
        badgeHtml = `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">Giữ nguyên</span>`;
      }
    } else if (isChecked && isPercentError) {
      newPrice = oldPrice;
      badgeHtml = `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">Vượt quá 100%</span>`;
    } else {
      newPrice = oldPrice;
      badgeHtml = `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">Giữ nguyên</span>`;
    }

    const thumbUrl = p.image || '/images/prod-cadivi-thumb-1.jpg';

    return `
      <tr class="hover:bg-slate-50/80 transition ${isChecked ? 'bg-red-50/20' : ''}">
        <td class="py-3 px-3 w-10 text-center">
          <input type="checkbox" class="price-prod-check w-4 h-4 text-brand-600 rounded cursor-pointer" ${isChecked ? 'checked' : ''} onchange="togglePriceProductSelection(${p.id}, this.checked)">
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center space-x-3">
            <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(p.name)}" class="w-9 h-9 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0" onerror="this.src='/images/prod-cadivi-thumb-1.jpg'">
            <span class="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          </div>
        </td>
        <td class="py-3 px-4 hidden sm:table-cell text-slate-500 text-xs whitespace-nowrap font-medium">
          ${escapeHtml(p.category_name || '-')}
        </td>
        <td class="py-3 px-4 text-right font-semibold text-slate-600 text-xs sm:text-sm whitespace-nowrap font-mono">
          ${formatVND(oldPrice)}
        </td>
        <td class="py-3 px-3 text-center text-slate-300 font-bold whitespace-nowrap">
          ➔
        </td>
        <td class="py-3 px-4 text-left whitespace-nowrap min-w-[150px]">
          <span class="font-bold font-mono ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-700'} text-xs sm:text-sm">${formatVND(newPrice)}</span>
          ${badgeHtml}
        </td>
      </tr>
    `;
  }).join('');
}

async function handleBatchPriceAdjustment(e) {
  if (e) e.preventDefault();

  const actionRadio = document.querySelector('input[name="price-action"]:checked');
  const typeRadio = document.querySelector('input[name="price-type"]:checked');
  const valInput = document.getElementById('price-config-value');
  const roundCheckbox = document.getElementById('price-config-round');

  const action = actionRadio ? actionRadio.value : 'increase';
  const type = typeRadio ? typeRadio.value : 'percent';
  const val = valInput ? parseFloat(valInput.value) : 0;
  const isRound = roundCheckbox ? roundCheckbox.checked : true;
  const shouldRound = (type !== 'percent') && isRound;

  // Lấy các sản phẩm đang được chọn
  const targetProducts = getFilteredPriceProducts();
  const selectedIds = targetProducts
    .map(p => Number(p.id))
    .filter(id => selectedPriceProductIds.has(id));

  if (selectedIds.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 sản phẩm để áp dụng điều chỉnh giá!', 'warning');
    return;
  }

  if (!val || val <= 0) {
    showToast('Vui lòng nhập giá trị điều chỉnh hợp lệ!', 'warning');
    return;
  }

  if (type === 'percent' && val > 100) {
    showToast('Mức điều chỉnh theo phần trăm tối đa là 100%!', 'warning');
    if (valInput) valInput.value = '100';
    updatePricePreview();
    return;
  }

  const actionText = action === 'increase' ? 'TĂNG' : 'GIẢM';
  const valText = type === 'percent' ? `${val}%` : `${formatVND(val)}`;
  const confirmMsg = `Bạn có chắc chắn muốn ${actionText} ${valText} cho ${selectedIds.length} sản phẩm đã chọn không? Thao tác sẽ cập nhật giá bán hàng loạt.`;

  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('btn-submit-price-config');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  }

  try {
    const res = await fetch('/api/admin/products/batch-adjust-price', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_ids: selectedIds,
        action,
        type,
        value: val,
        roundTo: 0
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast(result.message || 'Cập nhật giá bán thành công!', 'success');
      closePriceConfigModal();
      await loadProducts();
    } else {
      showToast(result.message || 'Lỗi khi cập nhật giá!', 'error');
    }
  } catch (err) {
    console.error('Lỗi khi cấu hình giá:', err);
    showToast('Không thể kết nối đến máy chủ!', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

function editProduct(id) {
  const p = productsCache.find(x => x.id === id);
  if (p) openProductModal(p);
}

async function deleteProduct(id) {
  if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác không thể hoàn tác.')) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message, 'success');

        const localProds = getLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS).filter(p => String(p.id) !== String(id));
        setLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS, localProds);

        const delProdIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_PROD_IDS);
        if (!delProdIds.includes(Number(id))) delProdIds.push(Number(id));
        setLocalStore(LOCAL_STORAGE_KEYS.DELETED_PROD_IDS, delProdIds);

        loadProducts();
      } else {
        showToast(result.message, 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối!', 'error');
    }
  }
}

// Bật / Tắt trạng thái Hot nhanh trên bảng sản phẩm
async function toggleProductPromo(id) {
  // 1. Tìm sản phẩm trong cache
  const p = productsCache.find(x => String(x.id) === String(id));
  const currentPromo = p ? (p.is_promo === 1 || p.is_promo === '1' ? 1 : 0) : 0;
  const newPromo = currentPromo === 1 ? 0 : 1;

  // 2. Cập nhật ngay trong cache và LocalStorage (optimistic update)
  if (p) p.is_promo = newPromo;
  try {
    const localProds = getLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS);
    const lp = localProds.find(x => String(x.id) === String(id));
    if (lp) {
      lp.is_promo = newPromo;
    } else if (p) {
      localProds.push({ ...p, is_promo: newPromo });
    }
    setLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS, localProds);
  } catch (e) {}

  renderProductsTable(productsCache);

  try {
    const res = await fetch(`/api/admin/products/${id}/toggle-promo`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_promo: newPromo, product: p })
    });
    const result = await res.json();
    if (result && result.success) {
      showToast(result.message, 'success');
    } else {
      await syncLocalStoreToServer();
      showToast(`Đã ${newPromo === 1 ? 'bật' : 'tắt'} trạng thái Hot!`, 'success');
    }
  } catch (err) {
    showToast(`Đã ${newPromo === 1 ? 'bật' : 'tắt'} trạng thái Hot!`, 'success');
  }
}

// Bật / Tắt trạng thái Hiển thị nhanh trên website / landing page
async function toggleProductActive(id) {
  // 1. Tìm sản phẩm trong cache
  const p = productsCache.find(x => String(x.id) === String(id));
  const currentActive = p ? (p.is_active !== 0 && p.is_active !== '0' && p.is_active !== false ? 1 : 0) : 1;
  const newActive = currentActive === 1 ? 0 : 1;

  // 2. Cập nhật ngay trong cache và LocalStorage (optimistic update)
  if (p) p.is_active = newActive;
  try {
    const localProds = getLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS);
    const lp = localProds.find(x => String(x.id) === String(id));
    if (lp) {
      lp.is_active = newActive;
    } else if (p) {
      localProds.push({ ...p, is_active: newActive });
    }
    setLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS, localProds);
  } catch (e) {}

  renderProductsTable(productsCache);

  try {
    const res = await fetch(`/api/admin/products/${id}/toggle-active`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: newActive, product: p })
    });
    const result = await res.json();
    if (result && result.success) {
      showToast(result.message, 'success');
    } else {
      await syncLocalStoreToServer();
      showToast(`Đã ${newActive === 1 ? 'bật' : 'tắt'} hiển thị sản phẩm trên website!`, 'success');
    }
  } catch (err) {
    showToast(`Đã ${newActive === 1 ? 'bật' : 'tắt'} hiển thị sản phẩm trên website!`, 'success');
  }
}




// ========================================================
// 6. TAB 4: QUẢN LÝ BLOG / TIN TỨC
// ========================================================
let blogsCache = [];

async function loadBlogs() {
  const tbody = document.getElementById('blogs-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400"><i class="fa-solid fa-spinner fa-spin text-lg text-brand-600"></i> Đang tải bài viết...</td></tr>`;

  try {
    await syncLocalStoreToServer();

    const res = await fetch('/api/admin/blogs', { headers: getAuthHeaders() });
    const result = await res.json();
    let serverBlogs = (result && result.success && Array.isArray(result.data)) ? result.data : [];

    const localBlogs = getLocalStore(LOCAL_STORAGE_KEYS.BLOGS);
    const delBlogIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_BLOG_IDS);

    // Lọc bỏ các bài viết đã bị xóa
    serverBlogs = serverBlogs.filter(b => !delBlogIds.includes(Number(b.id)) && !delBlogIds.includes(String(b.id)));

    // Hợp nhất các bài viết từ LocalStorage nếu server chưa có
    let needsSync = false;
    localBlogs.forEach(lb => {
      if (delBlogIds.includes(Number(lb.id)) || delBlogIds.includes(String(lb.id))) return;
      const exist = serverBlogs.find(sb => String(sb.id) === String(lb.id));
      if (!exist) {
        serverBlogs.unshift(lb);
        needsSync = true;
      } else {
        Object.assign(exist, lb);
      }
    });

    blogsCache = serverBlogs;

    if (needsSync) {
      syncLocalStoreToServer();
    }

    if (blogsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">Chưa có bài viết tin tức nào.</td></tr>`;
      return;
    }

    updateAdminBlogCatFilterOptions();
    applyAdminBlogFilters();
  } catch (err) {
    console.error('Lỗi tải blogs:', err);
    const localBlogs = getLocalStore(LOCAL_STORAGE_KEYS.BLOGS);
    const delBlogIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_BLOG_IDS);
    blogsCache = localBlogs.filter(b => !delBlogIds.includes(Number(b.id)) && !delBlogIds.includes(String(b.id)));
    if (blogsCache.length > 0) {
      updateAdminBlogCatFilterOptions();
      applyAdminBlogFilters();
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">Lỗi khi tải danh sách bài viết.</td></tr>`;
    }
  }
}

function updateAdminBlogCatFilterOptions() {
  const catFilter = document.getElementById('admin-blog-cat-filter');
  if (!catFilter) return;

  const standardCats = [
    'Tin công ty',
    'Kiến thức sản phẩm',
    'Kinh nghiệm sử dụng điện',
    'Công nghệ & Xu hướng',
    'Tin khuyến mãi',
    'Tin tức thị trường'
  ];

  const currentVal = catFilter.value || 'all';
  const extraCats = [...new Set(blogsCache.map(b => b.category).filter(c => c && !standardCats.includes(c)))];
  const allCats = [...standardCats, ...extraCats];

  catFilter.innerHTML = `
    <option value="all">-- Tất cả danh mục --</option>
    ${allCats.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
  `;
  catFilter.value = currentVal;
}

window.changeBlogsPage = function(page) {
  blogsPage = page;
  renderBlogsTable(currentAdminBlogsList);
};

function applyAdminBlogFilters() {
  blogsPage = 1;
  const searchInput = document.getElementById('admin-blog-search');
  const catFilter = document.getElementById('admin-blog-cat-filter');

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedCat = catFilter ? catFilter.value : 'all';

  const filtered = blogsCache.filter(b => {
    const matchTitle = !keyword || (b.title && b.title.toLowerCase().includes(keyword));
    const matchCat = selectedCat === 'all' || (b.category && b.category === selectedCat);
    return matchTitle && matchCat;
  });

  renderBlogsTable(filtered);
}

function renderBlogsTable(blogs) {
  currentAdminBlogsList = blogs || blogsCache;
  const tbody = document.getElementById('blogs-table-body');
  if (!tbody) return;

  if (!currentAdminBlogsList || currentAdminBlogsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">Không tìm thấy bài viết tin tức nào phù hợp.</td></tr>`;
    renderAdminPagination('blogs-pagination', 1, 0, ADMIN_PAGE_SIZE, 'changeBlogsPage');
    return;
  }

  const totalItems = currentAdminBlogsList.length;
  const totalPages = Math.ceil(totalItems / ADMIN_PAGE_SIZE) || 1;
  if (blogsPage > totalPages) blogsPage = totalPages;
  if (blogsPage < 1) blogsPage = 1;

  const pagedItems = currentAdminBlogsList.slice((blogsPage - 1) * ADMIN_PAGE_SIZE, blogsPage * ADMIN_PAGE_SIZE);

  tbody.innerHTML = pagedItems.map(b => `
    <tr class="hover:bg-slate-50 transition">
      <td class="py-3 px-6">
        <img src="${b.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80'}" 
             alt="${escapeHtml(b.title)}" 
             class="w-14 h-10 rounded-lg object-cover border border-slate-200"
             onerror="this.onerror=null; this.src='/images/hd/cat-day-dien.jpg';">
      </td>
      <td class="py-3 px-6 font-bold text-slate-900 max-w-md truncate" title="${b.title}">
        ${b.title}
      </td>
      <td class="py-3 px-6">
        <span class="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-[#c8102e] border border-red-100 whitespace-nowrap">
          ${b.category || 'Tin công ty'}
        </span>
      </td>
      <td class="py-3 px-6 text-slate-400 whitespace-nowrap">${new Date(b.created_at).toLocaleDateString('vi-VN')}</td>
      <td class="py-3 px-6 text-right space-x-2 whitespace-nowrap">
        <button onclick="editBlog(${b.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-red-50 transition" title="Sửa bài">
          <i class="fa-solid fa-pen-to-square text-sm"></i>
        </button>
        <button onclick="deleteBlog(${b.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition" title="Xóa bài">
          <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
      </td>
    </tr>
  `).join('');

  renderAdminPagination('blogs-pagination', blogsPage, totalItems, ADMIN_PAGE_SIZE, 'changeBlogsPage');
}

function openBlogModal(blog = null) {
  const modal = document.getElementById('blog-modal');
  const title = document.getElementById('blog-modal-title');
  const idInput = document.getElementById('blog-id');
  const titleInput = document.getElementById('blog-title');
  const catInput = document.getElementById('blog-category');
  const imgInput = document.getElementById('blog-image');
  const summaryInput = document.getElementById('blog-summary');
  const contentInput = document.getElementById('blog-content');

  const blogPreview = document.getElementById('blog-image-preview');
  if (blog) {
    title.textContent = 'Chỉnh Sửa Bài Viết';
    idInput.value = blog.id;
    titleInput.value = blog.title;
    if (catInput) catInput.value = blog.category || 'Tin công ty';
    imgInput.value = blog.image || '';
    if (blogPreview) blogPreview.src = blog.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80';
    summaryInput.value = blog.summary || '';
    contentInput.value = blog.content || '';
  } else {
    title.textContent = 'Viết Bài Tin Tức Mới';
    idInput.value = '';
    titleInput.value = '';
    if (catInput) catInput.value = 'Tin công ty';
    imgInput.value = '';
    if (blogPreview) blogPreview.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80';
    summaryInput.value = '';
    contentInput.value = '';
  }

  modal.classList.add('active');
}

function updateBlogImagePreview(val) {
  const prev = document.getElementById('blog-image-preview');
  if (prev) {
    prev.src = val ? val.trim() : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80';
  }
}
window.updateBlogImagePreview = updateBlogImagePreview;

function closeBlogModal() {
  document.getElementById('blog-modal').classList.remove('active');
}

function editBlog(id) {
  const b = blogsCache.find(x => x.id === id);
  if (b) openBlogModal(b);
}

async function deleteBlog(id) {
  if (confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message, 'success');

        const localBlogs = getLocalStore(LOCAL_STORAGE_KEYS.BLOGS).filter(b => String(b.id) !== String(id));
        setLocalStore(LOCAL_STORAGE_KEYS.BLOGS, localBlogs);

        const delBlogIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_BLOG_IDS);
        if (!delBlogIds.includes(Number(id))) delBlogIds.push(Number(id));
        setLocalStore(LOCAL_STORAGE_KEYS.DELETED_BLOG_IDS, delBlogIds);

        syncLocalStoreToServer();

        loadBlogs();
      } else {
        showToast(result.message, 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối!', 'error');
    }
  }
}


// ========================================================
// ========================================================
// 7. TAB 5: QUẢN LÝ LIÊN HỆ
// ========================================================
function filterContactStatus(status) {
  currentContactStatusFilter = status;
  contactsPage = 1;
  updateContactStatusTabsUI();
  loadContacts();
}

function updateContactStatusTabsUI() {
  const statusMap = {
    'all': 'cstatus-all',
    'Mới': 'cstatus-Mới',
    'Đang xử lý': 'cstatus-Đang-xử-lý',
    'Đã xử lý': 'cstatus-Đã-xử-lý'
  };

  Object.entries(statusMap).forEach(([st, btnId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (currentContactStatusFilter === st) {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-[#c8102e] text-white shadow-xs cursor-pointer';
    } else {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer';
    }
  });
}

function filterContactType(type) {
  currentContactTypeFilter = type;
  contactsPage = 1;
  loadContacts();
}

function filterContacts(type) {
  filterContactType(type);
}

function renderContactTypeSelect() {
  const select = document.getElementById('contact-type-select-filter');
  if (!select) return;

  const types = ['all'];
  if (Array.isArray(quoteTypesList) && quoteTypesList.length > 0) {
    quoteTypesList.forEach(item => {
      const name = typeof item === 'string' ? item : item.name;
      if (name && !types.includes(name)) types.push(name);
    });
  }

  if (Array.isArray(contactsCache)) {
    contactsCache.forEach(c => {
      if (c.type && !types.includes(c.type)) types.push(c.type);
    });
  }

  if (types.length === 1) {
    ['Báo giá sản phẩm', 'Tư vấn kỹ thuật', 'Góp ý / Khiếu nại', 'Hủy đơn', 'Đổi trả'].forEach(t => {
      if (!types.includes(t)) types.push(t);
    });
  }

  select.innerHTML = types.map(t => {
    const label = t === 'all' ? '-- Tất cả loại liên hệ --' : t;
    const isSelected = currentContactTypeFilter === t ? 'selected' : '';
    return `<option value="${escapeHtml(t)}" ${isSelected}>${escapeHtml(label)}</option>`;
  }).join('');
}

function renderContactFilterButtons() {
  renderContactTypeSelect();
}

function renderContactProductsCell(productNameStr) {
  if (!productNameStr || !productNameStr.trim()) {
    return '<span class="text-slate-400 italic text-[11px]">—</span>';
  }

  let raw = productNameStr.trim();
  // Bỏ hoàn toàn phần (Loại SP: ...) để không hiển thị text loại sản phẩm
  raw = raw.replace(/\s*\((Loại SP:[^)]+)\)/i, '').trim();

  // Tách danh sách sản phẩm theo dấu phẩy
  const items = raw.split(',').map(s => s.trim()).filter(Boolean);

  if (items.length === 0) {
    return '<span class="text-slate-400 italic text-[11px]">—</span>';
  }

  // Hiển thị tối đa 3 sản phẩm, các sản phẩm còn lại hiển thị ...
  const MAX_VISIBLE = 3;
  const visibleItems = items.slice(0, MAX_VISIBLE);
  const remainingCount = items.length - MAX_VISIBLE;

  let itemsHtml = visibleItems.map(name => `
    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 max-w-full truncate" title="${escapeHtml(name)}">
      <span class="truncate">${escapeHtml(name)}</span>
    </span>
  `).join('');

  if (remainingCount > 0) {
    itemsHtml += `
      <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 w-fit cursor-pointer" title="${escapeHtml(productNameStr)}">
        ... (+${remainingCount})
      </span>
    `;
  }

  return `
    <div class="flex flex-col gap-1 max-w-[220px]" title="${escapeHtml(productNameStr)}">
      ${itemsHtml}
    </div>
  `;
}

async function loadContacts() {
  const tbody = document.getElementById('contacts-table-body');
  if (!tbody) return;

  renderContactTypeSelect();
  updateContactStatusTabsUI();

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400"><i class="fa-solid fa-spinner fa-spin text-lg text-[#c8102e]"></i> Đang tải phản hồi khách hàng...</td></tr>`;

  try {
    // Luôn lấy toàn bộ danh sách từ server để kết hợp với LocalStorage, không bị cắt bớt danh sách
    const res = await fetch('/api/admin/contacts', { headers: getAuthHeaders() });
    const result = await res.json();
    let serverContacts = (result && result.success && Array.isArray(result.data)) ? result.data : [];

    const localContacts = getLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, []);
    let delContactIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CONTACT_IDS, []);

    // Hợp nhất dữ liệu: Ưu tiên nạp LocalContacts trước để phản hồi khách hàng luôn xuất hiện tức thì
    const map = new Map();
    localContacts.forEach(c => {
      if (!c || !c.id) return;
      const isDel = delContactIds.includes(Number(c.id)) || delContactIds.includes(String(c.id));
      if (!isDel) {
        map.set(String(c.id), c);
      }
    });

    serverContacts.forEach(c => {
      if (!c || !c.id) return;
      const isDel = delContactIds.includes(Number(c.id)) || delContactIds.includes(String(c.id));
      if (!isDel) {
        if (!map.has(String(c.id))) {
          map.set(String(c.id), c);
        } else {
          const current = map.get(String(c.id));
          if (c.status && c.status !== current.status) current.status = c.status;
          if (c.quote_sent !== undefined) current.quote_sent = c.quote_sent;
        }
      }
    });

    contactsCache = Array.from(map.values());
    contactsCache.sort((a, b) => Number(b.id) - Number(a.id));

    // Lưu vào LocalStorage
    setLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, contactsCache);

    if (delContactIds.length > 0) {
      syncLocalStoreToServer();
    }

    renderContactsTable();
    renderContactTypeSelect();
  } catch (err) {
    console.error('Lỗi khi tải liên hệ:', err);
    const localContacts = getLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, []);
    let delContactIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CONTACT_IDS, []);
    contactsCache = localContacts.filter(c => {
      const isDel = delContactIds.includes(Number(c.id)) || delContactIds.includes(String(c.id));
      return !isDel;
    });
    contactsCache.sort((a, b) => Number(b.id) - Number(a.id));
    renderContactsTable();
  }
}

window.changeContactsPage = function(page) {
  contactsPage = page;
  renderContactsTable();
};

// Helper màu sắc trạng thái liên hệ (Mới: Vàng cam, Đang xử lý: Xanh dương, Đã xử lý: Xanh lá)
function getContactStatusClasses(status) {
  if (status === 'Đang xử lý') {
    return 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300';
  }
  if (status === 'Đã xử lý') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300';
}

function renderContactsTable() {
  const tbody = document.getElementById('contacts-table-body');
  if (!tbody) return;

  let filtered = Array.isArray(contactsCache) ? [...contactsCache] : [];
  if (currentContactStatusFilter && currentContactStatusFilter !== 'all') {
    filtered = filtered.filter(c => c.status === currentContactStatusFilter);
  }
  if (currentContactTypeFilter && currentContactTypeFilter !== 'all') {
    const filter = currentContactTypeFilter.toLowerCase().trim();
    filtered = filtered.filter(c => {
      if (!c.type) return false;
      const t = c.type.toLowerCase().trim();
      if (t === filter || t.includes(filter) || filter.includes(t)) return true;
      if (filter.includes('báo giá') && t.includes('báo giá')) return true;
      return false;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Không có phản hồi nào trong mục này.</td></tr>`;
    renderAdminPagination('contacts-pagination', 1, 0, ADMIN_PAGE_SIZE, 'changeContactsPage');
    return;
  }

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ADMIN_PAGE_SIZE) || 1;
  if (contactsPage > totalPages) contactsPage = totalPages;
  if (contactsPage < 1) contactsPage = 1;

  const pagedItems = filtered.slice((contactsPage - 1) * ADMIN_PAGE_SIZE, contactsPage * ADMIN_PAGE_SIZE);

  tbody.innerHTML = pagedItems.map(c => `
    <tr class="hover:bg-slate-50 transition">
      <td class="py-3 px-5">
        <span class="font-bold text-slate-900 block">#${c.id}</span>
        <span class="text-[10px] text-slate-400">${new Date(c.created_at).toLocaleString('vi-VN')}</span>
      </td>

      <td class="py-3 px-5">
        <span class="font-bold text-slate-900 block">${escapeHtml(c.fullname)}</span>
        <a href="tel:${c.phone}" class="text-xs font-mono text-brand-600 hover:underline block">${escapeHtml(c.phone)}</a>
        ${c.email ? `<span class="text-[11px] text-slate-400 block">${escapeHtml(c.email)}</span>` : ''}
      </td>

      <!-- PHÂN LOẠI LOẠI LIÊN HỆ -->
      <td class="py-3 px-5">
        ${renderContactTypeBadge(c.type, false)}
      </td>

      <!-- SẢN PHẨM CẦN BÁO GIÁ (Tối đa 3 sản phẩm, còn lại ...) -->
      <td class="py-3 px-5 max-w-[240px]">
        ${renderContactProductsCell(c.product_name)}
      </td>

      <!-- NỘI DUNG LỜI NHẮN (Tối đa 3 dòng và ...) -->
      <td class="py-3 px-5 min-w-[180px] max-w-xs">
        <p class="text-xs text-slate-700 leading-relaxed overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-word;" title="${escapeHtml(c.message)}">${escapeHtml(c.message)}</p>
      </td>

      <!-- Trạng thái xử lý hiển thị màu sắc theo từng trạng thái -->
      <td class="py-3 px-5">
        <select onchange="updateContactStatus(${c.id}, this.value, this)" class="text-xs font-bold py-1.5 px-3 rounded-xl border shadow-2xs outline-none cursor-pointer transition ${getContactStatusClasses(c.status)}">
          <option value="Mới" ${c.status === 'Mới' ? 'selected' : ''} class="bg-white text-amber-800 font-bold">Mới tiếp nhận</option>
          <option value="Đang xử lý" ${c.status === 'Đang xử lý' ? 'selected' : ''} class="bg-white text-blue-800 font-bold">Đang xử lý</option>
          <option value="Đã xử lý" ${c.status === 'Đã xử lý' ? 'selected' : ''} class="bg-white text-emerald-800 font-bold">Đã hoàn tất</option>
        </select>
      </td>

      <td class="py-3 px-4 text-center whitespace-nowrap">
        <div class="inline-flex items-center justify-center space-x-1.5">
          <button onclick="viewContactDetail(${c.id})" class="w-8 h-8 rounded-lg text-brand-600 hover:bg-red-50 hover:text-[#c8102e] flex items-center justify-center transition cursor-pointer" title="Xem chi tiết">
            <i class="fa-solid fa-eye text-sm"></i>
          </button>
          <button onclick="deleteContact(${c.id})" class="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer" title="Xóa">
            <i class="fa-solid fa-trash-can text-sm"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  renderAdminPagination('contacts-pagination', contactsPage, totalItems, ADMIN_PAGE_SIZE, 'changeContactsPage');
}

async function updateContactStatus(id, newStatus, selectEl) {
  if (selectEl) {
    selectEl.className = `text-xs font-bold py-1.5 px-3 rounded-xl border shadow-2xs outline-none cursor-pointer transition ${getContactStatusClasses(newStatus)}`;
  }

  // Cập nhật ngay trong cache và LocalStorage để bảo toàn tức thì
  const contact = contactsCache.find(x => String(x.id) === String(id));
  if (contact) contact.status = newStatus;
  const localContacts = getLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, []);
  const foundLocal = localContacts.find(x => String(x.id) === String(id));
  if (foundLocal) {
    foundLocal.status = newStatus;
    setLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, localContacts);
  }

  try {
    const res = await fetch(`/api/admin/contacts/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      syncLocalStoreToServer();
      loadContacts();
    } else {
      showToast(result.message || 'Lỗi cập nhật trạng thái!', 'error');
    }
  } catch (err) {
    showToast('Đã cập nhật trạng thái!', 'success');
    loadContacts();
  }
}

function viewContactDetail(id) {
  const c = contactsCache.find(x => x.id === id);
  if (!c) return;

  const modal = document.getElementById('contact-modal');
  const body = document.getElementById('contact-modal-body');

  // Xử lý danh sách sản phẩm cần báo giá nếu có
  let productsSectionHtml = '';
  if (c.product_name && c.product_name.trim()) {
    let rawStr = c.product_name.trim();
    let catNote = '';
    const match = rawStr.match(/\s*\((Loại SP:[^)]+)\)/i);
    if (match) {
      catNote = match[1];
      rawStr = rawStr.replace(match[0], '').trim();
    }

    const prodItems = rawStr.split(',').map(s => s.trim()).filter(Boolean);

    productsSectionHtml = `
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="font-bold text-xs uppercase text-slate-700 flex items-center space-x-1.5">
            <i class="fa-solid fa-boxes-stacked text-[#c8102e]"></i>
            <span>Danh Sách Sản Phẩm Cần Báo Giá:</span>
          </label>
          ${prodItems.length > 0 ? `<span class="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">Tổng: ${prodItems.length} sản phẩm</span>` : ''}
        </div>

        <div class="bg-amber-50/50 border border-amber-200 rounded-2xl p-3 sm:p-4 space-y-2">
          ${catNote ? `
            <div class="pb-2 border-b border-amber-200/70 flex items-center space-x-2 text-xs">
              <span class="font-bold text-slate-700"><i class="fa-solid fa-layer-group text-amber-600 mr-1"></i> Nhóm loại sản phẩm:</span>
              <span class="bg-white border border-amber-200 px-2.5 py-0.5 rounded-lg text-amber-900 font-bold">${escapeHtml(catNote)}</span>
            </div>
          ` : ''}

          <div class="divide-y divide-amber-100 bg-white rounded-xl border border-amber-200/80 overflow-hidden shadow-2xs">
            ${prodItems.map((p, idx) => `
              <div class="flex items-center justify-between p-3 hover:bg-amber-50/40 transition">
                <div class="flex items-center space-x-3 min-w-0 flex-1">
                  <span class="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                    ${idx + 1}
                  </span>
                  <span class="font-bold text-xs sm:text-sm text-slate-800 leading-snug">${escapeHtml(p)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  const typeCfg = getContactTypeBadgeConfig(c.type);

  body.innerHTML = `
    <!-- Khung thông tin khách hàng (Đã ẩn sản phẩm báo giá ra khỏi đây) -->
    <div class="p-4 sm:p-5 rounded-2xl ${typeCfg.cardBg}">
      <div class="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-200/60">
        <span class="font-extrabold text-sm ${typeCfg.textColor} flex items-center">
          <i class="${typeCfg.icon} mr-2 text-base"></i>
          Phân loại: ${escapeHtml(c.type || 'Liên hệ')}
        </span>
        <span class="text-xs text-slate-500 font-medium">${new Date(c.created_at).toLocaleString('vi-VN')}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-[13px] text-slate-700">
        <div><span class="text-slate-500 font-medium">Họ và tên:</span> <strong class="text-slate-900 ml-1">${escapeHtml(c.fullname)}</strong></div>
        <div><span class="text-slate-500 font-medium">Số điện thoại:</span> <a href="tel:${escapeHtml(c.phone)}" class="text-[#c8102e] font-black hover:underline ml-1 font-mono">${escapeHtml(c.phone)}</a></div>
        <div><span class="text-slate-500 font-medium">Email:</span> <strong class="text-slate-900 ml-1">${escapeHtml(c.email || 'Không cung cấp')}</strong></div>
        <div><span class="text-slate-500 font-medium">Địa chỉ:</span> <strong class="text-slate-900 ml-1">${escapeHtml(c.address || 'Không cung cấp')}</strong></div>
        <div>
          <span class="text-slate-500 font-medium">Trạng thái:</span> 
          <span class="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${c.status === 'Mới' ? 'bg-amber-100 text-amber-800' : (c.status === 'Đang xử lý' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800')}">
            ${escapeHtml(c.status === 'Mới' ? 'Mới tiếp nhận' : (c.status === 'Đang xử lý' ? 'Đang xử lý' : 'Đã hoàn tất'))}
          </span>
        </div>
      </div>
    </div>

    <!-- Danh sách sản phẩm cần báo giá hiển thị riêng biệt bên dưới -->
    ${productsSectionHtml}

    <!-- Nội dung lời nhắn -->
    <div class="space-y-1.5">
      <label class="font-bold text-xs uppercase text-slate-700 flex items-center space-x-1.5">
        <i class="fa-solid fa-comment-dots text-slate-400"></i>
        <span>Nội dung lời nhắn:</span>
      </label>
      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line text-xs sm:text-sm">${escapeHtml((c.message || '').trim())}</div>
    </div>

    <!-- Nút thao tác (Với loại báo giá thêm nút Báo giá kế bên nút Đóng, khi gửi thành công chuyển thành Đã gửi báo giá và disable) -->
    <div class="pt-3 flex items-center justify-end space-x-3">
      ${(c.type?.toLowerCase().includes('báo giá') || (c.product_name && c.product_name.trim())) ? `
        ${(c.quote_sent == 1) ? `
          <button 
            type="button" 
            disabled 
            class="px-5 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs sm:text-sm rounded-xl flex items-center space-x-2 cursor-not-allowed opacity-80"
            title="Đã gửi báo giá cho liên hệ này"
          >
            <i class="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
            <span>Đã gửi báo giá</span>
          </button>
        ` : `
          <button 
            type="button" 
            id="btn-quote-contact-${c.id}"
            onclick="openQuoteContractModal(${c.id})" 
            class="px-5 py-2.5 bg-[#c8102e] hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer active:scale-95"
            title="Lập bảng báo giá cho khách hàng này"
          >
            <i class="fa-solid fa-file-invoice-dollar"></i>
            <span>Báo giá</span>
          </button>
        `}
      ` : ''}
      <button onclick="closeContactDetailModal()" class="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer">
        Đóng
      </button>
    </div>
  `;

  modal.classList.add('active');
}

function closeContactDetailModal() {
  document.getElementById('contact-modal').classList.remove('active');
}


// (Các hàm Lập Báo Giá đã được tách sang /js/admin-quotes.js)
async function deleteContact(id) {
  if (confirm('Bạn có chắc chắn muốn xóa bản ghi phản hồi này?')) {
    // 1. Thêm vào danh sách ID đã xóa trong LocalStorage
    const delIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CONTACT_IDS, []);
    if (!delIds.includes(Number(id))) delIds.push(Number(id));
    setLocalStore(LOCAL_STORAGE_KEYS.DELETED_CONTACT_IDS, delIds);

    // 2. Loại bỏ khỏi danh sách contact lưu trong LocalStorage và cache
    const localContacts = getLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, []).filter(c => String(c.id) !== String(id));
    setLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, localContacts);
    contactsCache = contactsCache.filter(c => String(c.id) !== String(id));
    renderContactsTable();

    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message, 'success');
      }
    } catch (e) {
      console.warn('Lỗi khi gọi API xóa, đã xóa trong LocalStorage:', e);
    } finally {
      syncLocalStoreToServer();
      loadContacts();
    }
  }
}



// (Các hàm Cấu Hình Website & Media Library đã được tách sang /js/admin-settings.js)
// ========================================================
// 10. SETUP TẤT CẢ SUBMIT FORM
// ========================================================
function setupForms() {
  // 1. Category Form
  const catForm = document.getElementById('category-form');
  if (catForm) {
    catForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('cat-id').value;
      const parentGroup = document.getElementById('cat-parent-group');
      const isParentGroupVisible = parentGroup && !parentGroup.classList.contains('hidden');
      const parent_id = document.getElementById('cat-parent-id')?.value || null;

      if (isParentGroupVisible && !id && !parent_id) {
        showToast('Vui lòng chọn danh mục cha!', 'warning');
        document.getElementById('cat-parent-id')?.focus();
        return;
      }
      const name = document.getElementById('cat-name').value.trim();
      const description = document.getElementById('cat-desc').value.trim();
      const image = document.getElementById('cat-image').value.trim();
      const show_in_slider = document.getElementById('cat-slider').checked ? 1 : 0;

      const payload = { name, description, image, show_in_slider, parent_id };
      const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          showToast(result.message, 'success');

          const newCatId = result.id || id || Date.now();
          const savedCat = {
            id: Number(newCatId) || newCatId,
            name,
            description,
            image,
            show_in_slider,
            parent_id: parent_id ? Number(parent_id) : null,
            created_at: new Date().toISOString()
          };

          const localCats = getLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES);
          const idx = localCats.findIndex(c => String(c.id) === String(savedCat.id));
          if (idx >= 0) localCats[idx] = savedCat;
          else localCats.push(savedCat);
          setLocalStore(LOCAL_STORAGE_KEYS.CATEGORIES, localCats);

          const delCatIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_CAT_IDS).filter(x => String(x) !== String(savedCat.id));
          setLocalStore(LOCAL_STORAGE_KEYS.DELETED_CAT_IDS, delCatIds);

          await syncLocalStoreToServer();

          closeCategoryModal();
          loadCategories();
        } else {
          showToast(result.message, 'error');
        }
      } catch (e) {
        showToast('Lỗi khi lưu danh mục!', 'error');
      }
    });
  }

  // 2. Product Form
  const prodForm = document.getElementById('product-form');
  if (prodForm) {
    prodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('prod-id').value;
      const name = document.getElementById('prod-name').value.trim();
      const category_id = document.getElementById('prod-cat').value;
      const price = document.getElementById('prod-price').value;
      const original_price = document.getElementById('prod-orig-price').value;
      const short_desc = document.getElementById('prod-short-desc').value.trim();
      const description = document.getElementById('prod-desc').value.trim();
      const specs = document.getElementById('prod-specs').value.trim();
      const applications = document.getElementById('prod-applications') ? document.getElementById('prod-applications').value.trim() : '';
      const warranty_policy = document.getElementById('prod-warranty') ? document.getElementById('prod-warranty').value.trim() : '';
      const is_new = document.getElementById('prod-is-new').checked ? 1 : 0;
      const is_promo = document.getElementById('prod-is-promo').checked ? 1 : 0;
      const is_active = document.getElementById('prod-is-active') ? (document.getElementById('prod-is-active').checked ? 1 : 0) : 1;

      const mainImage = currentProductImages.length > 0 ? currentProductImages[0] : (document.getElementById('prod-image').value.trim() || '');

      const payload = {
        name,
        category_id,
        price,
        original_price: original_price || null,
        image: mainImage,
        images: currentProductImages,
        short_desc,
        description,
        specs,
        applications,
        warranty_policy,
        is_new,
        is_promo,
        is_active
      };

      const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          showToast(result.message, 'success');

          const newProdId = result.id || id || Date.now();
          const savedProd = {
            id: Number(newProdId) || newProdId,
            ...payload,
            id: Number(newProdId) || newProdId,
            category_id: Number(category_id),
            price: Number(price),
            original_price: original_price ? Number(original_price) : null,
            created_at: new Date().toISOString()
          };

          const localProds = getLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS);
          const idx = localProds.findIndex(p => String(p.id) === String(savedProd.id));
          if (idx >= 0) localProds[idx] = savedProd;
          else localProds.unshift(savedProd);
          setLocalStore(LOCAL_STORAGE_KEYS.PRODUCTS, localProds);

          const delProdIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_PROD_IDS).filter(x => String(x) !== String(savedProd.id));
          setLocalStore(LOCAL_STORAGE_KEYS.DELETED_PROD_IDS, delProdIds);

          closeProductModal();
          loadProducts();
        } else {
          showToast(result.message, 'error');
        }
      } catch (e) {
        showToast('Lỗi khi lưu sản phẩm!', 'error');
      }
    });
  }

  // 3. Blog Form
  const blogForm = document.getElementById('blog-form');
  if (blogForm) {
    blogForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('blog-id').value;
      const title = document.getElementById('blog-title').value.trim();
      const category = document.getElementById('blog-category') ? document.getElementById('blog-category').value : 'Tin công ty';
      const image = document.getElementById('blog-image').value.trim();
      const summary = document.getElementById('blog-summary').value.trim();
      const content = document.getElementById('blog-content').value.trim();

      const payload = { title, category, image, summary, content };
      const url = id ? `/api/admin/blogs/${id}` : '/api/admin/blogs';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          showToast(result.message, 'success');

          const savedBlog = {
            id: id ? Number(id) : (result.id || (result.data && result.data.id) || Date.now()),
            title,
            category,
            image: image || '/images/blog-saving-hero.jpg',
            summary,
            content,
            author: 'Điện Việt',
            created_at: new Date().toISOString()
          };

          const localBlogs = getLocalStore(LOCAL_STORAGE_KEYS.BLOGS);
          const idx = localBlogs.findIndex(b => String(b.id) === String(savedBlog.id));
          if (idx >= 0) {
            localBlogs[idx] = Object.assign({}, localBlogs[idx], savedBlog);
          } else {
            localBlogs.unshift(savedBlog);
          }
          setLocalStore(LOCAL_STORAGE_KEYS.BLOGS, localBlogs);

          const delBlogIds = getLocalStore(LOCAL_STORAGE_KEYS.DELETED_BLOG_IDS).filter(x => String(x) !== String(savedBlog.id));
          setLocalStore(LOCAL_STORAGE_KEYS.DELETED_BLOG_IDS, delBlogIds);

          syncLocalStoreToServer();

          closeBlogModal();
          loadBlogs();
        } else {
          showToast(result.message, 'error');
        }
      } catch (e) {
        showToast('Lỗi lưu blog!', 'error');
      }
    });
  }

  // Blog Filters (Tìm kiếm bài viết theo tiêu đề & lọc theo danh mục)
  const blogSearch = document.getElementById('admin-blog-search');
  const blogCatFilter = document.getElementById('admin-blog-cat-filter');
  if (blogSearch) {
    blogSearch.addEventListener('input', applyAdminBlogFilters);
  }
  if (blogCatFilter) {
    blogCatFilter.addEventListener('change', applyAdminBlogFilters);
  }

  // 4. Settings Form
  const setForm = document.getElementById('settings-form');
  if (setForm) {
    setForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        company_name: document.getElementById('set-company-name').value.trim(),
        company_slogan: document.getElementById('set-company-slogan').value.trim(),
        phone: document.getElementById('set-phone').value.trim(),
        email: document.getElementById('set-email').value.trim(),
        address: document.getElementById('set-address').value.trim(),
        zalo_link: document.getElementById('set-zalo').value.trim(),
        facebook_link: document.getElementById('set-fb').value.trim(),
        shopee_link: document.getElementById('set-shopee').value.trim(),
        maps_embed: document.getElementById('set-maps').value.trim(),
        about_history: document.getElementById('set-about-history').value.trim(),
        about_mission: document.getElementById('set-about-mission').value.trim(),
        about_values: document.getElementById('set-about-values').value.trim(),
        banner_home: document.getElementById('set-banner-home') ? document.getElementById('set-banner-home').value.trim() : '',
        banner_about: document.getElementById('set-banner-about') ? document.getElementById('set-banner-about').value.trim() : '',
        banner_products: document.getElementById('set-banner-products') ? document.getElementById('set-banner-products').value.trim() : '',
        banner_blogs: document.getElementById('set-banner-blogs') ? document.getElementById('set-banner-blogs').value.trim() : '',
        banner_contact: document.getElementById('set-banner-contact') ? document.getElementById('set-banner-contact').value.trim() : ''
      };

      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          try {
            const currentCached = JSON.parse(localStorage.getItem('dienviet_cached_settings') || '{}');
            const updated = Object.assign({}, currentCached, payload);
            localStorage.setItem('dienviet_cached_settings', JSON.stringify(updated));
          } catch (e) {}
          showToast(result.message, 'success');
        } else {
          showToast(result.message, 'error');
        }
      } catch (e) {
        showToast('Lỗi lưu cài đặt!', 'error');
      }
    });
  }

  // 5. Change Password Form
  const passForm = document.getElementById('change-password-form');
  if (passForm) {
    passForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const errEl = document.getElementById('change-password-error');

      if (errEl) {
        errEl.classList.add('hidden');
        errEl.textContent = '';
      }

      if (newPassword !== confirmPassword) {
        if (errEl) {
          errEl.textContent = 'Mật khẩu mới và xác nhận mật khẩu không khớp!';
          errEl.classList.remove('hidden');
        }
        return;
      }

      if (newPassword.length < 6) {
        if (errEl) {
          errEl.textContent = 'Mật khẩu mới phải có tối thiểu 6 ký tự!';
          errEl.classList.remove('hidden');
        }
        return;
      }

      try {
        const res = await fetch('/api/admin/change-password', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const result = await res.json();
        if (result.success) {
          showToast(result.message || 'Đổi mật khẩu thành công!', 'success');
          closeChangePasswordModal();
        } else {
          if (errEl) {
            errEl.textContent = result.message || 'Đổi mật khẩu thất bại!';
            errEl.classList.remove('hidden');
          } else {
            showToast(result.message || 'Đổi mật khẩu thất bại!', 'error');
          }
        }
      } catch (err) {
        if (errEl) {
          errEl.textContent = 'Lỗi kết nối máy chủ!';
          errEl.classList.remove('hidden');
        } else {
          showToast('Lỗi kết nối máy chủ!', 'error');
        }
      }
    });
  }

  // 6. Tự động lưu khi nhập/dán URL Banner thủ công
  const bannerKeyMap = {
    'set-banner-home': 'banner_home',
    'set-banner-about': 'banner_about',
    'set-banner-products': 'banner_products',
    'set-banner-blogs': 'banner_blogs',
    'set-banner-contact': 'banner_contact'
  };
  Object.keys(bannerKeyMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', async () => {
        const key = bannerKeyMap[id];
        if (key && el.value.trim()) {
          try {
            const res = await fetch('/api/admin/settings', {
              method: 'PUT',
              headers: getAuthHeaders(),
              body: JSON.stringify({ [key]: el.value.trim() })
            });
            const result = await res.json();
            if (result.success) {
              try {
                const currentCached = JSON.parse(localStorage.getItem('dienviet_cached_settings') || '{}');
                currentCached[key] = el.value.trim();
                localStorage.setItem('dienviet_cached_settings', JSON.stringify(currentCached));
              } catch (e) {}
              showToast('Đã tự động lưu Banner mới vào hệ thống!', 'success');
            }
          } catch (err) {
            console.error('Lỗi tự động lưu banner URL:', err);
          }
        }
      });
    }
  });
}

// ========================================================
// 8. ĐỔI MẬT KHẨU ADMIN MODAL
// ========================================================
function openChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (!modal) return;
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  const errEl = document.getElementById('change-password-error');
  if (errEl) {
    errEl.classList.add('hidden');
    errEl.textContent = '';
  }
  modal.classList.add('active');
}

function closeChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.classList.remove('active');
}

// Gắn toàn bộ hàm gọi từ giao diện HTML vào window
window.switchTab = switchTab;
window.logoutAdmin = logoutAdmin;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.toggleCollapseCategory = toggleCollapseCategory;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.toggleProductPromo = toggleProductPromo;
window.toggleProductActive = toggleProductActive;
window.openBlogModal = openBlogModal;
window.closeBlogModal = closeBlogModal;
window.editBlog = editBlog;
window.deleteBlog = deleteBlog;
window.filterContacts = filterContacts;
window.filterContactStatus = filterContactStatus;
window.filterContactType = filterContactType;
window.openContactDetail = openContactDetail;
window.closeContactDetailModal = closeContactDetailModal;
window.updateContactStatus = updateContactStatus;
window.deleteContact = deleteContact;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.changeCategoriesPage = changeCategoriesPage;
window.changeProductsPage = changeProductsPage;
window.changeBlogsPage = changeBlogsPage;
window.changeContactsPage = changeContactsPage;
window.openPriceConfigModal = openPriceConfigModal;
window.closePriceConfigModal = closePriceConfigModal;
window.handlePriceCategoryChange = handlePriceCategoryChange;
window.toggleSelectAllPriceProducts = toggleSelectAllPriceProducts;
window.togglePriceProductSelection = togglePriceProductSelection;
window.handlePriceTypeChange = handlePriceTypeChange;
window.handlePriceValueInput = handlePriceValueInput;
window.updatePricePreview = updatePricePreview;
window.handleBatchPriceAdjustment = handleBatchPriceAdjustment;
