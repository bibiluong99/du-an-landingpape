// ========================================================
// JAVASCRIPT: TRANG DANH SÁCH SẢN PHẨM (PRODUCTS.JS)
// CHUẨN GIAO DIỆN HÌNH MẪU 1
// ========================================================

const categoryIcons = {
  1: '/images/mockup_assets/cat-day-dien.png',
  2: '/images/mockup_assets/cat-day-cap-dien.png',
  3: '/images/mockup_assets/cat-thiet-bi-dien.png',
  4: '/images/mockup_assets/cat-o-cam-cong-tac.png',
  5: '/images/mockup_assets/cat-phu-kien-dien.png',
  6: '/images/mockup_assets/cat-den-chieu-sang.png'
};

let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'default';
let currentViewMode = 'grid';
let currentPage = 1;
const itemsPerPage = 10;
let allProducts = [];
let categoriesList = [];

// Helper chuyển tiếng Việt có dấu thành không dấu để tìm kiếm thông minh
function removeVietnameseTones(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

// Helper Escape HTML tránh XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  // Đọc params từ URL
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category_id') || urlParams.get('cat');
  if (catParam) {
    currentCategory = catParam;
  }
  const searchParam = urlParams.get('search');
  if (searchParam) {
    currentSearch = searchParam;
    const input = document.getElementById('search-input');
    if (input) input.value = searchParam;
    const filterInput = document.getElementById('filter-name-input');
    if (filterInput) filterInput.value = searchParam;
    const clearBtn = document.getElementById('btn-clear-filter');
    if (clearBtn) clearBtn.classList.remove('hidden');
  }
  const pageParam = parseInt(urlParams.get('page'));
  if (pageParam && pageParam > 0) {
    currentPage = pageParam;
  }

  // Khởi tạo
  loadCategories();
  fetchProducts();

  // Search form ở Header
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = document.getElementById('search-input').value.trim();
      const filterInput = document.getElementById('filter-name-input');
      if (filterInput) filterInput.value = val;
      handleNameFilterInput(val);
    });
  }
});

// Xử lý sự kiện gõ lọc theo tên sản phẩm ngay trên Toolbar
function handleNameFilterInput(val) {
  const clearBtn = document.getElementById('btn-clear-filter');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !val || !val.trim());
  }

  currentSearch = val ? val.trim() : '';
  currentPage = 1;

  // Đồng bộ với ô tìm kiếm trên Header
  const headerInput = document.getElementById('search-input');
  if (headerInput && headerInput.value !== val) {
    headerInput.value = val;
  }

  // Cập nhật tham số trên URL mà không reload trang
  const url = new URL(window.location);
  if (currentSearch) {
    url.searchParams.set('search', currentSearch);
  } else {
    url.searchParams.delete('search');
  }
  url.searchParams.set('page', '1');
  window.history.replaceState({}, '', url);

  // Lọc và render ngay lập tức
  sortAndRenderProducts();
}

// Xóa từ khóa lọc
function clearNameFilter() {
  const filterInput = document.getElementById('filter-name-input');
  if (filterInput) filterInput.value = '';
  const headerInput = document.getElementById('search-input');
  if (headerInput) headerInput.value = '';
  const clearBtn = document.getElementById('btn-clear-filter');
  if (clearBtn) clearBtn.classList.add('hidden');

  handleNameFilterInput('');
}

let expandedParentCats = new Set(); // Mặc định không mở danh mục con nào

