// ========================================================
// JAVASCRIPT: CHI TIẾT BÀI VIẾT TIN TỨC (BLOG-DETAIL.JS)
// CHUẨN GIAO DIỆN HÌNH MẪU 2
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const blogId = urlParams.get('id') || '1';

  loadBlogDetail(blogId);
  loadSidebarRelatedBlogs(blogId);
  loadBottomRelatedBlogs(blogId);
});

// 1. Tải chi tiết bài viết
async function loadBlogDetail(id) {
  try {
    const res = await fetch(`/api/blogs/${id}`);
    const result = await res.json();
    if (!result.success || !result.data) {
      console.error('Không tìm thấy bài viết');
      return;
    }

    const b = result.data;
    document.title = `${b.title} - Điện Việt`;

    const titleEl = document.getElementById('article-title');
    if (titleEl) titleEl.textContent = b.title;

    const breadcrumbTitle = document.getElementById('breadcrumb-article-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = b.title;

    const authorEl = document.getElementById('article-author');
    if (authorEl) authorEl.textContent = b.author || 'Điện Việt';

    const catEl = document.getElementById('article-category');
    if (catEl) catEl.textContent = b.category || 'Mẹo hay - Kinh nghiệm sử dụng điện';

    const heroImg = document.getElementById('article-hero-image');
    if (heroImg) heroImg.src = b.image || '/images/blog-saving-hero.jpg';

    if (b.created_at) {
      try {
        const d = new Date(b.created_at);
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const dateEl = document.getElementById('article-date');
        if (dateEl) dateEl.textContent = dateStr;
      } catch (e) {}
    }

    const bodyEl = document.getElementById('article-body-content');
    if (bodyEl) {
      bodyEl.innerHTML = b.content || `<p class="text-sm text-slate-700 leading-relaxed">${b.summary || ''}</p>`;
    }
  } catch (err) {
    console.error('Lỗi khi tải chi tiết tin tức:', err);
  }
}

// 2. Tải danh sách 5 bài viết bên Sidebar trái (chuẩn hình 2)
async function loadSidebarRelatedBlogs(currentId) {
  const container = document.getElementById('sidebar-related-list');
  if (!container) return;

  try {
    const res = await fetch('/api/blogs?all=1');
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      const related = result.data.filter(item => String(item.id) !== String(currentId)).slice(0, 5);
      if (related.length > 0) {
        container.innerHTML = related.map(item => {
          let dateStr = '20/09/2026';
          if (item.created_at) {
            try {
              const d = new Date(item.created_at);
              dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            } catch (e) {}
          }
          return `
            <div class="flex items-center space-x-3 pt-3 first:pt-0 group cursor-pointer" onclick="window.location.href='/blog-detail?id=${item.id}'">
              <div class="w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                <img src="${item.image || '/images/blog-saving-hero.jpg'}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
              </div>
              <div class="flex-1 min-w-0">
                <span class="block text-[11px] text-slate-400 font-medium mb-0.5">${dateStr}</span>
                <h4 class="text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-[#c8102e] transition leading-snug line-clamp-2">
                  ${item.title}
                </h4>
              </div>
            </div>
          `;
        }).join('');
        return;
      }
    }
  } catch (err) {
    console.error('Lỗi khi tải bài viết sidebar:', err);
  }

  const sampleSidebar = [
    { id: 4, date: '11/09/2026', title: '5 lưu ý an toàn điện trong mùa mưa', image: '/images/blog-safety-rain.jpg' },
    { id: 8, date: '08/09/2026', title: 'Điện mặt trời – Giải pháp năng lượng xanh', image: '/images/blog-solar-energy.jpg' },
    { id: 3, date: '05/09/2026', title: 'Cách chọn dây điện phù hợp cho gia đình', image: '/images/blog-wire-family.jpg' },
    { id: 9, date: '02/09/2026', title: 'Hướng dẫn chọn aptomat an toàn', image: '/images/blog-aptomat-guide.jpg' },
    { id: 5, date: '30/08/2026', title: 'Ưu điểm của đèn LED so với đèn truyền thống', image: '/images/blog-led-modern.jpg' }
  ];

  container.innerHTML = sampleSidebar.map(item => `
    <div class="flex items-center space-x-3 pt-3 first:pt-0 group cursor-pointer" onclick="window.location.href='/blog-detail?id=${item.id}'">
      <div class="w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
        <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
      </div>
      <div class="flex-1 min-w-0">
        <span class="block text-[11px] text-slate-400 font-medium mb-0.5">${item.date}</span>
        <h4 class="text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-[#c8102e] transition leading-snug line-clamp-2">
          ${item.title}
        </h4>
      </div>
    </div>
  `).join('');
}

