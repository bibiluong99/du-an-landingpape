// ========================================================
// JAVASCRIPT: CHI TIẾT BÀI VIẾT TIN TỨC (BLOG-DETAIL.JS)
// CHUẨN GIAO DIỆN HÌNH MẪU 2 & ĐỒNG BỘ PERSISTENCE TOÀN DIỆN
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const blogId = urlParams.get('id') || '1';

  loadBlogDetail(blogId);
  loadSidebarRelatedBlogs(blogId);
  loadBottomRelatedBlogs(blogId);
});

// Helper lấy danh sách blogs từ LocalStorage
function getLocalBlogs() {
  try {
    const raw = localStorage.getItem('dienviet_persistent_blogs');
    const del = localStorage.getItem('dienviet_deleted_blog_ids');
    const blogs = raw ? JSON.parse(raw) : [];
    const delIds = del ? JSON.parse(del) : [];
    return {
      blogs: Array.isArray(blogs) ? blogs : [],
      delIds: Array.isArray(delIds) ? delIds : []
    };
  } catch (e) {
    return { blogs: [], delIds: [] };
  }
}

// 1. Tải chi tiết bài viết
async function loadBlogDetail(id) {
  let blogData = null;

  try {
    const res = await fetch(`/api/blogs/${id}`);
    if (res.ok) {
      const result = await res.json();
      if (result && result.success && result.data) {
        blogData = result.data;
      }
    }
  } catch (err) {
    console.warn('Lỗi khi gọi API chi tiết bài viết:', err);
  }

  // Fallback sang LocalStorage nếu máy chủ chưa nạp kịp hoặc cold restart
  const { blogs: localBlogs, delIds } = getLocalBlogs();
  if (!blogData) {
    const foundLocal = localBlogs.find(b => String(b.id) === String(id));
    if (foundLocal && !delIds.includes(Number(id)) && !delIds.includes(String(id))) {
      blogData = foundLocal;
      console.log('Đã nạp bài viết từ bộ nhớ cục bộ (localStorage):', blogData.title);

      // Đồng bộ ngầm lên serverless store
      fetch('/api/sync-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customBlogs: localBlogs, deletedBlogIds: delIds })
      }).catch(() => {});
    }
  }

  const b = blogData;
  if (!b) {
    console.error('Không tìm thấy bài viết ID:', id);
    document.title = 'Không tìm thấy bài viết - Điện Việt';

    const titleEl = document.getElementById('article-title');
    if (titleEl) titleEl.textContent = 'Bài viết không tồn tại';

    const breadcrumbTitle = document.getElementById('breadcrumb-article-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = 'Không tìm thấy bài viết';

    const bodyEl = document.getElementById('article-body-content');
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="py-12 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-100 p-6 my-4">
          <div class="w-16 h-16 rounded-full bg-red-100 text-[#c8102e] flex items-center justify-center mx-auto text-2xl">
            <i class="fa-solid fa-file-circle-xmark"></i>
          </div>
          <h2 class="text-lg font-bold text-slate-800">Không tìm thấy nội dung bài viết</h2>
          <p class="text-sm text-slate-500 max-w-md mx-auto">Bài viết này có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
          <div class="pt-2">
            <a href="/blogs" class="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#c8102e] text-white text-xs font-bold hover:bg-red-700 transition shadow-sm">
              <i class="fa-solid fa-arrow-left"></i>
              <span>Quay lại danh sách tin tức</span>
            </a>
          </div>
        </div>
      `;
    }
    return;
  }

  document.title = `${b.title} - Điện Việt`;

  const titleEl = document.getElementById('article-title');
  if (titleEl) titleEl.textContent = b.title;

  const breadcrumbTitle = document.getElementById('breadcrumb-article-title');
  if (breadcrumbTitle) breadcrumbTitle.textContent = b.title;

  const authorEl = document.getElementById('article-author');
  if (authorEl) authorEl.textContent = b.author || 'Điện Việt';

  const catEl = document.getElementById('article-category');
  if (catEl) catEl.textContent = b.category || 'Tin tức & Kiến thức';

  const heroImg = document.getElementById('article-hero-image');
  if (heroImg) {
    heroImg.src = b.image || '/images/blog-saving-hero.jpg';
    heroImg.alt = b.title;
  }

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
    let htmlContent = '';
    const rawContent = b.content || b.summary || '';
    if (rawContent && rawContent.trim()) {
      const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);
      if (isHtml) {
        htmlContent = rawContent;
      } else {
        // Plain text: phân tách các đoạn bằng xuống dòng kép hoặc đơn
        const paragraphs = rawContent.split(/\n\s*\n/);
        htmlContent = paragraphs.map(p => {
          const lines = p.trim().replace(/\n/g, '<br>');
          return `<p class="text-sm sm:text-base text-slate-700 leading-relaxed mb-4">${lines}</p>`;
        }).join('');
      }
    }
    bodyEl.innerHTML = htmlContent || `<p class="text-sm text-slate-500 italic">Đang cập nhật nội dung chi tiết bài viết...</p>`;
  }
}

// 2. Tải danh sách 5 bài viết bên Sidebar trái (chuẩn hình 2)
async function loadSidebarRelatedBlogs(currentId) {
  const container = document.getElementById('sidebar-related-list');
  if (!container) return;

  const { blogs: localBlogs, delIds } = getLocalBlogs();
  let serverBlogs = [];

  try {
    const res = await fetch('/api/blogs?all=1');
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      serverBlogs = result.data;
    }
  } catch (err) {
    console.error('Lỗi khi tải bài viết sidebar:', err);
  }

  // Hợp nhất serverBlogs và localBlogs
  let combined = serverBlogs.filter(b => !delIds.includes(Number(b.id)) && !delIds.includes(String(b.id)));
  localBlogs.forEach(lb => {
    if (delIds.includes(Number(lb.id)) || delIds.includes(String(lb.id))) return;
    const exist = combined.find(cb => String(cb.id) === String(lb.id));
    if (!exist) {
      combined.unshift(lb);
    } else {
      Object.assign(exist, lb);
    }
  });

  const related = combined.filter(item => String(item.id) !== String(currentId)).slice(0, 5);

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

  const { blogs: localBlogs, delIds } = getLocalBlogs();
  let serverBlogs = [];

  try {
    const res = await fetch('/api/blogs?all=1');
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      serverBlogs = result.data;
    }
  } catch (err) {
    console.error('Lỗi khi tải bài viết liên quan:', err);
  }

  // Hợp nhất serverBlogs và localBlogs
  let combined = serverBlogs.filter(b => !delIds.includes(Number(b.id)) && !delIds.includes(String(b.id)));
  localBlogs.forEach(lb => {
    if (delIds.includes(Number(lb.id)) || delIds.includes(String(lb.id))) return;
    const exist = combined.find(cb => String(cb.id) === String(lb.id));
    if (!exist) {
      combined.unshift(lb);
    } else {
      Object.assign(exist, lb);
    }
  });

  const related = combined.filter(item => String(item.id) !== String(currentId)).slice(0, 4);

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
