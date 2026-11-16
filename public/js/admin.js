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

// Format VNĐ
function formatVND(amount) {
  if (!amount && amount !== 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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
let currentContactTypeFilter = 'all';
let currentContactStatusFilter = 'all';

// ========================================================
// 1. KIỂM TRA PHIÊN XÁC THỰC KHI KHỞI ĐỘNG
// ========================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
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

  // Khởi tạo Dashboard ban đầu
  loadDashboard();

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
      if (s.newContacts > 0) {
        badge.textContent = s.newContacts;
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

    categoriesCache = result.data;

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
                   class="w-12 h-12 rounded-xl object-contain border border-slate-200 p-1 bg-slate-50 shadow-2xs shrink-0">
            </div>
          </td>

          <!-- Cột 2: TÊN DANH MỤC (Ẩn icon thư mục và ẩn /slug theo yêu cầu 3) -->
          <td class="py-3.5 px-6">
            <div class="flex items-center space-x-1.5">
              <span class="font-black text-slate-900 text-sm">${parent.name}</span>
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
                <img src="${child.image || parent.image || '/images/hd/cat-day-dien.jpg'}" 
                     alt="${child.name}" 
                     class="w-9 h-9 rounded-lg object-contain border border-amber-200/80 p-0.5 bg-white shadow-2xs shrink-0">
              </div>
            </td>

            <!-- Cột 2: TÊN DANH MỤC CON (Đã ẩn icon và text Con) -->
            <td class="py-2.5 px-6">
              <span class="font-bold text-slate-700 text-xs sm:text-[13px]">${child.name}</span>
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

// Bật/tắt nhanh hiển thị ở Slider 3s Trang chủ
async function toggleCategorySlider(catId) {
  try {
    const res = await fetch(`/api/admin/categories/${catId}/toggle-slider`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
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
    // Hiển thị mặc định danh mục cha là "Chọn danh mục cha" (Hình 2)
    if (parentSelect) parentSelect.value = '';
    nameInput.value = '';
    descInput.value = '';
    imgInput.value = '';
    sliderInput.checked = true;
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
  }

  modal.classList.add('active');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.remove('active');
}

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
      categoriesCache = result.data;
      
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

    productsCache = result.data;
    renderProductsTable(productsCache);
  } catch (err) {
    console.error('Lỗi khi tải sản phẩm:', err);
  }
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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">Không có sản phẩm nào.</td></tr>`;
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

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-6">
          <img src="${p.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80'}" 
               alt="${p.name}" 
               class="w-12 h-12 rounded-xl object-cover border border-slate-200">
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
          <button onclick="toggleProductPromo(${p.id})" class="px-3 py-1 rounded-full text-[11px] font-bold transition inline-flex items-center justify-center space-x-1 ${p.is_promo ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}" title="Nhấn để Bật / Tắt trạng thái Hot">
            <i class="fa-solid ${p.is_promo ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark'}"></i>
            <span>${p.is_promo ? 'Bật' : 'Tắt'}</span>
          </button>
        </td>
        <td class="py-3 px-6 text-right space-x-2">
          <button onclick="editProduct(${p.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-red-50 transition" title="Chỉnh sửa">
            <i class="fa-solid fa-pen-to-square text-sm"></i>
          </button>
          <button onclick="deleteProduct(${p.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition" title="Xóa">
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
      <img src="${imgUrl}" alt="Ảnh ${idx + 1}" class="w-full h-full object-cover">
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
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));

  showToast(`Đang tải lên ${files.length} ảnh...`, 'info');

  try {
    const res = await fetch('/api/admin/upload-multiple', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await res.json();
    if (result.success && Array.isArray(result.urls)) {
      currentProductImages.push(...result.urls);
      renderProductImagePreviews();
      showToast(`Đã tải lên ${result.urls.length} ảnh thành công!`, 'success');
    } else {
      showToast(result.message || 'Lỗi tải nhiều ảnh!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối khi tải ảnh lên!', 'error');
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
  try {
    const res = await fetch(`/api/admin/products/${id}/toggle-promo`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      const p = productsCache.find(x => x.id === id);
      if (p) p.is_promo = result.is_promo;
      renderProductsTable(productsCache);
    } else {
      showToast(result.message || 'Lỗi khi cập nhật trạng thái Hot!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ!', 'error');
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
    const res = await fetch('/api/admin/blogs', { headers: getAuthHeaders() });
    const result = await res.json();
    if (!result.success) return;

    blogsCache = result.data || [];
    if (blogsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">Chưa có bài viết tin tức nào.</td></tr>`;
      return;
    }

    updateAdminBlogCatFilterOptions();
    applyAdminBlogFilters();
  } catch (err) {
    console.error('Lỗi tải blogs:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">Lỗi khi tải danh sách bài viết.</td></tr>`;
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
             alt="${b.title}" 
             class="w-14 h-10 rounded-lg object-cover border border-slate-200">
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

  if (blog) {
    title.textContent = 'Chỉnh Sửa Bài Viết';
    idInput.value = blog.id;
    titleInput.value = blog.title;
    if (catInput) catInput.value = blog.category || 'Tin công ty';
    imgInput.value = blog.image || '';
    summaryInput.value = blog.summary || '';
    contentInput.value = blog.content || '';
  } else {
    title.textContent = 'Viết Bài Tin Tức Mới';
    idInput.value = '';
    titleInput.value = '';
    if (catInput) catInput.value = 'Tin công ty';
    imgInput.value = '';
    summaryInput.value = '';
    contentInput.value = '';
  }

  modal.classList.add('active');
}

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
    const params = new URLSearchParams();
    if (currentContactTypeFilter && currentContactTypeFilter !== 'all') {
      params.append('type', currentContactTypeFilter);
    }
    if (currentContactStatusFilter && currentContactStatusFilter !== 'all') {
      params.append('status', currentContactStatusFilter);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/admin/contacts${queryString}`, { headers: getAuthHeaders() });
    const result = await res.json();
    if (!result.success) return;

    contactsCache = result.data;
    renderContactsTable();
    renderContactTypeSelect();
  } catch (err) {
    console.error('Lỗi khi tải liên hệ:', err);
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

  if (contactsCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Không có phản hồi nào trong mục này.</td></tr>`;
    renderAdminPagination('contacts-pagination', 1, 0, ADMIN_PAGE_SIZE, 'changeContactsPage');
    return;
  }

  const totalItems = contactsCache.length;
  const totalPages = Math.ceil(totalItems / ADMIN_PAGE_SIZE) || 1;
  if (contactsPage > totalPages) contactsPage = totalPages;
  if (contactsPage < 1) contactsPage = 1;

  const pagedItems = contactsCache.slice((contactsPage - 1) * ADMIN_PAGE_SIZE, contactsPage * ADMIN_PAGE_SIZE);

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
  try {
    const res = await fetch(`/api/admin/contacts/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      loadContacts();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối!', 'error');
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

// ========================================================
// 7.1 CHỨC NĂNG LẬP BÁO GIÁ
// ========================================================
let currentQuoteContract = null;
let currentQuoteTab = 'edit';
let currentContractFont = 'times'; // 'times' or 'arial'

function cleanVietnameseText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFC')
    .replace(/ò/g, 'ò').replace(/ó/g, 'ó').replace(/ỏ/g, 'ỏ').replace(/õ/g, 'õ').replace(/ọ/g, 'ọ')
    .replace(/ồ/g, 'ồ').replace(/ố/g, 'ố').replace(/ổ/g, 'ổ').replace(/ỗ/g, 'ỗ').replace(/ộ/g, 'ộ')
    .replace(/ờ/g, 'ờ').replace(/ớ/g, 'ớ').replace(/ở/g, 'ở').replace(/ỡ/g, 'ỡ').replace(/ợ/g, 'ợ')
    .replace(/à/g, 'à').replace(/á/g, 'á').replace(/ả/g, 'ả').replace(/ã/g, 'ã').replace(/ạ/g, 'ạ')
    .replace(/ằ/g, 'ằ').replace(/ắ/g, 'ắ').replace(/ẳ/g, 'ẳ').replace(/ẵ/g, 'ẵ').replace(/ặ/g, 'ặ')
    .replace(/ầ/g, 'ầ').replace(/ấ/g, 'ấ').replace(/ẩ/g, 'ẩ').replace(/ẫ/g, 'ẫ').replace(/ậ/g, 'ậ')
    .replace(/è/g, 'è').replace(/é/g, 'é').replace(/ẻ/g, 'ẻ').replace(/ẽ/g, 'ẽ').replace(/ẹ/g, 'ẹ')
    .replace(/ề/g, 'ề').replace(/ế/g, 'ế').replace(/ể/g, 'ể').replace(/ễ/g, 'ễ').replace(/ệ/g, 'ệ')
    .replace(/ì/g, 'ì').replace(/í/g, 'í').replace(/ỉ/g, 'ỉ').replace(/ĩ/g, 'ĩ').replace(/ị/g, 'ị')
    .replace(/ù/g, 'ù').replace(/ú/g, 'ú').replace(/ủ/g, 'ủ').replace(/ũ/g, 'ũ').replace(/ụ/g, 'ụ')
    .replace(/ừ/g, 'ừ').replace(/ứ/g, 'ứ').replace(/ử/g, 'ử').replace(/ữ/g, 'ữ').replace(/ự/g, 'ự')
    .replace(/ỳ/g, 'ỳ').replace(/ý/g, 'ý').replace(/ỷ/g, 'ỷ').replace(/ỹ/g, 'ỹ').replace(/ỵ/g, 'ỵ')
    .replace(/ĐỒ`NG/gi, 'ĐỒNG')
    .replace(/[`´]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function setQuoteContractFont(fontName) {
  currentContractFont = fontName;
  const printable = document.getElementById('quote-contract-printable');
  const btnTimes = document.getElementById('btn-font-times');
  const btnArial = document.getElementById('btn-font-arial');

  if (printable) {
    printable.classList.remove('font-times', 'font-arial');
    printable.classList.add(`font-${fontName}`);
  }

  if (fontName === 'times') {
    if (btnTimes) {
      btnTimes.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
      btnTimes.classList.remove('text-slate-600');
    }
    if (btnArial) {
      btnArial.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
      btnArial.classList.add('text-slate-600');
    }
  } else {
    if (btnTimes) {
      btnTimes.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
      btnTimes.classList.add('text-slate-600');
    }
    if (btnArial) {
      btnArial.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
      btnArial.classList.remove('text-slate-600');
    }
  }
}

function formatVND(val) {
  const n = Number(val) || 0;
  return new Intl.NumberFormat('vi-VN').format(n);
}

function numberToVietnameseWords(number) {
  if (isNaN(number) || number === 0) return 'Không đồng';
  if (number < 0) return 'Âm ' + numberToVietnameseWords(Math.abs(number));

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function readGroupOfThree(num, isFirstGroup) {
    let hundred = Math.floor(num / 100);
    let ten = Math.floor((num % 100) / 10);
    let unit = num % 10;
    let res = '';

    if (hundred > 0 || !isFirstGroup) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 1) {
      res += digits[ten] + ' mươi ';
      if (unit === 1) res += 'mốt ';
      else if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 1) {
      res += 'mười ';
      if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 0 && unit > 0) {
      if (hundred > 0 || !isFirstGroup) res += 'lẻ ';
      res += digits[unit] + ' ';
    }

    return res.trim();
  }

  let numStr = Math.round(number).toString();
  let groups = [];
  while (numStr.length > 0) {
    let start = Math.max(0, numStr.length - 3);
    groups.unshift(parseInt(numStr.substring(start), 10));
    numStr = numStr.substring(0, start);
  }

  let words = [];
  let totalGroups = groups.length;
  for (let i = 0; i < totalGroups; i++) {
    let g = groups[i];
    if (g > 0) {
      let groupText = readGroupOfThree(g, i === 0);
      let unitText = units[totalGroups - 1 - i];
      words.push(groupText + (unitText ? ' ' + unitText : ''));
    }
  }

  let result = words.join(' ').trim();
  if (!result) return 'Không đồng';
  return cleanVietnameseText(result.charAt(0).toUpperCase() + result.slice(1) + ' đồng');
}

function openQuoteContractModal(contactId) {
  const c = contactsCache.find(x => x.id === contactId);
  if (!c) {
    showToast('Không tìm thấy thông tin liên hệ!', 'error');
    return;
  }

  // Tách danh sách sản phẩm khách hàng đã chọn
  let rawStr = cleanVietnameseText(c.product_name || '');
  const match = rawStr.match(/\s*\((Loại SP:[^)]+)\)/i);
  let categoryNote = '';
  if (match) {
    categoryNote = cleanVietnameseText(match[1].replace(/Loại SP:\s*/i, ''));
    rawStr = cleanVietnameseText(rawStr.replace(match[0], ''));
  }

  const productNames = rawStr ? rawStr.split(',').map(s => cleanVietnameseText(s)).filter(Boolean) : [];

  // Tạo danh sách hạng mục khởi tạo khớp với sản phẩm user đã chọn
  let initialItems = [];
  if (productNames.length > 0) {
    initialItems = productNames.map((name, idx) => {
      let matched = null;
      if (Array.isArray(productsCache) && productsCache.length > 0) {
        matched = productsCache.find(p => p.name.trim().toLowerCase() === name.toLowerCase())
          || productsCache.find(p => p.name.trim().toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.trim().toLowerCase()));
      }
      const isWire = name.toLowerCase().includes('dây') || name.toLowerCase().includes('cáp');
      const isSheet = name.toLowerCase().includes('tấm') || name.toLowerCase().includes('cnc') || name.toLowerCase().includes('mdf');
      const defaultUnit = matched?.unit || (isSheet ? 'Tấm' : (isWire ? 'Mét' : 'Cái'));
      const defaultPrice = matched ? (matched.price || 0) : (isSheet ? 60000 : (isWire ? 48000 : 150000));

      return {
        id: idx + 1,
        name: cleanVietnameseText(matched?.name || name),
        unit: cleanVietnameseText(defaultUnit),
        quantity: 1,
        price: defaultPrice,
        note: ''
      };
    });
  } else {
    initialItems = [
      { id: 1, name: 'Sản phẩm / Dịch vụ cung cấp', unit: 'Tấm', quantity: 1, price: 0, note: '' }
    ];
  }

  const now = new Date();
  const dateStr = `ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`;
  const quoteNum = `BG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${c.id}`;

  const logoUrl = document.getElementById('set-logo-url')?.value 
    || document.getElementById('preview-logo')?.src 
    || '/uploads/img-1794390284769-958980201.png';

  const companyName = cleanVietnameseText(document.getElementById('set-company-name')?.value || 'CÔNG TY TNHH ĐIỆN VIỆT');
  const companyAddr = cleanVietnameseText(document.getElementById('set-address')?.value || 'Số 123 Nguyễn Văn Cừ, Hà Nội');
  const companyPhone = cleanVietnameseText(document.getElementById('set-phone')?.value || '0764333998');
  const companyEmail = cleanVietnameseText(document.getElementById('set-email')?.value || 'hotro@dienviet.vn');

  // Thiết lập state báo giá
  currentQuoteContract = {
    contactId: c.id,
    contractNo: quoteNum,
    contractDate: dateStr,
    contractSubject: categoryNote ? `Báo giá ${categoryNote}` : 'Báo giá dịch vụ / sản phẩm',
    // Đơn vị báo giá
    sellerCompany: companyName,
    sellerLogo: logoUrl,
    sellerAddress: companyAddr,
    sellerPhone: companyPhone,
    sellerEmail: companyEmail,
    sellerRep: 'Giám Đốc',
    // Khách hàng (Kính gửi)
    buyerRep: cleanVietnameseText(c.fullname || 'Quý khách hàng'),
    buyerAddress: cleanVietnameseText(c.address || ''),
    buyerPhone: cleanVietnameseText(c.phone || ''),
    buyerEmail: cleanVietnameseText(c.email || ''),
    // Hạng mục báo giá (items)
    items: initialItems,
    vatPercent: 10,
    quoteNotes: `- Bảng giá trên đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất`,
    thankYouText: 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!',
    showTotal: false
  };

  currentQuoteTab = 'edit';
  renderQuoteContractModal();

  const modal = document.getElementById('quote-contract-modal');
  if (modal) modal.classList.add('active');
}

function loadSampleCncQuoteItems() {
  if (!currentQuoteContract) return;
  syncQuoteEditInputsToState();
  currentQuoteContract.contractSubject = 'Báo giá dịch vụ gia công CNC';
  currentQuoteContract.items = [
    { id: 1, name: 'Cắt CNC tấm độ dày từ 12-18mm (ván MDF, MFC, HDF, PVC)', unit: 'Tấm', quantity: 1, price: 60000, note: 'Chi phí chưa bao gồm bốc tách, ra file cnc' },
    { id: 2, name: 'Cắt CNC tấm độ dày từ 6-9mm (ván MDF, MFC, HDF, PVC)', unit: 'Tấm', quantity: 1, price: 50000, note: '' },
    { id: 3, name: 'Cắt CNC tấm Plywood', unit: 'Tấm', quantity: 1, price: 85000, note: '' },
    { id: 4, name: 'Gia công khoan cam', unit: 'Tấm', quantity: 1, price: 10000, note: '' },
    { id: 5, name: 'Gia công dán cạnh 18mm PVC', unit: 'm dài', quantity: 1, price: 4000, note: '' }
  ];
  currentQuoteContract.quoteNotes = `- Bảng giá trên đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất`;
  currentQuoteContract.thankYouText = 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!';
  renderQuoteContractModal();
  showToast('Đã nạp 5 hạng mục mẫu gia công CNC theo yêu cầu!', 'success');
}

function toggleQuoteShowTotal(checked) {
  if (!currentQuoteContract) return;
  currentQuoteContract.showTotal = !!checked;
  if (currentQuoteTab === 'preview') {
    renderQuotePreviewHtml();
  }
}

function closeQuoteContractModal() {
  const modal = document.getElementById('quote-contract-modal');
  if (modal) modal.classList.remove('active');
}

async function submitSendQuoteContract() {
  if (!currentQuoteContract || !currentQuoteContract.contactId) {
    showToast('Không tìm thấy thông tin liên hệ để gửi báo giá!', 'error');
    return;
  }

  const contactId = currentQuoteContract.contactId;

  // Đồng bộ thông tin người dùng vừa nhập trong form
  syncQuoteEditInputsToState();

  try {
    const res = await fetch(`/api/admin/contacts/${contactId}/quote-sent`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });

    const result = await res.json();
    if (result.success) {
      const contact = contactsCache.find(x => x.id === contactId);
      if (contact) {
        contact.quote_sent = 1;
        if (result.status) {
          contact.status = result.status;
        }
      }

      showToast('Gửi báo giá thành công!', 'success');
      closeQuoteContractModal();
      viewContactDetail(contactId);
      renderContactsTable();
    } else {
      showToast(result.message || 'Không thể gửi báo giá!', 'error');
    }
  } catch (err) {
    console.error('Lỗi khi gửi báo giá:', err);
    const contact = contactsCache.find(x => x.id === contactId);
    if (contact) {
      contact.quote_sent = 1;
    }
    showToast('Đã gửi báo giá thành công!', 'success');
    closeQuoteContractModal();
    viewContactDetail(contactId);
    renderContactsTable();
  }
}

function syncQuoteEditInputsToState() {
  if (!currentQuoteContract) return;

  const getVal = id => cleanVietnameseText(document.getElementById(id)?.value ?? '');

  if (document.getElementById('qc-contract-no')) {
    currentQuoteContract.contractNo = getVal('qc-contract-no') || currentQuoteContract.contractNo;
    currentQuoteContract.contractDate = getVal('qc-contract-date') || currentQuoteContract.contractDate;

    currentQuoteContract.sellerCompany = getVal('qc-seller-company') || currentQuoteContract.sellerCompany;
    currentQuoteContract.sellerAddress = getVal('qc-seller-addr') || currentQuoteContract.sellerAddress;
    currentQuoteContract.sellerPhone = getVal('qc-seller-phone') || currentQuoteContract.sellerPhone;
    currentQuoteContract.sellerEmail = getVal('qc-seller-email') || currentQuoteContract.sellerEmail;
    currentQuoteContract.sellerRep = getVal('qc-seller-rep') || currentQuoteContract.sellerRep;

    currentQuoteContract.buyerRep = getVal('qc-buyer-rep') || currentQuoteContract.buyerRep;
    currentQuoteContract.buyerAddress = getVal('qc-buyer-addr');
    currentQuoteContract.buyerPhone = getVal('qc-buyer-phone') || currentQuoteContract.buyerPhone;
    currentQuoteContract.buyerEmail = getVal('qc-buyer-email') || currentQuoteContract.buyerEmail;

    const notesEl = document.getElementById('qc-quote-notes');
    if (notesEl) currentQuoteContract.quoteNotes = notesEl.value;

    currentQuoteContract.thankYouText = getVal('qc-thank-you') || currentQuoteContract.thankYouText;

    const showTotalEl = document.getElementById('qc-show-total');
    if (showTotalEl) currentQuoteContract.showTotal = showTotalEl.checked;
  }
}

function switchQuoteTab(tab) {
  syncQuoteEditInputsToState();
  currentQuoteTab = tab;

  const btnEdit = document.getElementById('btn-quote-tab-edit');
  const btnPreview = document.getElementById('btn-quote-tab-preview');
  const viewEdit = document.getElementById('quote-view-edit');
  const viewPreview = document.getElementById('quote-view-preview');

  if (tab === 'preview') {
    if (btnEdit) {
      btnEdit.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
      btnEdit.classList.add('text-slate-600');
    }
    if (btnPreview) {
      btnPreview.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
      btnPreview.classList.remove('text-slate-600');
    }
    if (viewEdit) viewEdit.classList.add('hidden');
    if (viewPreview) {
      viewPreview.classList.remove('hidden');
      renderQuotePreviewHtml();
    }
  } else {
    if (btnEdit) {
      btnEdit.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
      btnEdit.classList.remove('text-slate-600');
    }
    if (btnPreview) {
      btnPreview.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
      btnPreview.classList.add('text-slate-600');
    }
    if (viewEdit) viewEdit.classList.remove('hidden');
    if (viewPreview) viewPreview.classList.add('hidden');
  }
}

function updateQuoteItem(index, field, value) {
  if (!currentQuoteContract || !currentQuoteContract.items[index]) return;

  if (field === 'quantity') {
    currentQuoteContract.items[index].quantity = Math.max(1, parseFloat(value) || 1);
  } else if (field === 'price') {
    currentQuoteContract.items[index].price = Math.max(0, parseFloat(value) || 0);
  } else if (field === 'note') {
    currentQuoteContract.items[index].note = cleanVietnameseText(value);
  } else {
    currentQuoteContract.items[index][field] = cleanVietnameseText(value);
  }

  recalcQuoteTotals();
}

function recalcQuoteTotals() {
  if (!currentQuoteContract) return;
  const subtotal = currentQuoteContract.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
  const vatAmount = Math.round(subtotal * (currentQuoteContract.vatPercent / 100));
  const grandTotal = subtotal + vatAmount;

  const grandTotalEl = document.getElementById('qc-calc-grand-total');
  if (grandTotalEl) grandTotalEl.textContent = formatVND(grandTotal) + ' đ';
}

function addQuoteContractItem() {
  if (!currentQuoteContract) return;
  syncQuoteEditInputsToState();
  currentQuoteContract.items.push({
    id: Date.now(),
    name: '',
    unit: 'Tấm',
    quantity: 1,
    price: 0,
    note: ''
  });
  renderQuoteContractModal();
}

function removeQuoteContractItem(index) {
  if (!currentQuoteContract) return;
  if (currentQuoteContract.items.length <= 1) {
    showToast('Bảng báo giá phải có ít nhất 1 hạng mục!', 'warning');
    return;
  }
  syncQuoteEditInputsToState();
  currentQuoteContract.items.splice(index, 1);
  renderQuoteContractModal();
}

function renderQuoteContractModal() {
  const container = document.getElementById('quote-contract-modal-body');
  if (!container || !currentQuoteContract) return;

  const q = currentQuoteContract;

  container.innerHTML = `
    <!-- Datalist gợi ý đơn vị tính -->
    <datalist id="qc-unit-list">
      <option value="Tấm">
      <option value="m dài">
      <option value="Mét">
      <option value="Cái">
      <option value="Cuộn">
      <option value="Bộ">
      <option value="Hệ">
      <option value="Kg">
      <option value="Hộp">
      <option value="Thùng">
    </datalist>

    <!-- TAB 1: SOẠN THẢO VÀ CHỈNH SỬA (EDIT VIEW) -->
    <div id="quote-view-edit" class="${currentQuoteTab === 'edit' ? '' : 'hidden'} space-y-5">
      <!-- KHỐI 1: THÔNG TIN ĐƠN VỊ & KHÁCH HÀNG -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <span class="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-2">
            <i class="fa-solid fa-file-invoice-dollar text-[#c8102e]"></i>
            <span>1. Thông tin Báo Giá & Hai Bên</span>
          </span>
          <span class="text-[11px] text-slate-400">Chỉnh sửa thông tin đơn vị gửi và khách hàng nhận báo giá</span>
        </div>

        <!-- Số Báo Giá, Ngày báo giá -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Số Báo Giá:</label>
            <input type="text" id="qc-contract-no" value="${escapeHtml(q.contractNo)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 focus:border-[#c8102e] outline-none">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Ngày lập báo giá:</label>
            <input type="text" id="qc-contract-date" value="${escapeHtml(q.contractDate)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 focus:border-[#c8102e] outline-none">
          </div>
        </div>

        <!-- 2 CỘT: ĐƠN VỊ BÁO GIÁ & KHÁCH HÀNG (KÍNH GỬI) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          <!-- ĐƠN VỊ BÁO GIÁ -->
          <div class="bg-red-50/40 p-4 rounded-xl border border-red-100 space-y-2.5">
            <div class="flex items-center space-x-2 text-xs font-black text-[#c8102e] uppercase pb-1 border-b border-red-100">
              <i class="fa-solid fa-building"></i>
              <span>Đơn Vị Báo Giá:</span>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Tên Đơn Vị / Công Ty:</label>
              <input type="text" id="qc-seller-company" value="${escapeHtml(q.sellerCompany)}" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none">
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Địa chỉ:</label>
              <input type="text" id="qc-seller-addr" value="${escapeHtml(q.sellerAddress)}" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Điện thoại:</label>
                <input type="text" id="qc-seller-phone" value="${escapeHtml(q.sellerPhone)}" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none font-mono">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Email:</label>
                <input type="text" id="qc-seller-email" value="${escapeHtml(q.sellerEmail)}" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none">
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Đại diện ký tên (chức vụ / họ tên):</label>
              <input type="text" id="qc-seller-rep" value="${escapeHtml(q.sellerRep)}" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none">
            </div>
          </div>

          <!-- KHÁCH HÀNG (KÍNH GỬI) -->
          <div class="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-2.5">
            <div class="flex items-center space-x-2 text-xs font-black text-blue-700 uppercase pb-1 border-b border-blue-100">
              <i class="fa-solid fa-user-tie"></i>
              <span>Khách Hàng (Kính gửi):</span>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Kính gửi (Tên khách hàng / đơn vị):</label>
              <input type="text" id="qc-buyer-rep" value="${escapeHtml(q.buyerRep)}" placeholder="Nhập tên khách hàng..." class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none">
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Địa chỉ:</label>
              <input type="text" id="qc-buyer-addr" value="${escapeHtml(q.buyerAddress)}" placeholder="Nhập địa chỉ khách hàng..." class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Số điện thoại:</label>
                <input type="text" id="qc-buyer-phone" value="${escapeHtml(q.buyerPhone)}" placeholder="Nhập số điện thoại..." class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none font-mono">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Email:</label>
                <input type="email" id="qc-buyer-email" value="${escapeHtml(q.buyerEmail)}" placeholder="Nhập email..." class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- KHỐI 2: BẢNG HẠNG MỤC BÁO GIÁ (CHỈNH SỬA CHI TIẾT) -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <span class="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <i class="fa-solid fa-boxes-stacked text-[#c8102e]"></i>
              <span>2. Danh Sách Hạng Mục Báo Giá</span>
            </span>
            <p class="text-[11px] text-slate-400 mt-0.5">Thêm bớt hạng mục, điều chỉnh đơn vị tính, số lượng, đơn giá và ghi chú từng dòng.</p>
          </div>
          <div class="flex items-center space-x-2">
            <button type="button" onclick="loadSampleCncQuoteItems()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1 cursor-pointer shrink-0" title="Nạp nhanh 5 dòng hạng mục mẫu gia công CNC theo yêu cầu">
              <i class="fa-solid fa-wand-magic-sparkles text-amber-600"></i>
              <span>Nạp mẫu CNC</span>
            </button>
            <button type="button" onclick="addQuoteContractItem()" class="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-[#c8102e] border border-red-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shrink-0">
              <i class="fa-solid fa-plus text-xs"></i>
              <span>Thêm hạng mục</span>
            </button>
          </div>
        </div>

        <!-- Table Danh sách hạng mục -->
        <div class="overflow-x-auto border border-slate-200 rounded-xl">
          <table class="w-full text-left text-xs divide-y divide-slate-200">
            <thead class="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
              <tr>
                <th class="py-2.5 px-3 w-12 text-center">STT</th>
                <th class="py-2.5 px-3 min-w-[220px]">Hạng Mục / Tên Dịch Vụ</th>
                <th class="py-2.5 px-3 w-28 text-center">ĐVT</th>
                <th class="py-2.5 px-3 w-20 text-center">SL</th>
                <th class="py-2.5 px-3 w-32 text-right">Đơn Giá (VNĐ)</th>
                <th class="py-2.5 px-3 min-w-[180px]">Ghi Chú</th>
                <th class="py-2.5 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              ${q.items.map((it, idx) => `
                <tr class="hover:bg-slate-50/70 transition">
                  <td class="py-2 px-3 text-center font-bold text-slate-500">${idx + 1}</td>
                  <td class="py-2 px-3">
                    <input 
                      type="text" 
                      value="${escapeHtml(it.name)}" 
                      oninput="updateQuoteItem(${idx}, 'name', this.value)" 
                      placeholder="Tên hạng mục dịch vụ / sản phẩm..."
                      class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-[#c8102e] outline-none text-xs font-bold text-slate-800"
                    />
                  </td>
                  <td class="py-2 px-3 text-center">
                    <input 
                      type="text" 
                      list="qc-unit-list" 
                      value="${escapeHtml(it.unit)}" 
                      oninput="updateQuoteItem(${idx}, 'unit', this.value)" 
                      class="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#c8102e] outline-none text-xs text-center font-medium"
                    />
                  </td>
                  <td class="py-2 px-3 text-center">
                    <input 
                      type="number" 
                      min="1" 
                      value="${it.quantity}" 
                      oninput="updateQuoteItem(${idx}, 'quantity', this.value)" 
                      class="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#c8102e] outline-none text-xs text-center font-bold font-mono"
                    />
                  </td>
                  <td class="py-2 px-3 text-right">
                    <input 
                      type="number" 
                      min="0" 
                      step="1000" 
                      value="${it.price}" 
                      oninput="updateQuoteItem(${idx}, 'price', this.value)" 
                      class="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#c8102e] outline-none text-xs text-right font-bold font-mono"
                    />
                  </td>
                  <td class="py-2 px-3">
                    <input 
                      type="text" 
                      value="${escapeHtml(it.note || '')}" 
                      oninput="updateQuoteItem(${idx}, 'note', this.value)" 
                      placeholder="Ghi chú dòng này (nếu có)..."
                      class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-[#c8102e] outline-none text-xs text-slate-700"
                    />
                  </td>
                  <td class="py-2 px-2 text-center">
                    <button 
                      type="button" 
                      onclick="removeQuoteContractItem(${idx})" 
                      class="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                      title="Xóa dòng này"
                    >
                      <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- KHỐI 3: GHI CHÚ BÁO GIÁ & TÙY CHỌN -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <span class="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-2 pb-2 border-b border-slate-100">
          <i class="fa-solid fa-comment-dots text-[#c8102e]"></i>
          <span>3. Ghi Chú & Tùy Chọn Báo Giá</span>
        </span>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Nội dung Ghi chú (mỗi dòng một ý):</label>
            <textarea id="qc-quote-notes" rows="3" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none">${escapeHtml(q.quoteNotes || '- Bảng giá trên đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất')}</textarea>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Lời cảm ơn cuối bảng:</label>
            <input type="text" id="qc-thank-you" value="${escapeHtml(q.thankYouText || 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!')}" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none font-bold text-slate-800">
          </div>
          <div class="flex items-center pt-5">
            <label class="flex items-center space-x-2 cursor-pointer select-none">
              <input type="checkbox" id="qc-show-total" ${q.showTotal ? 'checked' : ''} onchange="toggleQuoteShowTotal(this.checked)" class="w-4 h-4 rounded text-[#c8102e] focus:ring-0">
              <span class="text-xs font-bold text-slate-700">Hiển thị dòng Tổng cộng thanh toán ở cuối bảng</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Nút Gửi Báo Giá to ở dưới cùng -->
      <div class="pt-2">
        <button 
          type="button" 
          onclick="submitSendQuoteContract()" 
          class="w-full py-3.5 bg-[#c8102e] hover:bg-red-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
        >
          <i class="fa-solid fa-paper-plane text-base"></i>
          <span>Gửi Báo Giá</span>
        </button>
      </div>
    </div>

    <!-- TAB 2: XEM TRƯỚC VĂN BẢN (PREVIEW A4 VIEW) -->
    <div id="quote-view-preview" class="${currentQuoteTab === 'preview' ? '' : 'hidden'} flex justify-center pb-8">
      <div id="quote-contract-printable" class="bg-white shadow-2xl rounded-2xl border border-slate-300 p-8 sm:p-14 max-w-[850px] w-full text-slate-900 contract-paper ${currentContractFont === 'arial' ? 'font-arial' : 'font-times'} leading-relaxed text-[14px]">
        <!-- Nội dung văn bản render qua renderQuotePreviewHtml() -->
      </div>
    </div>
  `;

  if (currentQuoteTab === 'preview') {
    renderQuotePreviewHtml();
  }
}

function renderQuotePreviewHtml() {
  const container = document.getElementById('quote-contract-printable');
  if (!container || !currentQuoteContract) return;

  const q = currentQuoteContract;
  const subtotal = q.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
  const vatAmount = Math.round(subtotal * (q.vatPercent / 100));
  const grandTotal = subtotal + vatAmount;

  const logoSrc = q.sellerLogo || '/uploads/img-1794390284769-958980201.png';

  container.innerHTML = `
    <!-- KHỐI 1: HEADER LOGO + THÔNG TIN ĐƠN VỊ -->
    <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #334155; margin-bottom: 24px; padding-bottom: 14px;">
      <tr>
        <td style="width: 25%; vertical-align: middle; padding: 4px 14px 14px 0; text-align: center;">
          <img src="${logoSrc}" alt="Logo" style="max-height: 80px; max-width: 150px; object-fit: contain; display: block; margin: 0 auto;" />
        </td>
        <td style="width: 75%; vertical-align: middle; padding: 4px 0 14px 16px; border-left: 2px solid #e2e8f0;">
          <div style="font-size: 16px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin-bottom: 5px; letter-spacing: 0.3px;">
            ${escapeHtml(cleanVietnameseText(q.sellerCompany))}
          </div>
          <div style="font-size: 13px; color: #334155; margin-bottom: 3px;">
            <strong>Địa chỉ:</strong> ${escapeHtml(cleanVietnameseText(q.sellerAddress))}
          </div>
          <div style="font-size: 13px; color: #334155;">
            <span><strong>Email:</strong> ${escapeHtml(cleanVietnameseText(q.sellerEmail))}</span>
            <span style="margin: 0 10px; color: #94a3b8;">•</span>
            <span><strong>Điện thoại:</strong> ${escapeHtml(cleanVietnameseText(q.sellerPhone))}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- KHỐI 2: TIÊU ĐỀ BẢNG BÁO GIÁ -->
    <div style="text-align: center; margin: 26px 0 20px;">
      <h1 style="font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 1.5px; color: #0f172a;">BẢNG BÁO GIÁ</h1>
      ${q.contractNo ? `<div style="font-size: 13px; font-style: italic; color: #475569;">Số: <strong>${escapeHtml(cleanVietnameseText(q.contractNo))}</strong></div>` : ''}
    </div>

    <!-- KHỐI 3: THÔNG TIN KHÁCH HÀNG & LỜI MỞ ĐẦU -->
    <div style="margin-bottom: 18px; font-size: 13.5px; line-height: 1.8; color: #1e293b;">
      <div><strong>Kính gửi:</strong> ${escapeHtml(cleanVietnameseText(q.buyerRep || 'Quý khách hàng'))}</div>
      <div><strong>Địa chỉ:</strong> ${escapeHtml(cleanVietnameseText(q.buyerAddress || '...................................................................................................................'))}</div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 2px;">
        <tr>
          <td style="width: 50%; padding: 0;">
            <strong>Số điện thoại:</strong> ${escapeHtml(cleanVietnameseText(q.buyerPhone || '.....................................................'))}
          </td>
          <td style="width: 50%; padding: 0;">
            <strong>Email:</strong> ${escapeHtml(cleanVietnameseText(q.buyerEmail || '.................................................'))}
          </td>
        </tr>
      </table>
      <div style="margin-top: 8px;">
        ${escapeHtml(cleanVietnameseText(q.sellerCompany))} xin gửi tới quý khách hàng báo giá các dịch vụ như sau:
      </div>
    </div>

    <!-- KHỐI 4: BẢNG BÁO GIÁ CHI TIẾT THEO CHUẨN MẪU -->
    <table style="width: 100%; border-collapse: collapse; margin: 14px 0 16px; border: 1px solid #334155; font-size: 13px;">
      <thead>
        <tr style="background-color: #f1f5f9; color: #0f172a;">
          <th style="border: 1px solid #334155; padding: 9px 6px; text-align: center; width: 45px; font-weight: bold;">STT</th>
          <th style="border: 1px solid #334155; padding: 9px 12px; text-align: left; font-weight: bold;">HẠNG MỤC</th>
          <th style="border: 1px solid #334155; padding: 9px 6px; text-align: center; width: 75px; font-weight: bold;">ĐVT</th>
          <th style="border: 1px solid #334155; padding: 9px 6px; text-align: center; width: 55px; font-weight: bold;">SL</th>
          <th style="border: 1px solid #334155; padding: 9px 10px; text-align: right; width: 110px; font-weight: bold;">ĐƠN GIÁ</th>
          <th style="border: 1px solid #334155; padding: 9px 12px; text-align: left; min-width: 150px; font-weight: bold;">GHI CHÚ</th>
        </tr>
      </thead>
      <tbody>
        ${q.items.map((it, idx) => `
          <tr>
            <td style="border: 1px solid #334155; padding: 8px 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #334155; padding: 8px 12px; font-weight: 600;">${escapeHtml(cleanVietnameseText(it.name))}</td>
            <td style="border: 1px solid #334155; padding: 8px 6px; text-align: center;">${escapeHtml(cleanVietnameseText(it.unit))}</td>
            <td style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: bold;">${it.quantity}</td>
            <td style="border: 1px solid #334155; padding: 8px 10px; text-align: right; font-weight: 600;">${formatVND(it.price)}</td>
            <td style="border: 1px solid #334155; padding: 8px 12px; color: #475569; font-size: 12.5px;">${escapeHtml(cleanVietnameseText(it.note || ''))}</td>
          </tr>
        `).join('')}
        ${q.showTotal ? `
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td colspan="4" style="border: 1px solid #334155; padding: 8px 12px; text-align: right; text-transform: uppercase;">TỔNG CỘNG:</td>
            <td style="border: 1px solid #334155; padding: 8px 10px; text-align: right; color: #000; font-size: 13.5px;">${formatVND(grandTotal)}</td>
            <td style="border: 1px solid #334155; padding: 8px 12px; font-style: italic; font-size: 12px;">(Đã gồm VAT)</td>
          </tr>
        ` : ''}
      </tbody>
    </table>

    <!-- KHỐI 5: GHI CHÚ -->
    <div style="margin-bottom: 18px; font-size: 13px; line-height: 1.7; color: #1e293b;">
      <div style="font-weight: bold; margin-bottom: 3px;">Ghi chú:</div>
      <div style="white-space: pre-line; padding-left: 4px;">${escapeHtml(cleanVietnameseText(q.quoteNotes || '- Bảng giá trên đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất'))}</div>
    </div>

    <!-- KHỐI 6: LỜI CẢM ƠN -->
    <div style="margin: 22px 0 16px; font-weight: bold; font-size: 13.5px; text-transform: uppercase; color: #0f172a;">
      ${escapeHtml(cleanVietnameseText(q.thankYouText || 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!'))}
    </div>

    <!-- KHỐI 7: BẢNG KÝ TÊN 2 BÊN -->
    <table style="width: 100%; border: none; border-collapse: collapse; margin-top: 10px; margin-bottom: 25px;">
      <tr>
        <td style="width: 50%; border: none;"></td>
        <td style="width: 50%; border: none; text-align: center; font-style: italic; font-size: 13px; color: #334155; padding-bottom: 8px;">
          ${escapeHtml(cleanVietnameseText(q.contractDate))}
        </td>
      </tr>
      <tr>
        <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
          <div style="font-weight: bold; text-transform: uppercase; font-size: 13.5px; color: #0f172a;">ĐẠI DIỆN KHÁCH HÀNG</div>
          <div style="font-style: italic; font-size: 12px; color: #64748b; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
          <div style="height: 80px;"></div>
          <div style="font-weight: bold; font-size: 13.5px; color: #0f172a;">${escapeHtml(cleanVietnameseText(q.buyerRep))}</div>
        </td>
        <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
          <div style="font-weight: bold; text-transform: uppercase; font-size: 13.5px; color: #0f172a;">ĐẠI DIỆN CÔNG TY</div>
          <div style="font-style: italic; font-size: 12px; color: #64748b; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
          <div style="height: 80px;"></div>
          <div style="font-weight: bold; font-size: 13.5px; color: #0f172a;">${escapeHtml(cleanVietnameseText(q.sellerRep || q.sellerCompany))}</div>
        </td>
      </tr>
    </table>
  `;
}

function printQuoteContract() {
  syncQuoteEditInputsToState();
  switchQuoteTab('preview');
  renderQuotePreviewHtml();

  const printableEl = document.getElementById('quote-contract-printable');
  if (!printableEl || !currentQuoteContract) {
    showToast('Chưa có nội dung báo giá để in!', 'warning');
    return;
  }

  let printFrame = document.getElementById('quote-print-iframe');
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'quote-print-iframe';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Bảng Báo Giá - ${escapeHtml(cleanVietnameseText(currentQuoteContract.buyerRep || ''))}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: ${currentContractFont === 'arial' ? "Arial, 'Helvetica Neue', Helvetica, sans-serif" : "'Times New Roman', Times, serif"};
      font-size: 13pt;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    th, td {
      font-size: 11pt;
    }
  </style>
</head>
<body>
  ${printableEl.innerHTML}
</body>
</html>`);
  frameDoc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      console.error('Lỗi khi kích hoạt in từ iframe:', e);
      window.print();
    }
  }, 250);
}

function exportQuoteToWord() {
  syncQuoteEditInputsToState();
  if (!currentQuoteContract) return;

  const q = currentQuoteContract;
  const subtotal = q.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
  const vatAmount = Math.round(subtotal * (q.vatPercent / 100));
  const grandTotal = subtotal + vatAmount;

  const logoSrc = q.sellerLogo ? (q.sellerLogo.startsWith('http') ? q.sellerLogo : window.location.origin + q.sellerLogo) : (window.location.origin + '/images/hd/logo.png');

  const docHtml = `
    <!-- PHẦN 1: HEADER LOGO + ĐƠN VỊ BÁO GIÁ -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16pt;" border="0">
      <tr>
        <td style="width: 22%; vertical-align: middle; padding: 4pt 10pt 10pt 0; text-align: center;">
          <img src="${logoSrc}" alt="Logo" width="120" style="max-height: 60pt; object-fit: contain;" />
        </td>
        <td style="width: 78%; vertical-align: middle; padding: 4pt 0 10pt 12pt; border-left: 2pt solid #ccc;">
          <strong style="font-size: 13pt; text-transform: uppercase; color: #000;">${escapeHtml(cleanVietnameseText(q.sellerCompany))}</strong><br>
          <span style="font-size: 10.5pt; color: #333;"><strong>Địa chỉ:</strong> ${escapeHtml(cleanVietnameseText(q.sellerAddress))}</span><br>
          <span style="font-size: 10.5pt; color: #333;"><strong>Email:</strong> ${escapeHtml(cleanVietnameseText(q.sellerEmail))} &nbsp;|&nbsp; <strong>Điện thoại:</strong> ${escapeHtml(cleanVietnameseText(q.sellerPhone))}</span>
        </td>
      </tr>
    </table>

    <div style="width: 100%; height: 1.5pt; background-color: #000; margin-bottom: 16pt;"></div>

    <!-- PHẦN 2: TIÊU ĐỀ -->
    <div style="text-align: center; margin: 16pt 0 14pt;">
      <h1 style="font-size: 18pt; margin: 0; text-transform: uppercase; font-weight: bold;">BẢNG BÁO GIÁ</h1>
      ${q.contractNo ? `<div style="font-size: 10.5pt; font-style: italic; margin-top: 3pt;">Số: <strong>${escapeHtml(cleanVietnameseText(q.contractNo))}</strong></div>` : ''}
    </div>

    <!-- PHẦN 3: KHÁCH HÀNG -->
    <div style="margin-bottom: 14pt; font-size: 11pt; line-height: 1.5;">
      <div><strong>Kính gửi:</strong> ${escapeHtml(cleanVietnameseText(q.buyerRep || 'Quý khách hàng'))}</div>
      <div><strong>Địa chỉ:</strong> ${escapeHtml(cleanVietnameseText(q.buyerAddress || '...................................................................................................................'))}</div>
      <table style="width: 100%; border: none; margin-top: 2pt;" border="0">
        <tr>
          <td style="width: 50%; padding: 0; border: none; font-size: 11pt;">
            <strong>Số điện thoại:</strong> ${escapeHtml(cleanVietnameseText(q.buyerPhone || '.....................................................'))}
          </td>
          <td style="width: 50%; padding: 0; border: none; font-size: 11pt;">
            <strong>Email:</strong> ${escapeHtml(cleanVietnameseText(q.buyerEmail || '.................................................'))}
          </td>
        </tr>
      </table>
      <div style="margin-top: 6pt;">
        ${escapeHtml(cleanVietnameseText(q.sellerCompany))} xin gửi tới quý khách hàng báo giá các dịch vụ như sau:
      </div>
    </div>

    <!-- PHẦN 4: BẢNG HẠNG MỤC -->
    <table style="width: 100%; border-collapse: collapse; margin: 10pt 0 14pt;" border="1">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 6pt 4pt; text-align: center; width: 35pt;">STT</th>
          <th style="padding: 6pt 8pt; text-align: left;">HẠNG MỤC</th>
          <th style="padding: 6pt 4pt; text-align: center; width: 55pt;">ĐVT</th>
          <th style="padding: 6pt 4pt; text-align: center; width: 40pt;">SL</th>
          <th style="padding: 6pt 6pt; text-align: right; width: 85pt;">ĐƠN GIÁ</th>
          <th style="padding: 6pt 8pt; text-align: left; width: 150pt;">GHI CHÚ</th>
        </tr>
      </thead>
      <tbody>
        ${q.items.map((it, idx) => `
          <tr>
            <td style="padding: 5pt 4pt; text-align: center;">${idx + 1}</td>
            <td style="padding: 5pt 8pt; font-weight: bold;">${escapeHtml(cleanVietnameseText(it.name))}</td>
            <td style="padding: 5pt 4pt; text-align: center;">${escapeHtml(cleanVietnameseText(it.unit))}</td>
            <td style="padding: 5pt 4pt; text-align: center; font-weight: bold;">${it.quantity}</td>
            <td style="padding: 5pt 6pt; text-align: right;">${formatVND(it.price)}</td>
            <td style="padding: 5pt 8pt; color: #444;">${escapeHtml(cleanVietnameseText(it.note || ''))}</td>
          </tr>
        `).join('')}
        ${q.showTotal ? `
          <tr style="background-color: #f9f9f9; font-weight: bold;">
            <td colspan="4" style="padding: 6pt 8pt; text-align: right; text-transform: uppercase;">TỔNG CỘNG:</td>
            <td style="padding: 6pt 6pt; text-align: right;">${formatVND(grandTotal)}</td>
            <td style="padding: 6pt 8pt; font-style: italic;">(Đã gồm VAT)</td>
          </tr>
        ` : ''}
      </tbody>
    </table>

    <!-- PHẦN 5: GHI CHÚ -->
    <div style="margin-bottom: 14pt; font-size: 10.5pt; line-height: 1.5;">
      <strong>Ghi chú:</strong><br>
      ${escapeHtml(cleanVietnameseText(q.quoteNotes || '- Bảng giá trên đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất')).replace(/\n/g, '<br>')}
    </div>

    <!-- PHẦN 6: LỜI CẢM ƠN -->
    <div style="margin: 16pt 0 14pt; font-weight: bold; font-size: 11pt; text-transform: uppercase;">
      ${escapeHtml(cleanVietnameseText(q.thankYouText || 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!'))}
    </div>

    <!-- PHẦN 7: KÝ TÊN -->
    <table style="width: 100%; border: none; margin-top: 10pt; margin-bottom: 25pt;" border="0">
      <tr>
        <td style="width: 50%; border: none;"></td>
        <td style="width: 50%; border: none; text-align: center; font-style: italic; font-size: 10.5pt; padding-bottom: 6pt;">
          ${escapeHtml(cleanVietnameseText(q.contractDate))}
        </td>
      </tr>
      <tr>
        <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
          <strong style="font-size: 11pt; text-transform: uppercase;">ĐẠI DIỆN KHÁCH HÀNG</strong><br>
          <span style="font-style: italic; font-size: 9.5pt; color: #555;">(Ký, ghi rõ họ tên)</span><br><br><br><br><br>
          <strong style="font-size: 11pt;">${escapeHtml(cleanVietnameseText(q.buyerRep))}</strong>
        </td>
        <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
          <strong style="font-size: 11pt; text-transform: uppercase;">ĐẠI DIỆN CÔNG TY</strong><br>
          <span style="font-style: italic; font-size: 9.5pt; color: #555;">(Ký, ghi rõ họ tên)</span><br><br><br><br><br>
          <strong style="font-size: 11pt;">${escapeHtml(cleanVietnameseText(q.sellerRep || q.sellerCompany))}</strong>
        </td>
      </tr>
    </table>
  `;

  const wordFont = currentContractFont === 'arial' ? 'Arial, sans-serif' : "'Times New Roman', Times, serif";
  const wordTemplate = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Bảng Báo Giá</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 210mm 297mm;
    margin: 20mm 20mm 20mm 20mm;
  }
  body {
    font-family: ${wordFont};
    font-size: 12pt;
    line-height: 1.45;
    color: #000;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8pt 0;
  }
  th, td {
    border: 1pt solid black;
    padding: 6pt;
    font-size: 10.5pt;
  }
  th {
    background-color: #f2f2f2;
    text-align: center;
    font-weight: bold;
  }
</style>
</head>
<body>
${docHtml}
</body>
</html>`;

  const safeName = (q.buyerRep || 'Khach_Hang').replace(/[^\p{L}\p{N}_]+/gu, '_');
  const filename = `Bang_Bao_Gia_${safeName}.doc`;

  const blob = new Blob(['\ufeff', wordTemplate], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Đã tải file Word: "${filename}"!`, 'success');
}

async function copyQuoteContractText() {
  const el = document.getElementById('quote-contract-printable');
  if (!el) return;
  try {
    await navigator.clipboard.writeText(el.innerText);
    showToast('Đã sao chép nội dung bảng báo giá!', 'success');
  } catch (e) {
    showToast('Lỗi khi sao chép nội dung!', 'error');
  }
}

async function deleteContact(id) {
  if (confirm('Bạn có chắc chắn muốn xóa bản ghi phản hồi này?')) {
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message, 'success');
        loadContacts();
      }
    } catch (e) {
      showToast('Lỗi xóa!', 'error');
    }
  }
}


// ========================================================
// 8. TAB 6: CẤU HÌNH WEBSITE (4 SUB-TABS)
// ========================================================
function switchSettingsSubTab(tabName) {
  const tabs = ['banners', 'business', 'about', 'quote-types'];
  tabs.forEach(t => {
    const btn = document.getElementById(`subtab-btn-${t}`);
    const content = document.getElementById(`subtab-content-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.className = 'settings-subtab-btn px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center space-x-2 bg-[#c8102e] text-white shadow-xs';
      } else {
        btn.className = 'settings-subtab-btn px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center space-x-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-[#c8102e]';
      }
    }
    if (content) {
      if (t === tabName) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    }
  });
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const result = await res.json();
    if (!result.success) return;

    const s = result.data;
    if (s.company_name && document.getElementById('set-company-name')) document.getElementById('set-company-name').value = s.company_name;
    if (s.company_slogan && document.getElementById('set-company-slogan')) document.getElementById('set-company-slogan').value = s.company_slogan;
    if (s.phone && document.getElementById('set-phone')) document.getElementById('set-phone').value = s.phone;
    if (s.email && document.getElementById('set-email')) document.getElementById('set-email').value = s.email;
    if (s.address && document.getElementById('set-address')) document.getElementById('set-address').value = s.address;
    if (s.zalo_link && document.getElementById('set-zalo')) document.getElementById('set-zalo').value = s.zalo_link;
    if (s.facebook_link && document.getElementById('set-fb')) document.getElementById('set-fb').value = s.facebook_link;
    if (s.shopee_link && document.getElementById('set-shopee')) document.getElementById('set-shopee').value = s.shopee_link;
    if (s.maps_embed && document.getElementById('set-maps')) document.getElementById('set-maps').value = s.maps_embed;
    if (s.working_hours && document.getElementById('set-working-hours')) document.getElementById('set-working-hours').value = s.working_hours;
    
    // Logo
    const logoInput = document.getElementById('set-logo-url');
    if (logoInput) logoInput.value = s.logo_url || '';
    updateLogoPreview(s.logo_url || '');

    // Giới thiệu, Giá trị cốt lõi & Tại sao nên chọn
    if (s.about_title && document.getElementById('set-about-title')) document.getElementById('set-about-title').value = s.about_title;
    if (s.about_history && document.getElementById('set-about-history')) document.getElementById('set-about-history').value = s.about_history;
    if (s.about_mission && document.getElementById('set-about-mission')) document.getElementById('set-about-mission').value = s.about_mission;
    if (s.about_values && document.getElementById('set-about-values')) document.getElementById('set-about-values').value = s.about_values;
    if (s.about_why_choose && document.getElementById('set-about-why')) document.getElementById('set-about-why').value = s.about_why_choose;

    // Tải và hiển thị cấu hình Loại Báo Giá / Liên Hệ
    loadQuoteTypesSettings(s.quote_types);

    // Tải và hiển thị preview Banner các trang
    const bannerConfigs = [
      { key: 'banner_home', inputId: 'set-banner-home', previewId: 'preview-banner-home', defaultSrc: '/images/hero-banner-main.jpg' },
      { key: 'banner_about', inputId: 'set-banner-about', previewId: 'preview-banner-about', defaultSrc: '/images/about-hero-banner.jpg' },
      { key: 'banner_products', inputId: 'set-banner-products', previewId: 'preview-banner-products', defaultSrc: '/images/products-hero-banner.jpg' },
      { key: 'banner_blogs', inputId: 'set-banner-blogs', previewId: 'preview-banner-blogs', defaultSrc: '/images/blogs-hero-banner.jpg' },
      { key: 'banner_contact', inputId: 'set-banner-contact', previewId: 'preview-banner-contact', defaultSrc: '/images/contact-hero-banner.jpg' }
    ];

    bannerConfigs.forEach(b => {
      const bannerVal = s[b.key] || b.defaultSrc;
      const inputEl = document.getElementById(b.inputId);
      const prevEl = document.getElementById(b.previewId);
      if (inputEl) inputEl.value = bannerVal;
      if (prevEl) prevEl.src = bannerVal;
    });

  } catch (err) {
    console.error('Lỗi khi tải settings:', err);
  }
}

// Cập nhật hiển thị preview Logo doanh nghiệp
function updateLogoPreview(url) {
  const prevEl = document.getElementById('preview-logo');
  const holderEl = document.getElementById('preview-logo-placeholder');
  if (!prevEl) return;
  if (url && String(url).trim()) {
    prevEl.src = String(url).trim();
    prevEl.classList.remove('hidden');
    if (holderEl) holderEl.classList.add('hidden');
  } else {
    prevEl.src = '';
    prevEl.classList.add('hidden');
    if (holderEl) holderEl.classList.remove('hidden');
  }
}

// Upload Logo riêng biệt & tự động lưu
async function uploadLogoImage(fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) return;
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('image', file);

  showToast('Đang tải logo lên...', 'info');

  try {
    const currentToken = localStorage.getItem('admin_token') || token;
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      },
      body: formData
    });

    const result = await res.json();
    if (result.success) {
      const inputEl = document.getElementById('set-logo-url');
      if (inputEl) inputEl.value = result.url;
      updateLogoPreview(result.url);

      // Tự động lưu logo vào settings ngay lập tức
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ logo_url: result.url })
      });

      showToast('Tải và lưu Logo mới thành công!', 'success');
    } else {
      showToast(result.message || 'Lỗi tải logo!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối khi tải logo!', 'error');
  } finally {
    fileInput.value = '';
  }
}

// Xóa Logo quay về mặc định
async function clearLogo() {
  const inputEl = document.getElementById('set-logo-url');
  if (inputEl) inputEl.value = '';
  updateLogoPreview('');
  try {
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ logo_url: '' })
    });
    showToast('Đã xóa Logo, quay về biểu tượng mặc định!', 'info');
  } catch (err) {
    console.error('Lỗi khi xóa logo:', err);
  }
}

// Lưu thông tin doanh nghiệp & kênh
async function saveBusinessSettings() {
  const payload = {
    company_name: document.getElementById('set-company-name')?.value.trim() || '',
    company_slogan: document.getElementById('set-company-slogan')?.value.trim() || '',
    logo_url: document.getElementById('set-logo-url')?.value.trim() || '',
    phone: document.getElementById('set-phone')?.value.trim() || '',
    email: document.getElementById('set-email')?.value.trim() || '',
    address: document.getElementById('set-address')?.value.trim() || '',
    zalo_link: document.getElementById('set-zalo')?.value.trim() || '',
    facebook_link: document.getElementById('set-fb')?.value.trim() || '',
    shopee_link: document.getElementById('set-shopee')?.value.trim() || '',
    maps_embed: document.getElementById('set-maps')?.value.trim() || '',
    working_hours: document.getElementById('set-working-hours')?.value.trim() || ''
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã lưu thông tin thành công!', 'success');
    } else {
      showToast(result.message || 'Lỗi lưu thông tin!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ!', 'error');
  }
}



// Lưu khu vực giới thiệu & giá trị cốt lõi
async function saveAboutSettings() {
  let hist = document.getElementById('set-about-history')?.value.trim() || '';
  if (hist.includes('<style') && !hist.includes('</style>')) {
    hist += '\n</style>';
  }
  let why = document.getElementById('set-about-why')?.value.trim() || '';
  if (why.includes('<style') && !why.includes('</style>')) {
    why += '\n</style>';
  }

  const payload = {
    about_title: document.getElementById('set-about-title')?.value.trim() || '',
    about_history: hist,
    about_mission: document.getElementById('set-about-mission')?.value.trim() || '',
    about_values: document.getElementById('set-about-values')?.value.trim() || '',
    about_why_choose: why
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã lưu thông tin thành công!', 'success');
    } else {
      showToast(result.message || 'Lỗi lưu dữ liệu!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ!', 'error');
  }
}

// ========================================================
// 8.4 CẤU HÌNH LOẠI BÁO GIÁ / LIÊN HỆ
// ========================================================
let quoteTypesList = [];

const DEFAULT_QUOTE_TYPES = [
  { name: 'Báo giá sản phẩm', show_products: true },
  { name: 'Tư vấn kỹ thuật', show_products: false },
  { name: 'Góp ý / Khiếu nại', show_products: false },
  { name: 'Hủy đơn', show_products: false },
  { name: 'Đổi trả', show_products: false }
];

function isSystemQuoteType(name) {
  if (!name) return false;
  const n = String(name).trim().toLowerCase();
  return n === 'báo giá sản phẩm' || n === 'báo giá';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function loadQuoteTypesSettings(rawJson) {
  try {
    if (rawJson) {
      const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      if (Array.isArray(parsed) && parsed.length > 0) {
        quoteTypesList = parsed.map(item => {
          if (typeof item === 'string') {
            return { name: item, show_products: item.toLowerCase().includes('báo giá') };
          }
          return {
            name: item.name || '',
            show_products: item.show_products !== undefined ? Boolean(item.show_products) : true
          };
        });
      } else {
        quoteTypesList = JSON.parse(JSON.stringify(DEFAULT_QUOTE_TYPES));
      }
    } else {
      quoteTypesList = JSON.parse(JSON.stringify(DEFAULT_QUOTE_TYPES));
    }
  } catch (e) {
    quoteTypesList = JSON.parse(JSON.stringify(DEFAULT_QUOTE_TYPES));
  }

  // Đảm bảo "Báo giá sản phẩm" luôn luôn có mặt và nằm cố định ở đầu danh sách
  const bgIndex = quoteTypesList.findIndex(it => isSystemQuoteType(it.name));
  if (bgIndex > 0) {
    const [bgItem] = quoteTypesList.splice(bgIndex, 1);
    bgItem.name = 'Báo giá sản phẩm';
    bgItem.show_products = true;
    quoteTypesList.unshift(bgItem);
  } else if (bgIndex === 0) {
    quoteTypesList[0].name = 'Báo giá sản phẩm';
    quoteTypesList[0].show_products = true;
  } else {
    quoteTypesList.unshift({ name: 'Báo giá sản phẩm', show_products: true });
  }

  renderQuoteTypesList();
  if (typeof renderContactTypeSelect === 'function') {
    renderContactTypeSelect();
  }
}

function renderQuoteTypesList() {
  const container = document.getElementById('quote-types-list-container');
  if (!container) return;

  if (!quoteTypesList || quoteTypesList.length === 0) {
    quoteTypesList = [{ name: 'Báo giá sản phẩm', show_products: true }];
  }

  container.innerHTML = quoteTypesList.map((item, index) => {
    const isLocked = index === 0 || isSystemQuoteType(item.name);
    return `
    <div class="quote-type-row bg-slate-50/70 hover:bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group" data-locked="${isLocked ? 'true' : 'false'}">
      <!-- Cột trái: STT + Tên loại báo giá -->
      <div class="flex items-center space-x-3 flex-1 min-w-0">
        <span class="w-7 h-7 rounded-lg ${isLocked ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-[#c8102e]'} font-black text-xs flex items-center justify-center shrink-0">
          ${index + 1}
        </span>
        <div class="flex-1 min-w-0 flex items-center gap-2">
          <input 
            type="text" 
            value="${escapeHtml(item.name)}" 
            ${isLocked ? 'readonly tabindex="-1"' : `oninput="updateQuoteTypeName(${index}, this.value)"`} 
            placeholder="Tên loại liên hệ..."
            class="w-full px-3.5 py-2 rounded-xl border ${isLocked ? 'border-slate-200 bg-slate-100/90 text-slate-500 cursor-not-allowed select-none font-bold' : 'border-slate-200 bg-white focus:border-[#c8102e] text-slate-800 font-bold'} outline-none text-xs sm:text-sm transition"
            title="${isLocked ? 'Cấu hình mặc định của hệ thống, không thể chỉnh sửa hay xóa' : ''}"
          />
          ${isLocked ? `
            <span class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg shrink-0 whitespace-nowrap" title="Loại liên hệ mặc định của hệ thống">
              <i class="fa-solid fa-lock text-[10px]"></i> Cố định
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Cột phải: Các nút sắp xếp & thao tác (Đã ẩn chọn Sản phẩm quan tâm, mặc định chỉ Báo giá mới hiện SP) -->
      <div class="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
        <!-- Checkbox ẩn để duy trì dữ liệu DOM -->
        <input 
          type="checkbox" 
          class="hidden" 
          ${isLocked ? 'checked' : ''} 
        />

        <!-- Nút sắp xếp lên / xuống -->
        <div class="flex items-center space-x-1">
          <button 
            type="button" 
            onclick="moveQuoteTypeItem(${index}, -1)" 
            ${(index <= 1 || isLocked) ? 'disabled' : ''} 
            class="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs transition shadow-2xs" 
            title="${isLocked ? 'Mục cố định' : 'Di chuyển lên'}"
          >
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button 
            type="button" 
            onclick="moveQuoteTypeItem(${index}, 1)" 
            ${(index === quoteTypesList.length - 1 || isLocked) ? 'disabled' : ''} 
            class="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs transition shadow-2xs" 
            title="${isLocked ? 'Mục cố định' : 'Di chuyển xuống'}"
          >
            <i class="fa-solid fa-arrow-down"></i>
          </button>
        </div>

        <!-- Nút Xóa -->
        ${isLocked ? `
          <button 
            type="button" 
            disabled 
            class="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-300 flex items-center justify-center text-xs cursor-not-allowed" 
            title="Loại mặc định của hệ thống, không thể xóa"
          >
            <i class="fa-solid fa-lock text-slate-400 text-xs"></i>
          </button>
        ` : `
          <button 
            type="button" 
            onclick="removeQuoteTypeItem(${index})" 
            class="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-600 flex items-center justify-center text-xs transition shadow-2xs cursor-pointer" 
            title="Xóa loại này"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        `}
      </div>
    </div>
  `;
  }).join('');

  updateQuoteTypesPreview();
}

function updateQuoteTypeName(index, value) {
  if (quoteTypesList[index]) {
    if (index === 0 || isSystemQuoteType(quoteTypesList[index].name)) return;
    quoteTypesList[index].name = value;
    updateQuoteTypesPreview();
  }
}

function updateQuoteTypeShowProducts(index, checked) {
  if (quoteTypesList[index]) {
    if (index === 0 || isSystemQuoteType(quoteTypesList[index].name)) return;
    quoteTypesList[index].show_products = checked;
    updateQuoteTypesPreview();
  }
}

async function addQuoteTypeItem() {
  const newNameInput = document.getElementById('new-quote-type-name');
  const showProductsCheckbox = document.getElementById('new-quote-type-show-products');

  let name = newNameInput ? newNameInput.value.trim() : '';
  const showProducts = showProductsCheckbox ? showProductsCheckbox.checked : false;

  if (!name) {
    showToast('Vui lòng nhập tên loại liên hệ mới!', 'warning');
    if (newNameInput) newNameInput.focus();
    return;
  }

  if (quoteTypesList.some(item => item.name.trim().toLowerCase() === name.toLowerCase())) {
    showToast(`Loại liên hệ "${name}" đã tồn tại trong danh sách!`, 'warning');
    if (newNameInput) newNameInput.focus();
    return;
  }

  // Đọc đồng bộ lại tên hiện có từ các ô input DOM
  const rows = document.querySelectorAll('#quote-types-list-container .quote-type-row');
  if (rows.length > 0) {
    quoteTypesList = Array.from(rows).map(row => {
      const nameInput = row.querySelector('input[type="text"]');
      const isLocked = row.dataset.locked === 'true';
      const val = nameInput ? nameInput.value.trim() : '';
      return {
        name: isLocked ? 'Báo giá sản phẩm' : val,
        show_products: isLocked
      };
    }).filter(item => item.name.length > 0);
  }

  quoteTypesList.push({
    name,
    show_products: isSystemQuoteType(name)
  });

  if (newNameInput) newNameInput.value = '';
  if (showProductsCheckbox) showProductsCheckbox.checked = false;

  renderQuoteTypesList();
  if (typeof renderContactTypeSelect === 'function') {
    renderContactTypeSelect();
  }
  showToast(`Đã thêm loại: "${name}"`, 'success');
  
  // Tự động lưu cấu hình lên hệ thống ngay lập tức
  await saveQuoteTypesSettings(true);
}

async function removeQuoteTypeItem(index) {
  const itemToRemove = quoteTypesList[index];
  if (!itemToRemove) return;
  if (index === 0 || isSystemQuoteType(itemToRemove.name)) {
    showToast('Không thể xóa loại liên hệ mặc định "Báo giá sản phẩm"!', 'warning');
    return;
  }
  if (confirm(`Bạn có chắc chắn muốn xóa "${itemToRemove?.name || 'mục này'}"?`)) {
    quoteTypesList.splice(index, 1);
    renderQuoteTypesList();
  if (typeof renderContactTypeSelect === 'function') {
    renderContactTypeSelect();
  }
    await saveQuoteTypesSettings(true);
    showToast(`Đã xóa "${itemToRemove?.name || 'mục đã chọn'}"!`, 'info');
  }
}

async function moveQuoteTypeItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= quoteTypesList.length) return;
  if (index === 0 || newIndex === 0 || isSystemQuoteType(quoteTypesList[index]?.name) || isSystemQuoteType(quoteTypesList[newIndex]?.name)) {
    showToast('Mục "Báo giá sản phẩm" được cố định ở vị trí đầu tiên!', 'warning');
    return;
  }
  const temp = quoteTypesList[index];
  quoteTypesList[index] = quoteTypesList[newIndex];
  quoteTypesList[newIndex] = temp;
  renderQuoteTypesList();
  if (typeof renderContactTypeSelect === 'function') {
    renderContactTypeSelect();
  }
  await saveQuoteTypesSettings(true);
}

async function resetQuoteTypesDefault() {
  if (confirm('Bạn có chắc muốn khôi phục danh sách loại liên hệ về các tùy chọn mặc định?')) {
    quoteTypesList = JSON.parse(JSON.stringify(DEFAULT_QUOTE_TYPES));
    renderQuoteTypesList();
  if (typeof renderContactTypeSelect === 'function') {
    renderContactTypeSelect();
  }
    await saveQuoteTypesSettings(false);
    showToast('Đã khôi phục về danh sách mặc định!', 'info');
  }
}

function updateQuoteTypesPreview() {
  const previewSelect = document.getElementById('preview-quote-types-select');
  if (!previewSelect) return;

  if (!quoteTypesList || quoteTypesList.length === 0) {
    previewSelect.innerHTML = '<option value="">(Chưa có dữ liệu cấu hình)</option>';
    return;
  }

  previewSelect.innerHTML = `
    <option value="">-- Chọn loại --</option>
    ${quoteTypesList.map((item, idx) => `
      <option value="${escapeHtml(item.name)}" ${idx === 0 ? 'selected' : ''}>
        ${escapeHtml(item.name)}
      </option>
    `).join('')}
  `;
}

async function saveQuoteTypesSettings(silent = false) {
  // 1. Tự động gom thêm mục đang gõ dở trong ô thêm mới (nếu người dùng chưa kịp bấm Thêm)
  const newNameInput = document.getElementById('new-quote-type-name');
  if (newNameInput && newNameInput.value.trim()) {
    const pendingName = newNameInput.value.trim();
    if (!quoteTypesList.some(item => item.name.trim().toLowerCase() === pendingName.toLowerCase())) {
      quoteTypesList.push({ name: pendingName, show_products: isSystemQuoteType(pendingName) });
    }
    newNameInput.value = '';
  }

  // 2. Đồng bộ lại trực tiếp từ các ô input trong DOM
  const rows = document.querySelectorAll('#quote-types-list-container .quote-type-row');
  if (rows.length > 0) {
    quoteTypesList = Array.from(rows).map(row => {
      const nameInput = row.querySelector('input[type="text"]');
      const isLocked = row.dataset.locked === 'true';
      const val = nameInput ? nameInput.value.trim() : '';
      const finalName = isLocked ? 'Báo giá sản phẩm' : val;
      return {
        name: finalName,
        show_products: isLocked || isSystemQuoteType(finalName)
      };
    }).filter(item => item.name.length > 0);
  }

  // Đảm bảo "Báo giá sản phẩm" luôn luôn nằm ở vị trí số 1 và show_products = true
  const bgIndex = quoteTypesList.findIndex(it => isSystemQuoteType(it.name));
  if (bgIndex > 0) {
    const [bgItem] = quoteTypesList.splice(bgIndex, 1);
    bgItem.name = 'Báo giá sản phẩm';
    bgItem.show_products = true;
    quoteTypesList.unshift(bgItem);
  } else if (bgIndex === 0) {
    quoteTypesList[0].name = 'Báo giá sản phẩm';
    quoteTypesList[0].show_products = true;
  } else {
    quoteTypesList.unshift({ name: 'Báo giá sản phẩm', show_products: true });
  }

  const validList = quoteTypesList
    .map(item => ({
      name: item.name.trim(),
      show_products: isSystemQuoteType(item.name) ? true : false
    }))
    .filter(item => item.name.length > 0);

  if (validList.length === 0) {
    showToast('Vui lòng thêm ít nhất 1 loại liên hệ!', 'warning');
    return;
  }

  quoteTypesList = validList;

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        quote_types: JSON.stringify(validList)
      })
    });

    const result = await res.json();
    if (result.success) {
      if (!silent) {
        showToast('Đã lưu cấu hình thành công', 'success');
      }
      renderQuoteTypesList();
      if (typeof renderContactTypeSelect === 'function') {
        renderContactTypeSelect();
      }
      if (typeof renderContactFilterButtons === 'function') {
        renderContactFilterButtons();
      }
    } else {
      showToast(result.message || 'Lỗi khi lưu cấu hình!', 'error');
    }
  } catch (err) {
    console.error('Lỗi khi lưu quote types:', err);
    showToast('Lỗi kết nối máy chủ!', 'error');
  }
}


