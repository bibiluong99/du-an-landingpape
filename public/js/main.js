// ========================================================
// JAVASCRIPT: CLIENT LANDING PAGE - ĐIỆN VIỆT (MAIN.JS)
// TONE MÀU ĐỎ & TRẮNG CHUẨN THIẾT KẾ ĐIỆN VIỆT
// ========================================================

function formatVND(amount) {
  if (!amount && amount !== 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  let icon = type === 'error' ? 'fa-circle-xmark text-red-600' : (type === 'warning' ? 'fa-triangle-exclamation text-amber-500' : (type === 'info' ? 'fa-circle-info text-blue-600' : 'fa-circle-check text-green-600'));

  toast.innerHTML = `
    <i class="fa-solid ${icon} text-lg shrink-0"></i>
    <span class="flex-1 text-xs font-bold">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px) scale(0.95)';
    toast.style.transition = 'all 0.35s ease';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

let allCatalogProducts = [];
let cartCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = mobileMenu.classList.toggle('hidden');
      const icon = mobileBtn.querySelector('i');
      if (icon) {
        if (isHidden) {
          icon.className = 'fa-solid fa-bars text-xl';
        } else {
          icon.className = 'fa-solid fa-xmark text-xl text-[#c8102e]';
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
        if (!mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
          const icon = mobileBtn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-bars text-xl';
        }
      }
    });
  }

  // 2. Load System Settings
  loadSettings();

  // 3. Load Danh mục sản phẩm (6 danh mục)
  loadCategories();

  // 4. Load Sản phẩm bán chạy (5 sản phẩm)
  loadBestsellerProducts();

  // 5. Load Tin tức & Kiến thức (3 bài viết)
  loadBlogs();

  // 6. Load All Products for Quote Selector
  loadAllProductsForQuote();

  // 7. Setup Contact Form Handler & Quote Selector
  setupContactForm();

  // 8. Setup Product Detail Modal
  setupProductModal();
});

// Helper format Tên thương hiệu hiển thị đẹp mắt (từ cuối màu đỏ thương hiệu)
function formatBrandName(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length > 1) {
    const last = words.pop();
    return `${words.join(' ')} <span class="text-[#c8102e]">${last}</span>`;
  }
  return `<span class="text-[#c8102e]">${name}</span>`;
}

function formatFooterBrandName(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length > 1) {
    const last = words.pop();
    return `${words.join(' ')} <span class="text-red-200">${last}</span>`;
  }
  return `<span class="text-red-200">${name}</span>`;
}

// ========================================================
// 1. TẢI CÀI ĐẶT HỆ THỐNG (SETTINGS)
// ========================================================
async function loadSettings() {
  try {
    const res = await fetch('/api/settings?_t=' + Date.now());
    const result = await res.json();
    if (!result.success || !result.data) return;

    const s = result.data;

    // 1. Cập nhật Tên thương hiệu (Header & Footer)
    if (s.company_name && String(s.company_name).trim()) {
      const brandHtml = formatBrandName(String(s.company_name).trim());
      const footerBrandHtml = formatFooterBrandName(String(s.company_name).trim());
      document.querySelectorAll('#company-name-header, .site-company-name').forEach(el => {
        el.innerHTML = brandHtml;
      });
      document.querySelectorAll('.site-footer-company-name').forEach(el => {
        el.innerHTML = footerBrandHtml;
      });
    }

    // 2. Cập nhật Slogan thương hiệu (Header & Footer)
    if (s.company_slogan && String(s.company_slogan).trim()) {
      const slogan = String(s.company_slogan).trim();
      document.querySelectorAll('#company-slogan-header, .site-company-slogan').forEach(el => {
        el.textContent = slogan;
      });
      document.querySelectorAll('.site-footer-slogan').forEach(el => {
        el.textContent = slogan;
      });
    }

    if (s.phone) {
      document.querySelectorAll('#header-phone, .header-phone-val').forEach(el => {
        el.textContent = s.phone;
        if (el.tagName === 'A') el.href = `tel:${s.phone.replace(/[^0-9]/g, '')}`;
      });
      document.querySelectorAll('#footer-phone').forEach(el => {
        el.textContent = s.phone;
      });
      const cPhone = document.getElementById('contact-page-phone');
      if (cPhone) {
        cPhone.textContent = s.phone;
        cPhone.href = `tel:${s.phone.replace(/[^0-9]/g, '')}`;
      }
    }

    if (s.email) {
      document.querySelectorAll('#footer-email').forEach(el => {
        el.textContent = s.email;
      });
      const cEmail = document.getElementById('contact-page-email');
      if (cEmail) {
        cEmail.textContent = s.email;
        cEmail.href = `mailto:${s.email}`;
      }
    }

    if (s.address) {
      document.querySelectorAll('#footer-address').forEach(el => {
        el.textContent = s.address;
      });
      const cAddr = document.getElementById('contact-page-address');
      if (cAddr) cAddr.textContent = s.address;
    }

    if (s.working_hours) {
      const cHours = document.getElementById('contact-page-hours');
      if (cHours) {
        const lines = s.working_hours.split(/\n|\|/).map(l => l.trim()).filter(Boolean);
        cHours.innerHTML = lines.map(line => `<p>${line}</p>`).join('');
      }
    }

    if (s.about_why_choose) {
      const wDesc = document.getElementById('about-why-desc');
      if (wDesc) {
        const isWhyHtml = /<[a-z][\s\S]*>/i.test(s.about_why_choose);
        wDesc.style.whiteSpace = isWhyHtml ? 'normal' : 'pre-line';
        wDesc.innerHTML = s.about_why_choose;
        wDesc.classList.remove('hidden');
      }
    }

    if (s.about_title) {
      const aTitle = document.getElementById('about-title');
      if (aTitle) aTitle.textContent = s.about_title;
      const aUsTitle = document.getElementById('about-us-title');
      if (aUsTitle) aUsTitle.textContent = s.about_title;
    }

    if (s.about_history) {
      let rawHistory = String(s.about_history).trim();
      if (rawHistory.includes('<style') && !rawHistory.includes('</style>')) {
        rawHistory += '\n</style>';
      }
      window.fullAboutHistoryContent = rawHistory;
      const isRichHtml = /<div\b|<article\b|<section\b|<style\b|company-intro-card/i.test(rawHistory);

      const aHist = document.getElementById('about-history');
      if (aHist) {
        if (isRichHtml) {
          const cleanHtml = rawHistory.replace(/<style\b[^>]*>[\s\S]*?(<\/style>|$)/gi, '');
          const temp = document.createElement('div');
          temp.innerHTML = cleanHtml;
          const paragraphs = Array.from(temp.querySelectorAll('p'))
            .map(p => p.textContent.trim())
            .filter(Boolean);
          const summary = paragraphs.length > 0 
            ? paragraphs.slice(0, 3).join('\n\n') 
            : temp.textContent.trim();
          aHist.style.whiteSpace = 'pre-line';
          aHist.style.display = '-webkit-box';
          aHist.style.webkitLineClamp = '4';
          aHist.style.webkitBoxOrient = 'vertical';
          aHist.style.overflow = 'hidden';
          aHist.textContent = summary;
        } else {
          aHist.style.whiteSpace = 'pre-line';
          aHist.style.display = '-webkit-box';
          aHist.style.webkitLineClamp = '4';
          aHist.style.webkitBoxOrient = 'vertical';
          aHist.style.overflow = 'hidden';
          aHist.innerHTML = rawHistory;
        }
      }

      const aUsDesc = document.getElementById('about-us-desc');
      if (aUsDesc) {
        if (isRichHtml) {
          aUsDesc.style.whiteSpace = 'normal';
          const colLeft = document.getElementById('about-us-col-left');
          const colRight = document.getElementById('about-us-col-right');
          const gridEl = document.getElementById('about-us-grid');
          if (colLeft) colLeft.className = 'w-full';
          if (colRight) colRight.classList.add('hidden');
          if (gridEl) gridEl.className = 'w-full';
          if (/<h[1-3]\b|class=["'][^"']*company-title[^"']*["']/i.test(rawHistory)) {
            const aUsTitle = document.getElementById('about-us-title');
            if (aUsTitle) aUsTitle.classList.add('hidden');
          }
        } else {
          aUsDesc.style.whiteSpace = 'pre-line';
        }
        aUsDesc.innerHTML = rawHistory;
      }
    }

    if (s.about_values) {
      const aVal = document.getElementById('about-values');
      if (aVal) {
        // Luôn ẩn trên Landing page theo yêu cầu người dùng
        aVal.classList.add('hidden');
      }
      const aValDesc = document.getElementById('about-values-desc');
      if (aValDesc) {
        const isValHtml = /<[a-z][\s\S]*>/i.test(s.about_values);
        aValDesc.style.whiteSpace = isValHtml ? 'normal' : 'pre-line';
        aValDesc.innerHTML = s.about_values;
      }
    }

    // Dynamic Logo (Header & Footer)
    if (s.logo_url && String(s.logo_url).trim()) {
      const logoUrl = String(s.logo_url).trim();
      document.querySelectorAll('.site-logo-img').forEach(img => {
        img.src = logoUrl;
        img.classList.remove('hidden');
      });
      document.querySelectorAll('.site-logo-icon').forEach(icon => {
        icon.classList.add('hidden');
      });
      document.querySelectorAll('.footer-logo-img').forEach(img => {
        img.src = logoUrl;
        img.classList.remove('hidden');
      });
      document.querySelectorAll('.footer-logo-icon').forEach(icon => {
        icon.classList.add('hidden');
      });
    } else {
      document.querySelectorAll('.site-logo-img').forEach(img => {
        img.classList.add('hidden');
      });
      document.querySelectorAll('.site-logo-icon').forEach(icon => {
        icon.classList.remove('hidden');
      });
      document.querySelectorAll('.footer-logo-img').forEach(img => {
        img.classList.add('hidden');
      });
      document.querySelectorAll('.footer-logo-icon').forEach(icon => {
        icon.classList.remove('hidden');
      });
    }

    if (s.maps_embed) {
      const fMap = document.getElementById('footer-map-iframe');
      if (fMap) fMap.src = s.maps_embed;
    }

    // Cập nhật Banner động cho các trang
    if (s.banner_home) {
      const bHome = document.getElementById('page-banner-home');
      if (bHome) bHome.src = s.banner_home;
    }
    if (s.banner_about) {
      const bAbout = document.getElementById('page-banner-about');
      if (bAbout) bAbout.src = s.banner_about;
    }
    if (s.banner_products) {
      document.querySelectorAll('#page-banner-products, #page-banner-product-detail').forEach(el => {
        el.src = s.banner_products;
      });
    }
    if (s.banner_blogs) {
      document.querySelectorAll('#page-banner-blogs, #page-banner-blog-detail').forEach(el => {
        el.src = s.banner_blogs;
      });
    }
    if (s.banner_contact) {
      const bContact = document.getElementById('page-banner-contact');
      if (bContact) bContact.src = s.banner_contact;
    }

    // Đồng bộ cấu hình Loại Báo Giá / Liên Hệ vào trang Contact và Modal Liên Hệ
    if (s.quote_types) {
      try {
        const list = typeof s.quote_types === 'string' ? JSON.parse(s.quote_types) : s.quote_types;
        if (Array.isArray(list) && list.length > 0) {
          // 1. Đồng bộ thẻ <select id="form-type"> trên trang Contact
          const typeSelect = document.getElementById('form-type');
          if (typeSelect) {
            const currentVal = typeSelect.value;
            let optionsHtml = `<option value=""${!currentVal ? ' selected' : ''}>-- Chọn loại --</option>\n`;
            list.forEach((item) => {
              const name = typeof item === 'string' ? item : item.name;
              const isBg = name.toLowerCase().includes('báo giá') || name.toLowerCase().includes('bao gia');
              const show = isBg ? 'true' : 'false';
              const selected = (currentVal && currentVal === name) ? ' selected' : '';
              optionsHtml += `                  <option value="${name}" data-show-products="${show}"${selected}>${name}</option>\n`;
            });
            typeSelect.innerHTML = optionsHtml;
            if (typeof toggleProductInterest === 'function') toggleProductInterest();
            if (typeof syncCustomTypeLabel === 'function') syncCustomTypeLabel();
          }

          // 2. Đồng bộ các radio buttons trong Modal Liên hệ (Landing Page)
          const modalTypeContainer = document.getElementById('contact-modal-type-group');
          if (modalTypeContainer) {
            modalTypeContainer.innerHTML = list.map((item, idx) => {
              const name = typeof item === 'string' ? item : item.name;
              const isBg = name.toLowerCase().includes('báo giá') || name.toLowerCase().includes('bao gia');
              const show = isBg ? 'true' : 'false';
              return `
                <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-xs sm:text-sm text-slate-700">
                  <input type="radio" name="contact-type" value="${name}" data-show-products="${show}" ${idx === 0 ? 'checked' : ''} class="text-[#c8102e] focus:ring-[#c8102e] w-4 h-4">
                  <span>${name}</span>
                </label>
              `;
            }).join('');

            modalTypeContainer.querySelectorAll('input[name="contact-type"]').forEach(r => {
              r.addEventListener('change', (e) => {
                const quoteContainer = document.getElementById('quote-product-container');
                const val = (e.target.value || '').toLowerCase().trim();
                const isShow = val.includes('báo giá') || val.includes('bao gia');
                if (quoteContainer) {
                  if (isShow) quoteContainer.classList.remove('hidden');
                  else quoteContainer.classList.add('hidden');
                }
              });
            });
          }
        }
      } catch (e) {
        console.error('Lỗi phân tích quote_types:', e);
      }
    }
  } catch (err) {
    console.error('Lỗi khi tải settings:', err);
  }
}

// ========================================================
// 2. DANH MỤC SẢN PHẨM (CHỈ HIỂN THỊ DANH MỤC CHA)
// ========================================================
async function loadCategories() {
  const container = document.getElementById('category-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/categories?parent_only=true&active_only=true');
    const result = await res.json();
    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 font-medium">Chưa có danh mục nào.</div>`;
      return;
    }

    // Chỉ lọc các danh mục cha có trạng thái Hiển thị (show_in_slider = 1)
    const parentCategories = result.data.filter(cat => !cat.parent_id && (cat.show_in_slider === 1 || cat.show_in_slider === undefined));
    if (parentCategories.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 font-medium">Chưa có danh mục nào.</div>`;
      return;
    }

    container.innerHTML = parentCategories.map(cat => `
      <a href="/products?category_id=${cat.id}" class="bg-white rounded-2xl border border-slate-200/90 hover:border-red-400 hover:shadow-lg transition-all duration-300 p-3 sm:p-3.5 xl:p-4 2xl:p-6 flex flex-col items-center text-center group cursor-pointer">
        <div class="w-full h-20 sm:h-24 xl:h-28 2xl:h-36 flex items-center justify-center p-2 mb-2 group-hover:scale-105 transition duration-300">
          <img src="${cat.image || '/images/hd/cat-day-dien.jpg'}" alt="${cat.name}" class="max-w-full max-h-full object-contain drop-shadow-xs" onerror="this.onerror=null; this.src='/images/hd/cat-day-dien.jpg';">
        </div>
        <span class="text-xs sm:text-sm xl:text-[15px] 2xl:text-[17px] font-bold text-[#0f172a] group-hover:text-[#c8102e] transition leading-tight mt-auto">
          ${cat.name}
        </span>
      </a>
    `).join('');
  } catch (err) {
    console.error('Lỗi khi tải danh mục:', err);
  }
}

