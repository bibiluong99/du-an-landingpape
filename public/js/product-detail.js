// ========================================================
// JAVASCRIPT: CHI TIẾT SẢN PHẨM (PRODUCT-DETAIL.JS)
// CHUẨN GIAO DIỆN HÌNH MẪU 2
// ========================================================

let currentProduct = null;
let currentImageIndex = 0;
let productGalleryImages = [];
let quantity = 1;

document.addEventListener('DOMContentLoaded', () => {
  // Lấy ID sản phẩm từ URL (mặc định id = 1)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || '1';

  loadProductDetail(productId);
  loadRelatedProducts(productId);
});

// 1. Tải chi tiết sản phẩm từ API
async function loadProductDetail(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    const result = await res.json();
    if (!result.success || !result.data) {
      console.error('Không tìm thấy sản phẩm');
      return;
    }

    currentProduct = result.data;
    renderProductInfo(currentProduct);
  } catch (err) {
    console.error('Lỗi khi tải chi tiết sản phẩm:', err);
  }
}

// Helper Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper Định dạng tiền tệ VNĐ
function formatVND(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
}

// 2. Điền thông tin sản phẩm vào giao diện
function renderProductInfo(p) {
  // Tiêu đề & Mô tả ngắn
  const titleEl = document.getElementById('product-name');
  if (titleEl) titleEl.textContent = p.name;
  document.title = `${p.name} - Công ty TNHH Điện Việt`;

  // Hiển thị giá bán kế bên số lượng
  const priceEl = document.getElementById('product-price');
  if (priceEl) {
    if (p.price && Number(p.price) > 0) {
      priceEl.textContent = formatVND(p.price);
    } else {
      priceEl.textContent = 'Liên hệ';
    }
  }

  // Render mô tả ngắn linh hoạt theo CSDL
  const shortDescContainer = document.getElementById('product-short-desc-container');
  if (shortDescContainer) {
    if (p.short_desc && p.short_desc.trim()) {
      const rawText = p.short_desc.trim();
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      if (lines.length > 1) {
        // Có nhiều dòng: Dòng đầu là đoạn tóm tắt (nếu ko có gạch đầu dòng), các dòng sau là danh sách điểm nổi bật có tick đỏ
        let html = '';
        lines.forEach((line, idx) => {
          if (idx === 0 && !line.startsWith('-') && !line.startsWith('*') && !line.startsWith('•')) {
            html += `<p class="text-xs sm:text-sm 2xl:text-base text-slate-700 leading-relaxed font-medium mb-1.5">${escapeHtml(line)}</p>`;
          } else {
            const cleanLine = line.replace(/^[-*•]\s*/, '');
            html += `
              <div class="flex items-start space-x-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0 mt-0.5"></i>
                <span class="leading-relaxed">${escapeHtml(cleanLine)}</span>
              </div>
            `;
          }
        });
        shortDescContainer.innerHTML = html;
      } else {
        // 1 dòng: hiển thị đoạn văn mô tả rõ nét
        shortDescContainer.innerHTML = `
          <p class="text-xs sm:text-sm 2xl:text-base text-slate-700 leading-relaxed font-medium">
            ${escapeHtml(rawText)}
          </p>
        `;
      }
    } else {
      // Khi sản phẩm chưa có mô tả ngắn: hiển thị cam kết phù hợp
      const isCadivi = p.name && p.name.includes('Cadivi');
      shortDescContainer.innerHTML = `
        <p class="text-xs sm:text-sm 2xl:text-base text-slate-600 leading-relaxed mb-1.5">
          ${isCadivi ? `${escapeHtml(p.name)} được sản xuất theo tiêu chuẩn chất lượng Việt Nam, đảm bảo an toàn, bền bỉ và dẫn điện tốt.` : 'Sản phẩm chính hãng chất lượng cao phân phối bởi Điện Việt.'}
        </p>
        <div class="space-y-2 py-1">
          <div class="flex items-center space-x-2.5 text-xs sm:text-sm font-semibold text-slate-700">
            <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0"></i>
            <span>${isCadivi ? 'Chất lượng chính hãng Cadivi' : 'Cam kết chất lượng chính hãng 100%'}</span>
          </div>
          <div class="flex items-center space-x-2.5 text-xs sm:text-sm font-semibold text-slate-700">
            <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0"></i>
            <span>${isCadivi ? 'Dẫn điện tốt, an toàn tuyệt đối' : 'Bảo hành chính hãng theo tiêu chuẩn'}</span>
          </div>
          <div class="flex items-center space-x-2.5 text-xs sm:text-sm font-semibold text-slate-700">
            <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0"></i>
            <span>${isCadivi ? 'Độ bền cao, tuổi thọ lâu dài' : 'Giao hàng toàn quốc nhanh chóng'}</span>
          </div>
          <div class="flex items-center space-x-2.5 text-xs sm:text-sm font-semibold text-slate-700">
            <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0"></i>
            <span>${isCadivi ? 'Phù hợp cho dân dụng và công trình' : 'Hỗ trợ tư vấn và báo giá ưu đãi tốt nhất'}</span>
          </div>
        </div>
      `;
    }
  }

  // Kích hoạt hiển thị Tab mặc định (Mô tả sản phẩm) với định dạng hoàn chỉnh
  switchTab('desc');

  // Breadcrumb
  const breadcrumbCat = document.getElementById('breadcrumb-category');
  if (breadcrumbCat) breadcrumbCat.textContent = p.category_name || 'Dây điện';

  // Modal input prefill
  const modalProdInput = document.getElementById('contact-product-name');
  if (modalProdInput) modalProdInput.value = p.name;

  // Bộ sưu tập ảnh (Gallery) từ Database
  productGalleryImages = [];
  if (p.images) {
    try {
      const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
      if (Array.isArray(parsed) && parsed.length > 0) {
        productGalleryImages = parsed.filter(Boolean);
      }
    } catch (e) {
      if (typeof p.images === 'string' && p.images.trim()) productGalleryImages = [p.images.trim()];
    }
  }

  if (productGalleryImages.length === 0 && p.image) {
    productGalleryImages = [p.image];
  }

  // Fallback mặc định nếu sản phẩm chưa có ảnh
  if (productGalleryImages.length === 0) {
    if (String(p.id) === '1' || (p.name && p.name.includes('Cadivi'))) {
      productGalleryImages = [
        '/images/prod-cadivi-big.jpg',
        '/images/prod-cadivi-thumb-2.jpg',
        '/images/prod-cadivi-thumb-3.jpg',
        '/images/prod-cadivi-thumb-4.jpg'
      ];
    } else {
      productGalleryImages = ['/images/prod-cadivi-big.jpg'];
    }
  }

  renderThumbnails();
  setProductImage(0);
}