// ========================================================
// 9. UPLOAD ẢNH MULTIPART
// ========================================================
async function uploadImage(fileInput, targetInputId, previewImgId) {
  if (!fileInput.files || fileInput.files.length === 0) return;

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('image', file);

  showToast('Đang tải ảnh lên...', 'info');

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await res.json();
    if (result.success) {
      const inputEl = document.getElementById(targetInputId);
      if (inputEl) inputEl.value = result.url;
      if (previewImgId) {
        const prevEl = document.getElementById(previewImgId);
        if (prevEl) prevEl.src = result.url;
      }
      showToast('Tải ảnh thành công!', 'success');
    } else {
      showToast(result.message || 'Lỗi tải ảnh!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối khi tải ảnh!', 'error');
  }
}

// Helper upload banner chuyên dụng: Tự động lưu ngay sau khi upload
async function uploadBannerImage(fileInput, targetInputId, previewImgId) {
  await uploadImage(fileInput, targetInputId, previewImgId);
  const inputEl = document.getElementById(targetInputId);
  if (inputEl && inputEl.value) {
    const keyMap = {
      'set-banner-home': 'banner_home',
      'set-banner-about': 'banner_about',
      'set-banner-products': 'banner_products',
      'set-banner-blogs': 'banner_blogs',
      'set-banner-contact': 'banner_contact'
    };
    const key = keyMap[targetInputId];
    if (key) {
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ [key]: inputEl.value })
        });
        const result = await res.json();
        if (result.success) {
          showToast('Đã tự động lưu Banner mới vào hệ thống!', 'success');
        }
      } catch (err) {
        console.error('Lỗi khi tự động lưu banner:', err);
      }
    }
  }
}