// 1. Tải danh mục vào thanh Sidebar
async function loadCategories() {
  const container = document.getElementById('category-sidebar-list');
  if (!container) return;

  try {
    const res = await fetch('/api/categories');
    const result = await res.json();
    if (!result.success || !result.data) return;

    categoriesList = result.data;
    
    // Nếu đang chọn category_id từ URL
    if (currentCategory && currentCategory !== 'all') {
      const currentCatObj = categoriesList.find(c => String(c.id) === String(currentCategory));
      if (!currentCatObj) {
        // Danh mục đã bị tắt hoặc không tồn tại, tự động chuyển về Tất cả sản phẩm
        currentCategory = 'all';
        fetchProducts();
      } else if (currentCatObj.parent_id) {
        expandedParentCats.add(String(currentCatObj.parent_id));
      }
    }

    // Cập nhật tiêu đề và breadcrumb đồng bộ
    const title = (currentCategory && currentCategory !== 'all') 
      ? (categoriesList.find(c => String(c.id) === String(currentCategory))?.name || 'Tất cả sản phẩm')
      : 'Tất cả sản phẩm';
    const titleEl = document.getElementById('current-category-title');
    if (titleEl) titleEl.textContent = title;
    const breadcrumbEl = document.getElementById('breadcrumb-current');
    if (breadcrumbEl) breadcrumbEl.textContent = title;

    renderCategoriesSidebar();
  } catch (err) {
    console.error('Lỗi khi tải danh mục:', err);
  }
}