// Render danh sách hình thu nhỏ nhỏ gọn theo số lượng ảnh thực tế của sản phẩm
function renderThumbnails() {
  const container = document.getElementById('product-thumbnails-container');
  if (!container) return;

  container.className = 'flex items-center justify-center gap-2 sm:gap-2.5 overflow-x-auto py-1';

  container.innerHTML = productGalleryImages.map((img, idx) => `
    <button type="button" onclick="setProductImage(${idx})" class="thumb-btn ${idx === currentImageIndex ? 'border-2 border-[#c8102e] shadow-xs' : 'border border-slate-200 hover:border-red-300 shadow-2xs'} w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden p-1 bg-white flex items-center justify-center shrink-0 cursor-pointer transition">
      <img src="${img}" alt="Thumbnail ${idx + 1}" class="w-full h-full object-contain">
    </button>
  `).join('');
}

// 3. Quản lý chuyển đổi ảnh chính & thumbnails
function setProductImage(index) {
  if (index < 0 || index >= productGalleryImages.length) return;
  currentImageIndex = index;

  const mainImg = document.getElementById('main-product-image');
  if (mainImg) {
    mainImg.src = productGalleryImages[index];
  }

  // Cập nhật viền đỏ trên thumbnail đang chọn
  const thumbBtns = document.querySelectorAll('.thumb-btn');
  thumbBtns.forEach((btn, idx) => {
    if (idx === index) {
      btn.className = 'thumb-btn border-2 border-[#c8102e] shadow-xs w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden p-1 bg-white flex items-center justify-center shrink-0 cursor-pointer transition';
    } else {
      btn.className = 'thumb-btn border border-slate-200 hover:border-red-300 shadow-2xs w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden p-1 bg-white flex items-center justify-center shrink-0 cursor-pointer transition';
    }
  });
}

function prevImage() {
  let next = currentImageIndex - 1;
  if (next < 0) next = productGalleryImages.length - 1;
  setProductImage(next);
}

function nextImage() {
  let next = currentImageIndex + 1;
  if (next >= productGalleryImages.length) next = 0;
  setProductImage(next);
}

// 4. Quản lý số lượng (Quantity Stepper)
function changeQuantity(delta) {
  quantity = Math.max(1, quantity + delta);
  const input = document.getElementById('quantity-input');
  if (input) input.value = quantity;
}