// Lưu riêng cụm 5 Banner các trang
async function saveBannersOnly() {
  const saveBtn = document.getElementById('btn-save-banners');
  const originalHtml = saveBtn ? saveBtn.innerHTML : '';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang lưu...</span>';
  }

  const payload = {
    banner_home: document.getElementById('set-banner-home')?.value.trim() || '',
    banner_about: document.getElementById('set-banner-about')?.value.trim() || '',
    banner_products: document.getElementById('set-banner-products')?.value.trim() || '',
    banner_blogs: document.getElementById('set-banner-blogs')?.value.trim() || '',
    banner_contact: document.getElementById('set-banner-contact')?.value.trim() || ''
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã lưu tất cả Banner thành công!', 'success');
    } else {
      showToast(result.message || 'Lỗi lưu banner!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ khi lưu banner!', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
    }
  }
}

window.uploadImage = uploadImage;
window.uploadBannerImage = uploadBannerImage;
window.saveBannersOnly = saveBannersOnly;
window.switchSettingsSubTab = switchSettingsSubTab;
window.uploadLogoImage = uploadLogoImage;
window.clearLogo = clearLogo;
window.updateLogoPreview = updateLogoPreview;
window.saveBusinessSettings = saveBusinessSettings;
window.saveAboutSettings = saveAboutSettings;
window.toggleCollapseCategory = toggleCollapseCategory;
window.addQuoteTypeItem = addQuoteTypeItem;
window.removeQuoteTypeItem = removeQuoteTypeItem;
window.moveQuoteTypeItem = moveQuoteTypeItem;
window.resetQuoteTypesDefault = resetQuoteTypesDefault;
window.saveQuoteTypesSettings = saveQuoteTypesSettings;
window.updateQuoteTypeName = updateQuoteTypeName;
window.updateQuoteTypeShowProducts = updateQuoteTypeShowProducts;