// 3. Tải danh sách 4 bài viết liên quan dưới chân bài viết (chuẩn hình 2)
async function loadBottomRelatedBlogs(currentId) {
  const container = document.getElementById('bottom-related-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/blogs?all=1');
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      const related = result.data.filter(item => String(item.id) !== String(currentId)).slice(0, 4);
      if (related.length > 0) {
        container.innerHTML = related.map(item => {
          let dateStr = '20/09/2026';
          if (item.created_at) {
            try {
              const d = new Date(item.created_at);
              dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            } catch (e) {}
          }
          return `
            <div class="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition duration-300 flex flex-col justify-between group">
              <div>
                <a href="/blog-detail?id=${item.id}" class="block h-28 sm:h-32 rounded-lg overflow-hidden bg-slate-100 mb-2">
                  <img src="${item.image || '/images/blog-saving-hero.jpg'}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                </a>
                <span class="block text-[11px] text-slate-400 font-medium mb-1">${dateStr}</span>
                <a href="/blog-detail?id=${item.id}" class="block font-bold text-xs sm:text-[13px] text-[#0f172a] group-hover:text-[#c8102e] transition leading-snug line-clamp-2 mb-2">
                  ${item.title}
                </a>
              </div>
              <a href="/blog-detail?id=${item.id}" class="inline-flex items-center space-x-1 text-xs font-bold text-[#c8102e] hover:underline pt-1">
                <span>Xem chi tiết</span>
                <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </a>
            </div>
          `;
        }).join('');
        return;
      }
    }
  } catch (err) {
    console.error('Lỗi khi tải bài viết liên quan:', err);
  }

  const sampleBottom = [
    { id: 8, date: '08/09/2026', title: 'Điện mặt trời – Giải pháp năng lượng xanh', image: '/images/blog-solar-energy.jpg' },
    { id: 3, date: '05/09/2026', title: 'Cách chọn dây điện phù hợp cho gia đình', image: '/images/blog-wire-family.jpg' },
    { id: 5, date: '30/08/2026', title: 'Ưu điểm của đèn LED so với đèn truyền thống', image: '/images/blog-led-modern.jpg' },
    { id: 9, date: '28/08/2026', title: 'Hướng dẫn chọn aptomat an toàn', image: '/images/blog-aptomat-guide.jpg' }
  ];

  container.innerHTML = sampleBottom.map(item => `
    <div class="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition duration-300 flex flex-col justify-between group">
      <div>
        <a href="/blog-detail?id=${item.id}" class="block h-28 sm:h-32 rounded-lg overflow-hidden bg-slate-100 mb-2">
          <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
        </a>
        <span class="block text-[11px] text-slate-400 font-medium mb-1">${item.date}</span>
        <a href="/blog-detail?id=${item.id}" class="block font-bold text-xs sm:text-[13px] text-[#0f172a] group-hover:text-[#c8102e] transition leading-snug line-clamp-2 mb-2">
          ${item.title}
        </a>
      </div>
      <a href="/blog-detail?id=${item.id}" class="inline-flex items-center space-x-1 text-xs font-bold text-[#c8102e] hover:underline pt-1">
        <span>Xem chi tiết</span>
        <i class="fa-solid fa-arrow-right text-[10px]"></i>
      </a>
    </div>
  `).join('');
}