// 5. Thêm vào giỏ hàng
function addToCart() {
  const currentCount = parseInt(localStorage.getItem('cart_count') || '0', 10);
  const newCount = currentCount + quantity;
  localStorage.setItem('cart_count', newCount);

  // Cập nhật counter trên header
  const counter = document.getElementById('cart-counter');
  if (counter) counter.textContent = newCount;

  showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng thành công!`);
}

// Helper định dạng văn bản thành đoạn văn hoặc danh sách gạch đầu dòng có icon tick đỏ
function renderFormattedContent(rawText, fallbackText = 'Thông tin chi tiết về sản phẩm đang được cập nhật.') {
  if (!rawText || !rawText.trim()) {
    return `<p class="text-xs sm:text-sm 2xl:text-base text-slate-500 italic leading-relaxed">${escapeHtml(fallbackText)}</p>`;
  }

  const lines = rawText.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return `<p class="text-xs sm:text-sm 2xl:text-base text-slate-500 italic leading-relaxed">${escapeHtml(fallbackText)}</p>`;
  }

  let html = '<div class="space-y-3">';
  let currentBullets = [];

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      html += `
        <ul class="space-y-2 py-1">
          ${currentBullets.map(b => `
            <li class="flex items-start space-x-2.5 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
              <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0 mt-0.5"></i>
              <span>${escapeHtml(b)}</span>
            </li>
          `).join('')}
        </ul>
      `;
      currentBullets = [];
    }
  };

  lines.forEach((line) => {
    const isBullet = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
    if (isBullet) {
      currentBullets.push(line.replace(/^[-*•]\s*/, ''));
    } else {
      flushBullets();
      html += `<p class="text-xs sm:text-sm 2xl:text-base text-slate-700 leading-relaxed font-medium">${escapeHtml(line)}</p>`;
    }
  });

  flushBullets();
  html += '</div>';
  return html;
}

// Helper render thông số kỹ thuật thông minh (hỗ trợ JSON Object, định dạng Khóa: Giá trị, hoặc danh sách gạch đầu dòng)
function renderFormattedSpecs(rawSpecs) {
  if (!rawSpecs || !rawSpecs.trim()) {
    return `
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-500 italic">
        Thông số kỹ thuật của sản phẩm đang được cập nhật.
      </div>
    `;
  }

  // 1. Thử parse dạng JSON
  try {
    const parsed = typeof rawSpecs === 'string' ? JSON.parse(rawSpecs.trim()) : rawSpecs;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
      const rows = Object.entries(parsed).map(([k, v]) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition">
          <td class="py-2.5 px-4 font-bold text-slate-700 bg-slate-50/70 w-1/3 sm:w-1/4">${escapeHtml(k)}</td>
          <td class="py-2.5 px-4 text-slate-700 font-medium">${escapeHtml(v)}</td>
        </tr>
      `).join('');

      return `
        <div class="overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full text-xs sm:text-sm text-left">
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }
  } catch (e) {
    // Không phải JSON, tiếp tục phân tích văn bản
  }

  // 2. Xử lý văn bản thường
  const lines = rawSpecs.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return `
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-500 italic">
        Thông số kỹ thuật của sản phẩm đang được cập nhật.
      </div>
    `;
  }

  // Kiểm tra xem phần lớn dòng có định dạng "Khóa: Giá trị" không
  const colonLines = lines.filter(l => {
    const clean = l.replace(/^[-*•]\s*/, '');
    const idx = clean.indexOf(':');
    return idx > 0 && idx < 50;
  });

  if (colonLines.length > 0 && colonLines.length >= lines.length * 0.6) {
    const rows = lines.map(l => {
      const clean = l.replace(/^[-*•]\s*/, '');
      const idx = clean.indexOf(':');
      if (idx > 0) {
        const key = clean.substring(0, idx).trim();
        const val = clean.substring(idx + 1).trim();
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition">
            <td class="py-2.5 px-4 font-bold text-slate-700 bg-slate-50/70 w-1/3 sm:w-1/4">${escapeHtml(key)}</td>
            <td class="py-2.5 px-4 text-slate-700 font-medium">${escapeHtml(val)}</td>
          </tr>
        `;
      } else {
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition">
            <td colspan="2" class="py-2.5 px-4 font-bold text-slate-800 bg-slate-100/70">${escapeHtml(clean)}</td>
          </tr>
        `;
      }
    }).join('');

    return `
      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-xs sm:text-sm text-left">
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // Dạng gạch đầu dòng hoặc văn bản tự do: hiển thị thẻ khung viền sạch sẽ, nổi bật các điểm kỹ thuật
  return `
    <div class="bg-slate-50/70 rounded-xl border border-slate-200 p-4 sm:p-5">
      ${renderFormattedContent(rawSpecs, 'Thông số kỹ thuật đang được cập nhật.')}
    </div>
  `;
}