function renderCategoriesSidebar() {
  const container = document.getElementById('category-sidebar-list');
  if (!container) return;

  // 1. Thêm mục "Tất cả sản phẩm" ở đầu danh mục
  const isAllActive = !currentCategory || currentCategory === 'all';
  const allItemHtml = `
    <div class="py-1">
      <div class="flex items-center justify-between px-3 py-2 rounded-xl transition group ${
        isAllActive 
          ? 'bg-[#fef2f2] text-[#c8102e] font-bold shadow-2xs' 
          : 'text-slate-800 hover:bg-slate-50 hover:text-[#c8102e] font-medium'
      }">
        <button 
          type="button"
          onclick="selectCategory('all')" 
          class="flex-1 flex items-center space-x-3 text-left focus:outline-none"
        >
          <div class="w-7 h-7 flex items-center justify-center shrink-0 ${isAllActive ? 'text-[#c8102e]' : 'text-slate-500 group-hover:text-[#c8102e]'} text-sm sm:text-base">
            <i class="fa-solid fa-boxes-stacked"></i>
          </div>
          <span class="text-xs sm:text-[13px] 2xl:text-sm font-bold">Tất cả sản phẩm</span>
        </button>
      </div>
    </div>
  `;

  // 2. Danh sách các danh mục cha
  const parents = categoriesList.filter(c => !c.parent_id);

  const parentsHtml = parents.map(parent => {
    const children = categoriesList.filter(c => String(c.parent_id) === String(parent.id));
    const hasChildren = children.length > 0;
    const isExpanded = expandedParentCats.has(String(parent.id));
    const isParentActive = String(parent.id) === String(currentCategory);
    const iconSrc = categoryIcons[parent.id] || parent.image || '/images/mockup_assets/cat-day-dien.png';

    return `
      <div class="py-1">
        <!-- Danh mục cha -->
        <div class="flex items-center justify-between px-3 py-2 rounded-xl transition group ${
          isParentActive 
            ? 'bg-[#fef2f2] text-[#c8102e] font-bold shadow-2xs' 
            : 'text-slate-800 hover:bg-slate-50 hover:text-[#c8102e] font-medium'
        }">
          <button 
            type="button"
            onclick="selectCategory('${parent.id}')" 
            class="flex-1 flex items-center space-x-3 text-left focus:outline-none"
          >
            <div class="w-7 h-7 flex items-center justify-center shrink-0">
              <img src="${iconSrc}" alt="${parent.name}" class="max-h-full max-w-full object-contain">
            </div>
            <span class="text-xs sm:text-[13px] 2xl:text-sm font-bold">${parent.name}</span>
          </button>

          ${hasChildren ? `
            <!-- Nút mũi tên mở rộng / thu gọn danh mục con (chỉ hiển thị khi có danh mục con) -->
            <button 
              type="button" 
              onclick="toggleParentCategory(event, '${parent.id}')" 
              class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100/70 text-slate-400 hover:text-[#c8102e] transition shrink-0 ml-1"
              title="${isExpanded ? 'Thu gọn danh mục con' : 'Xem danh mục con'}"
            >
              <i class="fa-solid ${isExpanded ? 'fa-chevron-down text-[#c8102e]' : 'fa-chevron-right'} text-[11px] transition-transform duration-200"></i>
            </button>
          ` : ''}
        </div>

        <!-- Danh sách danh mục con (Khi nhấn mũi tên mới show) -->
        ${hasChildren ? `
          <div class="space-y-1 pl-6 pt-1 pb-1 transition-all duration-300 ${isExpanded ? '' : 'hidden'}" id="subcats-container-${parent.id}">
            ${children.map(child => {
              const isChildActive = String(child.id) === String(currentCategory);
              return `
                <button 
                  type="button"
                  onclick="selectCategory('${child.id}')" 
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition text-left group ${
                    isChildActive 
                      ? 'bg-[#fef2f2] text-[#c8102e] font-bold shadow-2xs' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#c8102e] font-medium'
                  }"
                >
                  <div class="flex items-center space-x-2">
                    <span class="text-slate-300 font-mono text-sm leading-none">↳</span>
                    <span class="text-xs sm:text-[13px]">${child.name}</span>
                  </div>
                  <i class="fa-solid fa-circle text-[5px] ${isChildActive ? 'text-[#c8102e]' : 'text-slate-300 group-hover:text-[#c8102e]'}"></i>
                </button>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = allItemHtml + parentsHtml;
}

// Bật tắt danh mục con
function toggleParentCategory(e, parentId) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const strId = String(parentId);
  if (expandedParentCats.has(strId)) {
    expandedParentCats.delete(strId);
  } else {
    expandedParentCats.add(strId);
  }
  renderCategoriesSidebar();
}

// Chọn danh mục
function selectCategory(catId) {
  currentCategory = catId;
  currentPage = 1;

  // Nếu danh mục được chọn là con, tự động mở danh mục cha của nó
  const found = categoriesList.find(c => String(c.id) === String(catId));
  if (found && found.parent_id) {
    expandedParentCats.add(String(found.parent_id));
  }

  renderCategoriesSidebar();

  const title = (found && catId !== 'all') ? found.name : 'Tất cả sản phẩm';
  
  const titleEl = document.getElementById('current-category-title');
  if (titleEl) titleEl.textContent = title;

  const breadcrumbEl = document.getElementById('breadcrumb-current');
  if (breadcrumbEl) breadcrumbEl.textContent = title;

  // Cập nhật URLSearchParams cho category_id
  const url = new URL(window.location);
  if (catId && catId !== 'all') {
    url.searchParams.set('category_id', catId);
  } else {
    url.searchParams.delete('category_id');
    url.searchParams.delete('cat');
  }
  url.searchParams.delete('page');
  window.history.pushState({}, '', url);

  fetchProducts();
}

// 2. Tải danh sách sản phẩm từ API
async function fetchProducts() {
  const container = document.getElementById('products-container');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full text-center py-16 text-slate-400">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-[#c8102e]"></i>
      <p class="mt-3 text-sm font-medium">Đang tải sản phẩm...</p>
    </div>
  `;

  try {
    let url = `/api/products?limit=200`;
    if (currentCategory && currentCategory !== 'all') {
      url += `&category_id=${currentCategory}`;
    }

    const res = await fetch(url);
    const result = await res.json();
    if (!result.success || !result.data) {
      container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 text-sm">Không có sản phẩm nào.</div>`;
      return;
    }

    allProducts = result.data;
    sortAndRenderProducts();
  } catch (err) {
    console.error('Lỗi tải sản phẩm:', err);
    container.innerHTML = `<div class="col-span-full text-center py-12 text-red-500 text-sm">Không thể kết nối đến máy chủ.</div>`;
  }
}

// Sắp xếp, lọc theo tên và phân trang
function sortAndRenderProducts() {
  let list = [...allProducts];

  // 1. Lọc theo tên sản phẩm (không phân biệt chữ hoa/thường, hỗ trợ cả tiếng Việt có dấu và không dấu)
  if (currentSearch && currentSearch.trim()) {
    const rawKeyword = currentSearch.trim().toLowerCase();
    const cleanKeyword = removeVietnameseTones(rawKeyword);

    list = list.filter(p => {
      const name = (p.name || '').toLowerCase();
      const cleanName = removeVietnameseTones(name);
      return name.includes(rawKeyword) || cleanName.includes(cleanKeyword);
    });
  }

  // Cập nhật thanh trạng thái đang lọc
  const statusBar = document.getElementById('filter-status-bar');
  const kwBadge = document.getElementById('filter-keyword-badge');
  const countBadge = document.getElementById('filter-count-badge');
  if (statusBar && kwBadge && countBadge) {
    if (currentSearch && currentSearch.trim()) {
      kwBadge.textContent = currentSearch.trim();
      countBadge.textContent = list.length;
      statusBar.classList.remove('hidden');
    } else {
      statusBar.classList.add('hidden');
    }
  }

  // 2. Sắp xếp
  if (currentSort === 'price_asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price_desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'name_asc') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const container = document.getElementById('products-container');
  if (!container) return;

  // 3. Nếu không tìm thấy sản phẩm nào
  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-2xs">
        <div class="w-16 h-16 rounded-full bg-red-50 text-[#c8102e] flex items-center justify-center mx-auto text-2xl mb-3">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>
        <h4 class="text-base font-bold text-slate-800">Không tìm thấy sản phẩm phù hợp</h4>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          ${currentSearch ? `Không có sản phẩm nào khớp với từ khóa "<strong>${escapeHtml(currentSearch)}</strong>"` : 'Hiện chưa có sản phẩm nào trong danh mục này.'}
        </p>
        <div class="mt-4 flex items-center justify-center gap-2.5">
          ${currentSearch ? `
            <button onclick="clearNameFilter()" class="px-5 py-2 rounded-full bg-[#c8102e] hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer">
              Xóa bộ lọc tìm kiếm
            </button>
          ` : ''}
          <button onclick="selectCategory('all')" class="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer">
            Xem tất cả sản phẩm
          </button>
        </div>
      </div>
    `;
    renderPagination(0);
    return;
  }

  // 4. Phân trang
  const totalPages = Math.ceil(list.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = list.slice(startIndex, startIndex + itemsPerPage);

  renderProductsGrid(pageItems);
  renderPagination(totalPages);
}

// Render Grid 5 cột chuẩn mockup
function renderProductsGrid(items) {
  const container = document.getElementById('products-container');
  if (!container) return;

  if (currentViewMode === 'list') {
    container.className = 'space-y-3';
    container.innerHTML = items.map(p => `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition flex items-center justify-between gap-4 group">
        <a href="/product-detail?id=${p.id}" class="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-slate-50 rounded-xl p-2 flex items-center justify-center">
          <img src="${p.image}" alt="${p.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition">
        </a>
        <div class="flex-1 min-w-0">
          <span class="text-[11px] text-[#c8102e] font-bold uppercase tracking-wider">${p.category_name || 'Điện Việt'}</span>
          <a href="/product-detail?id=${p.id}" class="block text-base sm:text-lg font-black text-[#0f172a] hover:text-[#c8102e] truncate mt-0.5">
            ${p.name}
          </a>
          <p class="text-xs text-slate-500 line-clamp-1 mt-1">${p.short_desc || ''}</p>
        </div>
        <div class="text-right shrink-0">
          <a href="/product-detail?id=${p.id}" class="inline-flex items-center space-x-2 px-5 py-2 rounded-full bg-[#c8102e] hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs transition">
            <span>Xem chi tiết</span>
            <i class="fa-solid fa-arrow-right text-xs"></i>
          </a>
        </div>
      </div>
    `).join('');
  } else {
    container.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4';
    container.innerHTML = items.map(p => `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition duration-300 flex flex-col justify-between text-center group">
        <div>
          <!-- Ảnh sản phẩm -->
          <a href="/product-detail?id=${p.id}" class="block overflow-hidden rounded-xl mb-3 h-28 sm:h-32 2xl:h-36 flex items-center justify-center bg-slate-50/40 p-2">
            <img src="${p.image}" alt="${p.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300">
          </a>
          <!-- Tên sản phẩm -->
          <a href="/product-detail?id=${p.id}" class="font-bold text-xs sm:text-[13px] 2xl:text-sm text-[#0f172a] hover:text-[#c8102e] line-clamp-2 min-h-[34px] flex items-center justify-center leading-snug mb-3">
            ${p.name}
          </a>
        </div>
        <!-- Nút Xem chi tiết chuẩn hình 1 -->
        <a href="/product-detail?id=${p.id}" class="w-full inline-flex items-center justify-center space-x-1.5 py-1.5 sm:py-2 px-3 rounded-full bg-[#c8102e] hover:bg-red-700 text-white font-bold text-xs sm:text-[13px] shadow-2xs transition">
          <span>Xem chi tiết</span>
          <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </a>
      </div>
    `).join('');
  }
}

// Phân trang
function renderPagination(totalPages) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  // Đảm bảo currentPage hợp lệ trong khoảng [1, totalPages]
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  let html = '';

  // Nút Trang trước (Previous)
  if (currentPage > 1) {
    html += `
      <button 
        onclick="goToPage(${currentPage - 1})" 
        class="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:border-red-300 hover:text-[#c8102e] text-slate-700 font-bold text-sm shadow-2xs flex items-center justify-center transition cursor-pointer"
        title="Trang trước"
      >
        <i class="fa-solid fa-chevron-left text-xs"></i>
      </button>
    `;
  }

  // Danh sách các số trang
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === currentPage;
    html += `
      <button 
        onclick="goToPage(${i})" 
        class="w-9 h-9 rounded-lg font-bold text-sm shadow-2xs flex items-center justify-center transition cursor-pointer ${
          isActive 
            ? 'bg-[#c8102e] text-white shadow-xs' 
            : 'bg-white border border-slate-200 hover:border-red-300 hover:text-[#c8102e] text-slate-700'
        }"
      >
        ${i}
      </button>
    `;
  }

  // Nút Trang tiếp (Next)
  if (currentPage < totalPages) {
    html += `
      <button 
        onclick="goToPage(${currentPage + 1})" 
        class="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:border-red-300 hover:text-[#c8102e] text-slate-700 font-bold text-sm shadow-2xs flex items-center justify-center transition cursor-pointer"
        title="Trang tiếp"
      >
        <i class="fa-solid fa-chevron-right text-xs"></i>
      </button>
    `;
  }

  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;

  // Cập nhật URL ?page=X mà không tải lại toàn trang
  const url = new URL(window.location);
  if (page === 1) {
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', page);
  }
  window.history.pushState({}, '', url);

  sortAndRenderProducts();

  // Cuộn mượt lên vị trí tiêu đề / danh sách sản phẩm
  const target = document.getElementById('products-container') || document.getElementById('current-category-title');
  if (target) {
    const y = target.getBoundingClientRect().top + window.pageYOffset - 120;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
}

function handleSortChange(val) {
  currentSort = val;
  sortAndRenderProducts();
}

function setViewMode(mode) {
  currentViewMode = mode;
  const btnGrid = document.getElementById('btn-grid');
  const btnList = document.getElementById('btn-list');

  if (mode === 'grid') {
    btnGrid.className = 'w-8 h-8 rounded bg-[#c8102e] text-white flex items-center justify-center text-xs transition';
    btnList.className = 'w-8 h-8 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs transition';
  } else {
    btnList.className = 'w-8 h-8 rounded bg-[#c8102e] text-white flex items-center justify-center text-xs transition';
    btnGrid.className = 'w-8 h-8 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs transition';
  }

  sortAndRenderProducts();
}

window.toggleParentCategory = toggleParentCategory;
window.selectCategory = selectCategory;
window.handleSortChange = handleSortChange;
window.setViewMode = setViewMode;
window.goToPage = goToPage;