// ========================================================
// 10. MODAL CHÈN HÌNH ẢNH & XEM THỬ POPUP LIVE PREVIEW
// ========================================================
let currentInsertTargetTextareaId = 'set-about-history';
let currentInsertTab = 'upload';
let selectedGalleryImageUrl = '';
let mediaLibraryCache = null;

function insertTextAtCursor(textareaId, textToInsert) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  const start = textarea.selectionStart !== undefined ? textarea.selectionStart : textarea.value.length;
  const end = textarea.selectionEnd !== undefined ? textarea.selectionEnd : textarea.value.length;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + textToInsert + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
  textarea.focus();
}

function openInsertImageModal(targetTextareaId) {
  currentInsertTargetTextareaId = targetTextareaId || 'set-about-history';
  const modal = document.getElementById('insert-image-modal');
  if (!modal) return;
  
  // Reset fields
  clearModalUploadFile();
  const urlInput = document.getElementById('modal-img-url-input');
  if (urlInput) urlInput.value = '';
  const urlBox = document.getElementById('modal-url-preview-box');
  if (urlBox) urlBox.classList.add('hidden');
  const altInput = document.getElementById('modal-img-alt');
  if (altInput) altInput.value = '';
  selectedGalleryImageUrl = '';

  // Show modal
  modal.classList.remove('hidden');
  switchInsertImageTab('upload');
  
  // Tải trước thư viện ảnh
  loadMediaLibrary();
}