// 6. Quản lý các Tabs thông tin
function switchTab(tabKey) {
  const tabs = ['desc', 'specs', 'app', 'policy'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) {
      if (t === tabKey) {
        btn.className = 'w-full py-2.5 px-2 rounded-xl text-xs font-bold text-center transition sm:w-auto sm:px-6 sm:py-2.5 sm:rounded-t-xl sm:rounded-b-none sm:text-sm bg-[#c8102e] text-white shadow-2xs';
      } else {
        btn.className = 'w-full py-2.5 px-2 rounded-xl text-xs font-semibold text-center transition sm:w-auto sm:px-6 sm:py-2.5 sm:rounded-t-xl sm:rounded-b-none sm:text-sm bg-white sm:bg-slate-100 text-slate-600 sm:text-slate-700 hover:bg-slate-50 sm:hover:bg-slate-200';
      }
    }
  });

  const contentArea = document.getElementById('tab-content-area');
  if (!contentArea || !currentProduct) return;

  if (tabKey === 'desc') {
    contentArea.innerHTML = `
      <div class="flex items-center mb-3">
        <span class="section-title-bar"></span>
        <h3 class="text-base sm:text-lg font-black text-[#0f172a]">Giới thiệu sản phẩm</h3>
      </div>
      ${renderFormattedContent(currentProduct.description || currentProduct.short_desc, 'Thông tin chi tiết về sản phẩm đang được cập nhật.')}
    `;
  } else if (tabKey === 'specs') {
    contentArea.innerHTML = `
      <div class="flex items-center mb-3">
        <span class="section-title-bar"></span>
        <h3 class="text-base sm:text-lg font-black text-[#0f172a]">Thông số kỹ thuật chi tiết</h3>
      </div>
      ${renderFormattedSpecs(currentProduct.specs)}
    `;
  } else if (tabKey === 'app') {
    let appHtml = '';
    if (currentProduct.applications && currentProduct.applications.trim()) {
      appHtml = renderFormattedContent(currentProduct.applications, 'Ứng dụng của sản phẩm đang được cập nhật.');
    } else {
      appHtml = `
        <ul class="space-y-2 py-1">
          <li class="flex items-start space-x-2.5 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
            <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0 mt-0.5"></i>
            <span>Ứng dụng trong các công trình dân dụng, tòa nhà văn phòng và chung cư.</span>
          </li>
          <li class="flex items-start space-x-2.5 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
            <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0 mt-0.5"></i>
            <span>Lắp đặt trong hệ thống điện công nghiệp, nhà xưởng và nhà máy sản xuất.</span>
          </li>
          <li class="flex items-start space-x-2.5 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
            <i class="fa-solid fa-circle-check text-[#c8102e] text-sm shrink-0 mt-0.5"></i>
            <span>Được kiểm định chất lượng nghiêm ngặt, đảm bảo độ an toàn và độ bền vận hành lâu dài.</span>
          </li>
        </ul>
      `;
    }

    contentArea.innerHTML = `
      <div class="flex items-center mb-3">
        <span class="section-title-bar"></span>
        <h3 class="text-base sm:text-lg font-black text-[#0f172a]">Ứng dụng thực tế</h3>
      </div>
      ${appHtml}
    `;
  } else if (tabKey === 'policy') {
    let policyContent = '';
    if (currentProduct.warranty_policy && currentProduct.warranty_policy.trim()) {
      const polLines = currentProduct.warranty_policy.trim().split('\n').map(l => l.trim()).filter(Boolean);
      policyContent = `
        <div class="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          ${polLines.map(l => {
            const isBullet = l.startsWith('-') || l.startsWith('*') || l.startsWith('•');
            const clean = l.replace(/^[-*•]\s*/, '');
            if (isBullet) {
              return `
                <div class="flex items-start space-x-2.5 font-medium">
                  <i class="fa-solid fa-shield-halved text-[#c8102e] text-sm shrink-0 mt-0.5"></i>
                  <span>${escapeHtml(clean)}</span>
                </div>
              `;
            } else {
              return `<p class="font-semibold text-slate-800 mb-1">${escapeHtml(clean)}</p>`;
            }
          }).join('')}
        </div>
      `;
    } else {
      policyContent = `
        <div class="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p class="flex items-start space-x-2.5 font-medium"><i class="fa-solid fa-shield-halved text-[#c8102e] text-sm shrink-0 mt-0.5"></i><span><strong>Cam kết bảo hành:</strong> Bảo hành chính hãng 12 - 24 tháng theo đúng tiêu chuẩn kỹ thuật nhà sản xuất.</span></p>
          <p class="flex items-start space-x-2.5 font-medium"><i class="fa-solid fa-rotate-left text-[#c8102e] text-sm shrink-0 mt-0.5"></i><span><strong>Chính sách đổi trả:</strong> Đổi mới sản phẩm trong vòng 7 ngày nếu phát sinh lỗi từ nhà sản xuất.</span></p>
          <p class="flex items-start space-x-2.5 font-medium"><i class="fa-solid fa-headset text-[#c8102e] text-sm shrink-0 mt-0.5"></i><span><strong>Hỗ trợ kỹ thuật:</strong> Đội ngũ kỹ sư Điện Việt hỗ trợ tư vấn quy cách, kiểm tra tải và hướng dẫn lắp đặt 24/7.</span></p>
        </div>
      `;
    }

    contentArea.innerHTML = `
      <div class="flex items-center mb-3">
        <span class="section-title-bar"></span>
        <h3 class="text-base sm:text-lg font-black text-[#0f172a]">Chính sách bảo hành & Đổi trả</h3>
      </div>
      ${policyContent}
    `;
  }
}