// ========================================================
// 3. SẢN PHẨM BÁN CHẠY (BESTSELLERS - 5 SẢN PHẨM)
// ========================================================
async function loadBestsellerProducts() {
  const container = document.getElementById('bestseller-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/products?type=bestseller');
    const result = await res.json();
    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 font-medium">Chưa có sản phẩm bán chạy nào.</div>`;
      return;
    }

    const products = result.data.slice(0, 5);

    container.innerHTML = products.map((p, idx) => {
      return `
        <div class="bg-white rounded-2xl border border-slate-200/90 hover:border-red-300 hover:shadow-xl transition-all duration-300 p-3 sm:p-3.5 xl:p-4 2xl:p-6 flex flex-col justify-between group relative">
          <!-- Hot badge -->
          <span class="absolute top-3 left-3 bg-[#c8102e] text-white text-[11px] xl:text-xs 2xl:text-sm font-black px-2.5 py-0.5 xl:py-1 rounded-full shadow-xs z-10 uppercase tracking-wide flex items-center space-x-1">
            <i class="fa-solid fa-fire text-[10px]"></i>
            <span>Hot</span>
          </span>

          <a href="/product-detail?id=${p.id}" class="block cursor-pointer">
            <!-- Product image -->
            <div class="h-28 sm:h-32 xl:h-36 2xl:h-44 flex items-center justify-center p-2 mb-2 group-hover:scale-105 transition duration-300">
              <img src="${p.image || '/images/hd/prod-cadivi-25.jpg'}" alt="${p.name}" class="max-w-full max-h-full object-contain drop-shadow-xs" onerror="this.onerror=null; this.src='/images/hd/cat-day-dien.jpg';">
            </div>
            
            <!-- Title -->
            <h3 class="text-xs sm:text-sm xl:text-[15px] 2xl:text-[17px] font-bold text-[#0f172a] group-hover:text-[#c8102e] transition truncate leading-snug" title="${p.name}">
              ${p.name}
            </h3>

            <!-- Price -->
            <div class="flex items-baseline space-x-2 mt-2.5 mb-1.5 2xl:mb-2">
              <span class="text-sm sm:text-base xl:text-lg 2xl:text-xl font-black text-[#c8102e]">
                ${formatVND(p.price)}
              </span>
            </div>
          </a>

          <!-- Nút di chuyển đến trang chi tiết sản phẩm liên quan -->
          <a href="/product-detail?id=${p.id}" class="w-full mt-2 xl:mt-2.5 2xl:mt-3.5 py-2 xl:py-2.5 2xl:py-3.5 px-3 xl:px-4 bg-[#c8102e] hover:bg-red-700 text-white font-bold text-xs xl:text-sm 2xl:text-base rounded-xl shadow-xs transition flex items-center justify-center space-x-2 active:scale-95 text-center">
            <span>Xem chi tiết</span>
            <i class="fa-solid fa-arrow-right text-xs xl:text-sm"></i>
          </a>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Lỗi khi tải sản phẩm bán chạy:', err);
  }
}

function addToCartAndQuote(productId, productName, productImg) {
  cartCount++;
  const badge = document.getElementById('cart-counter');
  if (badge) badge.textContent = cartCount;

  showToast(`Đã thêm "${productName}" vào giỏ hàng!`, 'success');

  // Tự động gán sản phẩm vào bộ chọn báo giá dưới form
  selectQuoteProduct(productName, productImg);
}

// ========================================================
// 4. TIN TỨC & KIẾN THỨC (3 BÀI VIẾT)
// ========================================================
async function loadBlogs() {
  const container = document.getElementById('blog-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/blogs?limit=3');
    const result = await res.json();
    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 font-medium">Chưa có bài viết tin tức nào.</div>`;
      return;
    }

    container.innerHTML = result.data.map(b => {
      let dateFormatted = '12/11/2024';
      if (b.created_at) {
        try {
          const d = new Date(b.created_at);
          dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } catch (e) {}
      }

      return `
        <a href="/blog-detail?id=${b.id}" class="bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-red-300 hover:shadow-lg transition-all duration-300 flex flex-col group cursor-pointer block">
          <div class="h-40 sm:h-48 xl:h-52 2xl:h-64 overflow-hidden bg-slate-100 relative">
            <img src="${b.image || '/images/blog-chon-day-dien.jpg'}" alt="${b.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
          </div>
          <div class="p-4 sm:p-5 2xl:p-6 flex-1 flex flex-col justify-between">
            <h3 class="font-bold text-xs sm:text-sm xl:text-base 2xl:text-lg text-[#0f172a] group-hover:text-[#c8102e] transition line-clamp-2 leading-snug">
              ${b.title}
            </h3>
            <div class="flex items-center space-x-2 text-[11px] xl:text-xs 2xl:text-sm text-slate-400 mt-3 pt-3 border-t border-slate-100 font-medium">
              <i class="fa-regular fa-clock text-slate-400"></i>
              <span>${dateFormatted}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  } catch (err) {
    console.error('Lỗi khi tải tin tức:', err);
  }
}

// ========================================================
// 5. TRƯỜNG CHỌN SẢN PHẨM BÁO GIÁ KÈM LỌC TÊN
// ========================================================
async function loadAllProductsForQuote() {
  try {
    const res = await fetch('/api/products?limit=100');
    const result = await res.json();
    if (result.success && result.data) {
      allCatalogProducts = result.data;
      renderQuoteProductDropdown(allCatalogProducts);
      setupQuoteProductFilter();
    }
  } catch (err) {
    console.error('Lỗi khi tải danh sách sản phẩm cho báo giá:', err);
  }
}

function renderQuoteProductDropdown(products) {
  const dropdown = document.getElementById('quote-product-dropdown');
  if (!dropdown) return;

  if (products.length === 0) {
    dropdown.innerHTML = `<div class="p-3 text-center text-xs text-slate-400">Không tìm thấy sản phẩm nào khớp với từ khóa.</div>`;
    return;
  }

  dropdown.innerHTML = products.map(p => `
    <div onclick="selectQuoteProduct('${p.name.replace(/'/g, "\\'")}', '${p.image || ''}')" class="p-3 hover:bg-red-50 flex items-center justify-between cursor-pointer transition">
      <div class="flex items-center space-x-3">
        <img src="${p.image || '/images/mockup_assets/prod-cadivi-25.png'}" alt="${p.name}" class="w-9 h-9 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0">
        <div>
          <span class="block text-xs font-bold text-slate-900 hover:text-brand-600 line-clamp-1">${p.name}</span>
          <span class="text-[10px] text-slate-400">${p.category_name || 'Thiết bị điện'}</span>
        </div>
      </div>
      <span class="text-xs font-black text-brand-600 shrink-0 ml-2">${formatVND(p.price)}</span>
    </div>
  `).join('');
}

function setupQuoteProductFilter() {
  const searchInput = document.getElementById('quote-product-search');
  const dropdown = document.getElementById('quote-product-dropdown');
  const toggleBtn = document.getElementById('toggle-product-dropdown-btn');
  const dropdownIcon = document.getElementById('quote-dropdown-icon');

  if (!searchInput || !dropdown) return;

  searchInput.addEventListener('input', (e) => {
    const kw = e.target.value.toLowerCase().trim();
    dropdown.classList.remove('hidden');
    if (dropdownIcon) dropdownIcon.style.transform = 'rotate(180deg)';

    const filtered = allCatalogProducts.filter(p => p.name.toLowerCase().includes(kw));
    renderQuoteProductDropdown(filtered);
  });

  searchInput.addEventListener('focus', () => {
    dropdown.classList.remove('hidden');
    if (dropdownIcon) dropdownIcon.style.transform = 'rotate(180deg)';
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = dropdown.classList.toggle('hidden');
      if (dropdownIcon) dropdownIcon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  }

  document.addEventListener('click', (e) => {
    const picker = document.getElementById('quote-product-picker');
    if (picker && !picker.contains(e.target)) {
      dropdown.classList.add('hidden');
      if (dropdownIcon) dropdownIcon.style.transform = 'rotate(0deg)';
    }
  });

  const typeRadios = document.querySelectorAll('input[name="contact-type"]');
  const quoteContainer = document.getElementById('quote-product-container');

  typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'Báo giá') {
        if (quoteContainer) quoteContainer.classList.remove('hidden');
      } else {
        if (quoteContainer) quoteContainer.classList.add('hidden');
      }
    });
  });
}

function selectQuoteProduct(productName, productImg) {
  const selectedBox = document.getElementById('selected-product-box');
  const selectedName = document.getElementById('selected-product-name');
  const selectedImg = document.getElementById('selected-product-img');
  const hiddenInput = document.getElementById('contact-product-name');
  const searchInput = document.getElementById('quote-product-search');
  const dropdown = document.getElementById('quote-product-dropdown');
  const dropdownIcon = document.getElementById('quote-dropdown-icon');

  if (hiddenInput) hiddenInput.value = productName;
  if (selectedName) selectedName.textContent = productName;
  if (selectedImg) selectedImg.src = productImg || '/images/mockup_assets/prod-cadivi-25.png';
  if (selectedBox) selectedBox.classList.remove('hidden');

  if (searchInput) searchInput.value = '';
  if (dropdown) dropdown.classList.add('hidden');
  if (dropdownIcon) dropdownIcon.style.transform = 'rotate(0deg)';

  const msgInput = document.getElementById('contact-message');
  if (msgInput && (!msgInput.value || msgInput.value.includes('Điện Việt'))) {
    msgInput.value = `Xin chào Điện Việt! Tôi quan tâm và muốn nhận bảng báo giá chiết khấu cho sản phẩm: "${productName}". Vui lòng liên hệ tư vấn giúp tôi.`;
  }

  showToast(`Đã chọn sản phẩm: ${productName}`, 'info');
}

function clearSelectedQuoteProduct() {
  const selectedBox = document.getElementById('selected-product-box');
  const hiddenInput = document.getElementById('contact-product-name');
  const searchInput = document.getElementById('quote-product-search');

  if (hiddenInput) hiddenInput.value = '';
  if (selectedBox) selectedBox.classList.add('hidden');
  if (searchInput) searchInput.value = '';
  renderQuoteProductDropdown(allCatalogProducts);
}

// ========================================================
// 6. XỬ LÝ SUBMIT FORM LIÊN HỆ
// ========================================================
function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullname = document.getElementById('contact-fullname').value.trim();
    const phone = document.getElementById('contact-phone-input').value.trim();
    const email = document.getElementById('contact-email-input').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    
    const typeRadio = document.querySelector('input[name="contact-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'Báo giá';
    const product_name = (document.getElementById('contact-product-name')?.value || '').trim();

    if (!fullname || !phone || !message) {
      showToast('Vui lòng điền: Họ tên, Số điện thoại và Lời nhắn!', 'error');
      return;
    }

    const submitBtn = document.getElementById('contact-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang gửi...';

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname, phone, email, type, product_name, message })
      });

      const result = await res.json();
      if (result.success) {
        showToast(result.message || 'Gửi liên hệ thành công!', 'success');
        form.reset();
        clearSelectedQuoteProduct();
        setTimeout(() => closeContactModal(), 600);
      } else {
        showToast(result.message || 'Lỗi khi gửi!', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ!', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ========================================================
// 7. POPUP MODAL CHI TIẾT SẢN PHẨM & BLOG
// ========================================================
function setupProductModal() {
  const modal = document.getElementById('product-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  if (modal) {
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
  }

  const contactModal = document.getElementById('contact-modal');
  if (contactModal) {
    contactModal.addEventListener('click', (e) => {
      if (e.target === contactModal) closeContactModal();
    });
  }
}

async function openProductDetailModal(productId) {
  const modal = document.getElementById('product-modal');
  const modalBody = document.getElementById('modal-body');
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <div class="text-center py-16">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-brand-600"></i>
      <p class="mt-3 text-sm text-slate-500">Đang tải thông tin chi tiết...</p>
    </div>
  `;
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/products/${productId}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      modalBody.innerHTML = `<div class="text-center py-8 text-red-600">Không tìm thấy thông tin sản phẩm!</div>`;
      return;
    }

    const p = result.data;

    let specsHtml = '';
    if (p.specs) {
      try {
        const specsObj = typeof p.specs === 'string' && p.specs.startsWith('{') ? JSON.parse(p.specs) : null;
        if (specsObj) {
          specsHtml = `
            <div class="mt-4 pt-4 border-t border-slate-100">
              <h4 class="font-black text-xs uppercase text-slate-700 tracking-wider mb-2.5">
                <i class="fa-solid fa-sliders text-brand-600 mr-1.5"></i> Thông Số Kỹ Thuật:
              </h4>
              <div class="bg-slate-50 rounded-2xl p-3.5 divide-y divide-slate-200/60 text-xs">
                ${Object.entries(specsObj).map(([k, v]) => `
                  <div class="py-2 flex justify-between">
                    <span class="font-medium text-slate-500">${k}:</span>
                    <span class="font-bold text-slate-800 text-right">${v}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        } else {
          specsHtml = `
            <div class="mt-4 pt-4 border-t border-slate-100">
              <h4 class="font-black text-xs uppercase text-slate-700 tracking-wider mb-2">Thông Số Kỹ Thuật:</h4>
              <p class="text-xs text-slate-600">${p.specs}</p>
            </div>
          `;
        }
      } catch (e) {
        specsHtml = `<div class="mt-2 text-xs text-slate-500">${p.specs}</div>`;
      }
    }

    modalBody.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div class="space-y-3.5">
          <div class="rounded-3xl overflow-hidden border border-red-100 bg-white p-6 flex items-center justify-center shadow-inner h-80">
            <img src="${p.image || '/images/mockup_assets/prod-cadivi-25.png'}" alt="${p.name}" class="max-w-full max-h-full object-contain">
          </div>
          
          <div class="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold">
            <span><i class="fa-solid fa-box mr-1 text-brand-600"></i> Tình trạng: <strong class="text-emerald-600">Còn hàng</strong></span>
            <span><i class="fa-solid fa-shield mr-1 text-brand-600"></i> Bảo hành chính hãng 100%</span>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center space-x-2">
            <span class="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              ${p.category_name || 'Thiết bị điện'}
            </span>
            ${p.is_promo ? '<span class="px-3 py-1 rounded-full text-[10px] font-black bg-brand-600 text-white">Top Bán Chạy</span>' : ''}
          </div>

          <h2 class="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
            ${p.name}
          </h2>

          <div class="flex items-baseline space-x-3 p-3 bg-red-50/70 rounded-2xl border border-red-100">
            <span class="text-2xl font-black text-brand-600">${formatVND(p.price)}</span>
          </div>

          <div class="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p class="font-semibold text-slate-800">${p.short_desc || ''}</p>
            <div class="pt-2 text-slate-600 space-y-1">
              ${p.description || ''}
            </div>
          </div>

          ${specsHtml}

          <div class="pt-4 flex flex-col sm:flex-row gap-3">
            <button onclick="requestQuoteForProduct('${p.name.replace(/'/g, "\\'")}', '${p.image || ''}')" class="btn-shimmer flex-1 py-3 px-5 rounded-xl font-black text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-red-200 transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider">
              <i class="fa-solid fa-cart-shopping"></i>
              <span>Thêm Vào Giỏ & Nhận Báo Giá</span>
            </button>
            <a href="tel:18001234" class="py-3 px-5 rounded-xl font-bold text-slate-700 hover:text-brand-600 bg-slate-100 hover:bg-red-50 border border-slate-200 transition flex items-center justify-center space-x-2 text-xs">
              <i class="fa-solid fa-phone"></i>
              <span>1800 1234</span>
            </a>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    modalBody.innerHTML = `<div class="text-center py-8 text-red-600">Lỗi khi tải dữ liệu!</div>`;
  }
}