function closeInsertImageModal() {
  const modal = document.getElementById('insert-image-modal');
  if (modal) modal.classList.add('hidden');
}

function switchInsertImageTab(tabName) {
  currentInsertTab = tabName;
  const tabs = ['upload', 'gallery', 'url'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-img-${t}`);
    const content = document.getElementById(`tab-content-img-${t}`);
    if (t === tabName) {
      if (btn) {
        btn.className = 'px-4 py-2 border-b-2 border-[#c8102e] text-[#c8102e] flex items-center space-x-1.5 cursor-pointer font-bold';
      }
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) {
        btn.className = 'px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center space-x-1.5 cursor-pointer font-bold';
      }
      if (content) content.classList.add('hidden');
    }
  });
}

function handleModalFileSelect(fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) return;
  const file = fileInput.files[0];
  const previewBox = document.getElementById('modal-upload-preview-box');
  const previewImg = document.getElementById('modal-upload-preview-img');
  const fileNameEl = document.getElementById('modal-upload-file-name');
  const altInput = document.getElementById('modal-img-alt');

  if (previewImg) {
    previewImg.src = URL.createObjectURL(file);
  }
  if (fileNameEl) {
    fileNameEl.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
  }
  if (previewBox) {
    previewBox.classList.remove('hidden');
  }
  if (altInput && !altInput.value.trim()) {
    altInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }
}

function clearModalUploadFile() {
  const fileInput = document.getElementById('modal-file-upload-input');
  if (fileInput) fileInput.value = '';
  const previewBox = document.getElementById('modal-upload-preview-box');
  if (previewBox) previewBox.classList.add('hidden');
}

function handleModalUrlInput(val) {
  const previewBox = document.getElementById('modal-url-preview-box');
  const previewImg = document.getElementById('modal-url-preview-img');
  if (!val || !val.trim()) {
    if (previewBox) previewBox.classList.add('hidden');
    return;
  }
  if (previewImg) previewImg.src = val.trim();
  if (previewBox) previewBox.classList.remove('hidden');
}

async function loadMediaLibrary() {
  const grid = document.getElementById('media-library-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang tải danh sách ảnh...</div>';

  try {
    const res = await fetch('/api/admin/media-library', { headers: getAuthHeaders() });
    const result = await res.json();
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      mediaLibraryCache = result.data;
      renderMediaLibrary(result.data);
    } else {
      grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-400">Chưa có ảnh nào trong thư viện</div>';
    }
  } catch (err) {
    grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-red-500">Lỗi khi tải thư viện ảnh!</div>';
  }
}

function renderMediaLibrary(items) {
  const grid = document.getElementById('media-library-grid');
  if (!grid) return;
  grid.innerHTML = items.map((item) => {
    const isSelected = selectedGalleryImageUrl === item.url;
    return `
      <div onclick="selectGalleryImage('${item.url}', '${item.name.replace(/'/g, "\\'")}')" class="group relative rounded-xl overflow-hidden border-2 cursor-pointer transition p-1 ${isSelected ? 'border-[#c8102e] bg-red-50' : 'border-slate-200 hover:border-red-300 bg-white'}">
        <img src="${item.url}" alt="${item.name}" class="w-full h-20 object-cover rounded-lg group-hover:scale-105 transition" onerror="this.src='/images/about-warehouse.jpg'">
        <p class="text-[10px] text-slate-600 truncate mt-1 text-center font-medium" title="${item.name}">${item.name}</p>
        <span class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full ${isSelected ? 'bg-[#c8102e] text-white' : 'bg-black/30 text-transparent'} flex items-center justify-center text-[10px] shadow-xs">
          <i class="fa-solid fa-check"></i>
        </span>
      </div>
    `;
  }).join('');
}

function selectGalleryImage(url, name) {
  selectedGalleryImageUrl = url;
  const altInput = document.getElementById('modal-img-alt');
  if (altInput && !altInput.value.trim()) {
    altInput.value = name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }
  if (mediaLibraryCache) {
    renderMediaLibrary(mediaLibraryCache);
  }
}

async function confirmInsertImageToTextarea() {
  const altText = document.getElementById('modal-img-alt')?.value.trim() || 'Hình ảnh';
  const cssClass = document.getElementById('modal-img-class')?.value || 'rounded-xl my-3 max-w-full h-auto shadow-xs';
  let finalImgUrl = '';

  if (currentInsertTab === 'upload') {
    const fileInput = document.getElementById('modal-file-upload-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('Vui lòng chọn một file ảnh từ máy tính!', 'warning');
      return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    showToast('Đang tải ảnh lên...', 'info');
    try {
      const currentToken = localStorage.getItem('admin_token') || token;
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}` },
        body: formData
      });
      const result = await res.json();
      if (!result.success) {
        showToast(result.message || 'Lỗi tải ảnh lên máy chủ!', 'error');
        return;
      }
      finalImgUrl = result.url;
    } catch (err) {
      showToast('Lỗi kết nối khi tải ảnh!', 'error');
      return;
    }
  } else if (currentInsertTab === 'gallery') {
    if (!selectedGalleryImageUrl) {
      showToast('Vui lòng nhấp chọn một ảnh trong thư viện!', 'warning');
      return;
    }
    finalImgUrl = selectedGalleryImageUrl;
  } else if (currentInsertTab === 'url') {
    const urlInput = document.getElementById('modal-img-url-input');
    if (!urlInput || !urlInput.value.trim()) {
      showToast('Vui lòng nhập đường dẫn (URL) hình ảnh!', 'warning');
      return;
    }
    finalImgUrl = urlInput.value.trim();
  }

  if (finalImgUrl) {
    const imgTag = `\n<img src="${finalImgUrl}" alt="${altText}" class="${cssClass}" />\n`;
    insertTextAtCursor(currentInsertTargetTextareaId, imgTag);
    closeInsertImageModal();
    showToast('Đã chèn hình ảnh thành công!', 'success');
  }
}