// 7. Tải 6 sản phẩm liên quan
async function loadRelatedProducts(currentId) {
  const container = document.getElementById('related-products-grid');
  if (!container) return;

  try {
    const res = await fetch(`/api/products?limit=10`);
    const result = await res.json();
    if (!result.success || !result.data) return;

    // Lọc bỏ sản phẩm hiện tại, lấy đúng 6 sản phẩm
    const related = result.data.filter(p => String(p.id) !== String(currentId)).slice(0, 6);

    container.innerHTML = related.map(p => `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs hover:shadow-md hover:-translate-y-1 transition duration-300 flex flex-col justify-between text-center group">
        <div>
          <a href="/product-detail?id=${p.id}" class="block overflow-hidden rounded-xl mb-2.5 h-24 sm:h-28 flex items-center justify-center bg-slate-50/40 p-1.5">
            <img src="${p.image}" alt="${p.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300">
          </a>
          <a href="/product-detail?id=${p.id}" class="font-bold text-xs sm:text-[13px] text-[#0f172a] hover:text-[#c8102e] line-clamp-2 min-h-[32px] flex items-center justify-center leading-snug mb-2.5">
            ${p.name}
          </a>
        </div>
        <a href="/product-detail?id=${p.id}" class="w-full inline-flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-full bg-[#c8102e] hover:bg-red-700 text-white font-bold text-xs shadow-2xs transition">
          <span>Xem chi tiết</span>
          <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </a>
      </div>
    `).join('');
  } catch (err) {
    console.error('Lỗi khi tải sản phẩm liên quan:', err);
  }
}

// Toast thông báo
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'fixed bottom-5 right-5 z-50 bg-[#0f172a] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-semibold transform translate-y-10 opacity-0 transition-all duration-300';
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check text-green-400 text-lg"></i>
    <span>${msg}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  }, 50);

  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function toggleFavorite() {
  showToast('Đã thêm sản phẩm vào danh sách yêu thích!');
}

function shareProduct() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    showToast('Đã sao chép liên kết sản phẩm vào bộ nhớ tạm!');
  } else {
    showToast('Liên kết: ' + window.location.href);
  }
}

// ========================================================
// XỬ LÝ LIÊN HỆ TƯ VẤN TRANG CHI TIẾT SẢN PHẨM
// ========================================================
function openContactModal() {
  const modal = document.getElementById('contact-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('active');
  }
}

function closeContactModal() {
  const modal = document.getElementById('contact-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
  }
}

function handleProductDetailContact(event) {
  if (event) event.preventDefault();
  if (currentProduct && currentProduct.id) {
    window.location.href = `/contact?product_id=${currentProduct.id}`;
  } else {
    window.location.href = '/contact';
  }
}

window.formatVND = formatVND;
window.openContactModal = openContactModal;
window.closeContactModal = closeContactModal;
window.handleProductDetailContact = handleProductDetailContact;