function openContactModal() {
  const modal = document.getElementById('contact-modal');
  if (modal) modal.classList.add('active');
}

function closeContactModal() {
  const modal = document.getElementById('contact-modal');
  if (modal) modal.classList.remove('active');
}

function requestQuoteForProduct(productName, productImg = '') {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.remove('active');

  openContactModal();

  const quoteRadio = document.querySelector('input[name="contact-type"][value="Báo giá"]');
  if (quoteRadio) {
    quoteRadio.checked = true;
    const quoteContainer = document.getElementById('quote-product-container');
    if (quoteContainer) quoteContainer.classList.remove('hidden');
  }

  selectQuoteProduct(productName, productImg);

  const nameInput = document.getElementById('contact-fullname');
  if (nameInput) nameInput.focus();
}

async function openBlogModal(blogId) {
  try {
    const res = await fetch(`/api/blogs/${blogId}`);
    const result = await res.json();
    if (!result.success) return;

    const b = result.data;
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('product-modal');

    modalBody.innerHTML = `
      <div class="space-y-5">
        <div class="rounded-2xl overflow-hidden shadow-inner max-h-80">
          <img src="${b.image}" alt="${b.title}" class="w-full h-full object-cover">
        </div>
        
        <div class="flex items-center space-x-3 text-xs text-slate-400">
          <span class="px-2.5 py-0.5 rounded-full bg-red-100 text-brand-700 font-bold">Tin Tức Điện Việt</span>
          <span>•</span>
          <span><i class="fa-solid fa-user-pen mr-1 text-brand-600"></i> ${b.author}</span>
          <span>•</span>
          <span><i class="fa-regular fa-calendar mr-1"></i> ${new Date(b.created_at).toLocaleDateString('vi-VN')}</span>
        </div>

        <h2 class="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
          ${b.title}
        </h2>

        <div class="text-sm font-semibold text-slate-700 bg-red-50/70 p-4 rounded-2xl border-l-4 border-brand-600">
          ${b.summary}
        </div>

        <div class="text-sm text-slate-600 leading-relaxed space-y-3 pt-2">
          ${b.content}
        </div>

        <div class="pt-6 border-t border-slate-100 flex items-center justify-between">
          <a href="/blogs" class="text-xs font-bold text-brand-600 hover:underline flex items-center">
            <i class="fa-solid fa-list mr-1.5"></i> Xem tất cả tin tức
          </a>
          <button onclick="document.getElementById('product-modal').classList.remove('active')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
            Đóng
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  } catch (err) {
    console.error(err);
  }
}

// Modal Popup Về chúng tôi (Khi nhấn Tìm hiểu thêm)
function openAboutPopupModal() {
  const modal = document.getElementById('about-modal-popup');
  const body = document.getElementById('about-modal-body');
  if (!modal || !body) return;

  const content = window.fullAboutHistoryContent || '';
  if (!content) {
    body.innerHTML = document.getElementById('about-history')?.innerHTML || '<div class="py-10 text-center text-slate-400">Đang tải nội dung...</div>';
  } else {
    body.innerHTML = content;
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAboutPopupModal() {
  const modal = document.getElementById('about-modal-popup');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

window.openAboutPopupModal = openAboutPopupModal;
window.closeAboutPopupModal = closeAboutPopupModal;
