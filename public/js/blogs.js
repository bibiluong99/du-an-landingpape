// ========================================================
// JAVASCRIPT: TRANG DANH SÁCH BÀI VIẾT (BLOGS.JS)
// CHUẨN GIAO DIỆN HÌNH MẪU 1
// ========================================================

let currentCategory = 'all';
let currentSearch = '';
let currentPage = 1;
const itemsPerPage = 6; // Hiển thị 6 bài viết trên 1 trang (3 Cột x 2 Hàng)
let allBlogs = [];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const cat = urlParams.get('category');
  if (cat) currentCategory = cat;
  const search = urlParams.get('search');
  if (search) currentSearch = search;

  fetchBlogs();
});

async function fetchBlogs() {
  const container = document.getElementById('blogs-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full text-center py-16 text-slate-400">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-[#c8102e]"></i>
      <p class="mt-3 text-sm font-medium">Đang tải tin tức...</p>
    </div>
  `;

  try {
    let url = `/api/blogs?all=1`;
    if (currentCategory && currentCategory !== 'all') {
      url += `&category=${encodeURIComponent(currentCategory)}`;
    }
    if (currentSearch) {
      url += `&search=${encodeURIComponent(currentSearch)}`;
    }

    const res = await fetch(url);
    const result = await res.json();
    if (!result.success || !result.data) {
      container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 text-sm">Không có bài viết nào.</div>`;
      return;
    }

    // Hiển thị đầy đủ tất cả các bài viết cấu hình từ Admin
    allBlogs = result.data || [];

    renderBlogs();
  } catch (err) {
    console.error('Lỗi khi tải tin tức:', err);
    container.innerHTML = `<div class="col-span-full text-center py-12 text-red-500 text-sm">Không thể kết nối đến máy chủ.</div>`;
  }
}

function renderBlogs() {
  const container = document.getElementById('blogs-grid');
  if (!container) return;

  if (allBlogs.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-100">
        <i class="fa-regular fa-newspaper text-4xl text-slate-300 mb-3"></i>
        <p class="text-sm font-bold text-slate-700">Chưa có bài viết trong danh mục này</p>
        <button onclick="filterBlogCategory('all')" class="mt-3 px-4 py-1.5 rounded-full bg-[#c8102e] text-white text-xs font-bold">Xem tất cả</button>
      </div>
    `;
    renderPagination(0);
    return;
  }

  const totalPages = Math.ceil(allBlogs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = allBlogs.slice(startIndex, startIndex + itemsPerPage);

  container.innerHTML = pageItems.map(b => {
    let dateStr = '20/09/2026';
    if (b.created_at) {
      try {
        const d = new Date(b.created_at);
        dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      } catch (e) {}
    }

    return `
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 transition duration-300 overflow-hidden flex flex-col justify-between group">
        <div>
          <!-- Ảnh đại diện -->
          <a href="/blog-detail?id=${b.id}" class="block h-44 sm:h-48 overflow-hidden bg-slate-100 relative">
            <img src="${b.image}" alt="${b.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
            <!-- Badge ngày đăng góc trái dưới ảnh -->
            <div class="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 shadow-xs flex items-center space-x-1.5 border border-slate-100">
              <i class="fa-regular fa-calendar text-[#c8102e] text-xs"></i>
              <span>${dateStr}</span>
            </div>
          </a>

          <!-- Nội dung tóm tắt -->
          <div class="p-4 sm:p-5">
            <a href="/blog-detail?id=${b.id}" class="block font-black text-sm sm:text-base text-[#0f172a] hover:text-[#c8102e] transition leading-snug line-clamp-2 mb-2">
              ${b.title}
            </a>
            <p class="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
              ${b.summary || ''}
            </p>
          </div>
        </div>

        <!-- Nút Xem chi tiết chuẩn hình 1 -->
        <div class="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
          <a href="/blog-detail?id=${b.id}" class="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-4 rounded-full bg-[#c8102e] hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-2xs transition">
            <span>Xem chi tiết</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');

  renderPagination(totalPages);
}

function filterBlogCategory(catName) {
  currentCategory = catName;
  currentPage = 1;

  // Cập nhật tab active
  const tabs = document.querySelectorAll('#filter-tabs-container .tab-btn');
  tabs.forEach(btn => {
    if ((catName === 'all' && btn.textContent.trim() === 'Tất cả') || btn.textContent.trim() === catName) {
      btn.className = 'tab-btn px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-[#c8102e] text-white transition';
    } else {
      btn.className = 'tab-btn px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition';
    }
  });

  fetchBlogs();
}

function renderPagination(totalPages) {
  const container = document.getElementById('blogs-pagination');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Nút Lùi trang (<)
  if (currentPage > 1) {
    html += `
      <button 
        onclick="goToPage(${currentPage - 1})" 
        class="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-slate-700 font-bold text-sm shadow-2xs flex items-center justify-center transition"
        title="Trang trước"
      >
        <i class="fa-solid fa-chevron-left text-xs"></i>
      </button>
    `;
  }

  // Danh sách các số trang: [1], [2], ...
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === currentPage;
    html += `
      <button 
        onclick="goToPage(${i})" 
        class="w-9 h-9 rounded-lg font-bold text-sm shadow-2xs flex items-center justify-center transition ${
          isActive 
            ? 'bg-[#c8102e] text-white shadow-xs font-black' 
            : 'bg-white border border-slate-200 hover:border-red-300 text-slate-700'
        }"
      >
        ${i}
      </button>
    `;
  }

  // Nút Tới trang (>)
  if (currentPage < totalPages) {
    html += `
      <button 
        onclick="goToPage(${currentPage + 1})" 
        class="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-slate-700 font-bold text-sm shadow-2xs flex items-center justify-center transition"
        title="Trang sau"
      >
        <i class="fa-solid fa-chevron-right text-xs"></i>
      </button>
    `;
  }

  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderBlogs();
  const topAnchor = document.getElementById('filter-tabs-container') || document.getElementById('blogs-grid');
  if (topAnchor) {
    topAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 350, behavior: 'smooth' });
  }
}