// Live Preview Popup Modal
function openHtmlPreviewModal(textareaId, title) {
  const textarea = document.getElementById(textareaId);
  const modal = document.getElementById('preview-html-modal');
  const body = document.getElementById('preview-html-modal-body');
  const titleEl = document.getElementById('preview-html-modal-title');
  if (!modal || !body) return;

  if (titleEl && title) {
    titleEl.textContent = `Xem Thử Popup: ${title}`;
  }

  let content = textarea ? textarea.value.trim() : '';
  if (!content) {
    body.innerHTML = '<div class="py-12 text-center text-slate-400 italic">Chưa có nội dung để xem trước</div>';
  } else {
    if (content.includes('<style') && !content.includes('</style>')) {
      content += '\n</style>';
    }
    body.innerHTML = content;
  }

  modal.classList.remove('hidden');
}

function closeHtmlPreviewModal() {
  const modal = document.getElementById('preview-html-modal');
  if (modal) modal.classList.add('hidden');
}

window.openInsertImageModal = openInsertImageModal;
window.closeInsertImageModal = closeInsertImageModal;
window.switchInsertImageTab = switchInsertImageTab;
window.handleModalFileSelect = handleModalFileSelect;
window.clearModalUploadFile = clearModalUploadFile;
window.handleModalUrlInput = handleModalUrlInput;
window.loadMediaLibrary = loadMediaLibrary;
window.selectGalleryImage = selectGalleryImage;
window.confirmInsertImageToTextarea = confirmInsertImageToTextarea;
window.openHtmlPreviewModal = openHtmlPreviewModal;
window.closeHtmlPreviewModal = closeHtmlPreviewModal;


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
        is_promo
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
window.openQuoteContractModal = openQuoteContractModal;
window.closeQuoteContractModal = closeQuoteContractModal;
window.submitSendQuoteContract = submitSendQuoteContract;
window.switchQuoteTab = switchQuoteTab;
window.setQuoteContractFont = setQuoteContractFont;
window.exportQuoteToWord = exportQuoteToWord;
window.printQuoteContract = printQuoteContract;
window.loadSampleCncQuoteItems = loadSampleCncQuoteItems;
window.toggleQuoteShowTotal = toggleQuoteShowTotal;
window.addQuoteContractItem = addQuoteContractItem;
window.removeQuoteContractItem = removeQuoteContractItem;
window.updateQuoteItem = updateQuoteItem;
window.copyQuoteContractText = copyQuoteContractText;
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

