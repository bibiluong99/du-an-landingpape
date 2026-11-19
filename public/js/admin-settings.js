// ========================================================
// MODULE: CẤU HÌNH WEBSITE, THƯ VIỆN ẢNH & LIVE PREVIEW (ADMIN-SETTINGS.JS)
// ========================================================

// 8. TAB 6: CẤU HÌNH WEBSITE (4 SUB-TABS)
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

function applySettingsToAdminForm(s) {
  if (!s || typeof s !== 'object') return;
  if (s.company_name !== undefined && document.getElementById('set-company-name')) document.getElementById('set-company-name').value = s.company_name;
  if (s.company_slogan !== undefined && document.getElementById('set-company-slogan')) document.getElementById('set-company-slogan').value = s.company_slogan;
  if (s.phone !== undefined && document.getElementById('set-phone')) document.getElementById('set-phone').value = s.phone;
  if (s.email !== undefined && document.getElementById('set-email')) document.getElementById('set-email').value = s.email;
  if (s.address !== undefined && document.getElementById('set-address')) document.getElementById('set-address').value = s.address;
  if (s.zalo_link !== undefined && document.getElementById('set-zalo')) document.getElementById('set-zalo').value = s.zalo_link;
  if (s.facebook_link !== undefined && document.getElementById('set-fb')) document.getElementById('set-fb').value = s.facebook_link;
  if (s.shopee_link !== undefined && document.getElementById('set-shopee')) document.getElementById('set-shopee').value = s.shopee_link;
  if (s.maps_embed !== undefined && document.getElementById('set-maps')) document.getElementById('set-maps').value = s.maps_embed;
  if (s.working_hours !== undefined && document.getElementById('set-working-hours')) document.getElementById('set-working-hours').value = s.working_hours;
  if (s.smtp_user !== undefined && document.getElementById('set-smtp-user')) document.getElementById('set-smtp-user').value = s.smtp_user;
  if (s.smtp_pass !== undefined && document.getElementById('set-smtp-pass')) document.getElementById('set-smtp-pass').value = s.smtp_pass;

  // Logo
  const logoInput = document.getElementById('set-logo-url');
  if (logoInput && s.logo_url !== undefined) logoInput.value = s.logo_url || '';
  if (s.logo_url !== undefined) updateLogoPreview(s.logo_url || '');

  // Giới thiệu, Giá trị cốt lõi & Tại sao nên chọn
  if (s.about_title !== undefined && document.getElementById('set-about-title')) document.getElementById('set-about-title').value = s.about_title;
  if (s.about_history !== undefined && document.getElementById('set-about-history')) document.getElementById('set-about-history').value = s.about_history;
  if (s.about_mission !== undefined && document.getElementById('set-about-mission')) document.getElementById('set-about-mission').value = s.about_mission;
  if (s.about_values !== undefined && document.getElementById('set-about-values')) document.getElementById('set-about-values').value = s.about_values;
  if (s.about_why_choose !== undefined && document.getElementById('set-about-why')) document.getElementById('set-about-why').value = s.about_why_choose;

  if (s.quote_types) loadQuoteTypesSettings(s.quote_types);
}

async function loadSettings() {
  // 1. Nạp tức thì từ LocalStorage để giao diện hiển thị ngay không bị mất sau khi F5
  const localSettings = getLocalStore(LOCAL_STORAGE_KEYS.SETTINGS, {});
  websiteSettingsCache = { ...websiteSettingsCache, ...localSettings };
  applySettingsToAdminForm(localSettings);

  try {
    const res = await fetch('/api/admin/settings', { headers: getAuthHeaders() });
    const result = await res.json();
    const serverSettings = (result && result.success && result.data) ? result.data : {};

    // Hợp nhất dữ liệu: LocalStorage bảo vệ các trường như smtp_user, smtp_pass khi serverless cold-start
    const merged = { ...serverSettings, ...localSettings };
    Object.keys(serverSettings).forEach(k => {
      if (serverSettings[k] && !localSettings[k]) {
        merged[k] = serverSettings[k];
      }
    });

    websiteSettingsCache = merged;
    setLocalStore(LOCAL_STORAGE_KEYS.SETTINGS, merged);
    const publicCachedSettings = { ...merged };
    delete publicCachedSettings.smtp_pass;
    delete publicCachedSettings.smtp_user;
    delete publicCachedSettings.smtp_host;
    delete publicCachedSettings.smtp_port;
    setLocalStore('dienviet_cached_settings', publicCachedSettings);
    applySettingsToAdminForm(merged);

    // Tải và hiển thị preview Banner các trang
    const bannerConfigs = [
      { key: 'banner_home', inputId: 'set-banner-home', previewId: 'preview-banner-home', defaultSrc: '/images/hero-banner-main.jpg' },
      { key: 'banner_about', inputId: 'set-banner-about', previewId: 'preview-banner-about', defaultSrc: '/images/about-hero-banner.jpg' },
      { key: 'banner_products', inputId: 'set-banner-products', previewId: 'preview-banner-products', defaultSrc: '/images/products-hero-banner.jpg' },
      { key: 'banner_blogs', inputId: 'set-banner-blogs', previewId: 'preview-banner-blogs', defaultSrc: '/images/blogs-hero-banner.jpg' },
      { key: 'banner_contact', inputId: 'set-banner-contact', previewId: 'preview-banner-contact', defaultSrc: '/images/contact-hero-banner.jpg' }
    ];

    bannerConfigs.forEach(b => {
      const bannerVal = merged[b.key] || b.defaultSrc;
      const inputEl = document.getElementById(b.inputId);
      const prevEl = document.getElementById(b.previewId);
      if (inputEl) inputEl.value = bannerVal;
      if (prevEl) prevEl.src = bannerVal;
    });

    // Nếu local có smtp_user hoặc smtp_pass mà server chưa có thì tự động đồng bộ lên server
    if ((merged.smtp_user && !serverSettings.smtp_user) || (merged.smtp_pass && !serverSettings.smtp_pass)) {
      syncLocalStoreToServer();
    }
  } catch (err) {
    console.error('Lỗi khi tải settings:', err);
    applySettingsToAdminForm(localSettings);
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

// Upload Logo riêng biệt & tự động lưu (Ưu tiên Cloudinary CDN)
async function uploadLogoImage(fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) return;
  const file = fileInput.files[0];
  showToast('Đang tối ưu & tải logo...', 'info');

  try {
    let finalUrl = '';
    try {
      const formData = new FormData();
      formData.append('image', file);
      const currentToken = localStorage.getItem('admin_token') || token;
      const upRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}` },
        body: formData
      });
      const upData = await upRes.json();
      if (upData && upData.success && upData.fileUrl && upData.fileUrl.startsWith('http')) {
        finalUrl = upData.fileUrl;
      }
    } catch (e) {}

    if (!finalUrl) {
      finalUrl = await compressImageToDataUrl(file, 600, 600, 0.9);
    }
    if (!finalUrl) {
      showToast('Không thể đọc file logo!', 'error');
      return;
    }

    const inputEl = document.getElementById('set-logo-url');
    if (inputEl) inputEl.value = finalUrl;
    updateLogoPreview(finalUrl);

    // Tự động lưu logo vào settings ngay lập tức
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ logo_url: finalUrl })
    });

    showToast('Tải và lưu Logo mới thành công!', 'success');
  } catch (err) {
    showToast('Lỗi khi tải logo!', 'error');
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
    working_hours: document.getElementById('set-working-hours')?.value.trim() || '',
    smtp_user: document.getElementById('set-smtp-user')?.value.trim() || '',
    smtp_pass: document.getElementById('set-smtp-pass')?.value.trim() || ''
  };

  // Lưu ngay lập tức vào LocalStorage để bảo toàn vĩnh viễn khi F5
  const localSettings = getLocalStore(LOCAL_STORAGE_KEYS.SETTINGS, {});
  const mergedLocal = { ...localSettings, ...payload };
  setLocalStore(LOCAL_STORAGE_KEYS.SETTINGS, mergedLocal);
  const publicCachedSettings = { ...mergedLocal };
  delete publicCachedSettings.smtp_pass;
  delete publicCachedSettings.smtp_user;
  delete publicCachedSettings.smtp_host;
  delete publicCachedSettings.smtp_port;
  setLocalStore('dienviet_cached_settings', publicCachedSettings);
  websiteSettingsCache = mergedLocal;

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã lưu thông tin và cấu hình Gmail thành công!', 'success');
      syncLocalStoreToServer();
    } else {
      showToast(result.message || 'Lỗi lưu thông tin!', 'error');
    }
  } catch (err) {
    showToast('Đã lưu cấu hình vào bộ nhớ trình duyệt!', 'info');
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

  const localSettings = getLocalStore(LOCAL_STORAGE_KEYS.SETTINGS, {});
  const mergedLocal = { ...localSettings, ...payload };
  setLocalStore(LOCAL_STORAGE_KEYS.SETTINGS, mergedLocal);
  const publicCachedSettings = { ...mergedLocal };
  delete publicCachedSettings.smtp_pass;
  delete publicCachedSettings.smtp_user;
  delete publicCachedSettings.smtp_host;
  delete publicCachedSettings.smtp_port;
  setLocalStore('dienviet_cached_settings', publicCachedSettings);
  websiteSettingsCache = mergedLocal;

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã lưu thông tin thành công!', 'success');
      syncLocalStoreToServer();
    } else {
      showToast(result.message || 'Lỗi lưu dữ liệu!', 'error');
    }
  } catch (err) {
    showToast('Đã lưu vào bộ nhớ trình duyệt!', 'info');
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

      <!-- Cột phải: Các nút sắp xếp & thao tác -->
      <div class="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
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
// HÀM TIỆN ÍCH NÉN ẢNH CHUẨN VÀ NHẸ (CANVAS TO DATA URL)
// Tương thích 100% serverless Vercel, không bị mất ảnh khi cold restart
// ========================================================
function compressImageToDataUrl(file, maxWidth = 1000, maxHeight = 1000, quality = 0.78) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        // Tô nền trắng giúp ảnh PNG trong suốt không bị đen nền khi nén JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        } catch (err) {
          dataUrl = canvas.toDataURL('image/png');
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result || '');
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
window.compressImageToDataUrl = compressImageToDataUrl;

// ========================================================
// 9. UPLOAD VÀ TỐI ƯU HÌNH ẢNH
// ========================================================
async function uploadImage(fileInput, targetInputId, previewImgId) {
  if (!fileInput.files || fileInput.files.length === 0) return;

  const file = fileInput.files[0];
  showToast('Đang xử lý & tải ảnh lên...', 'info');

  const saveCatBtn = document.getElementById('save-cat-btn');
  if (saveCatBtn && targetInputId === 'cat-image') {
    saveCatBtn.disabled = true;
    saveCatBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }

  try {
    const dataUrl = await compressImageToDataUrl(file, 1000, 1000, 0.82);
    if (!dataUrl) {
      showToast('Không thể đọc file ảnh!', 'error');
      return;
    }

    const inputEl = document.getElementById(targetInputId);
    if (inputEl) inputEl.value = dataUrl;
    if (previewImgId) {
      const prevEl = document.getElementById(previewImgId);
      if (prevEl) {
        prevEl.src = dataUrl;
        prevEl.classList.remove('hidden');
      }
    }
    showToast('Tải ảnh thành công!', 'success');

    // Tải lên nền dự phòng cho server
    try {
      const formData = new FormData();
      formData.append('image', file);
      const currentToken = localStorage.getItem('admin_token') || token;
      fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}` },
        body: formData
      }).then(r => r.json()).then(res => {
        if (res && res.success && (res.fileUrl || res.url)) {
          if (inputEl) inputEl.value = res.fileUrl || res.url;
        }
      }).catch(() => {});
    } catch (e) {}
  } catch (err) {
    showToast('Lỗi khi tải ảnh!', 'error');
  } finally {
    fileInput.value = '';
    if (saveCatBtn && targetInputId === 'cat-image') {
      saveCatBtn.disabled = false;
      saveCatBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

// Helper upload banner chuyên dụng: Tự động lưu ngay sau khi upload (Ưu tiên Cloudinary CDN)
async function uploadBannerImage(fileInput, targetInputId, previewImgId) {
  if (!fileInput.files || fileInput.files.length === 0) return;
  const file = fileInput.files[0];
  showToast('Đang tối ưu & tải banner...', 'info');
  try {
    let finalUrl = '';
    try {
      const formData = new FormData();
      formData.append('image', file);
      const currentToken = localStorage.getItem('admin_token') || token;
      const upRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}` },
        body: formData
      });
      const upData = await upRes.json();
      if (upData && upData.success && upData.fileUrl && upData.fileUrl.startsWith('http')) {
        finalUrl = upData.fileUrl;
      }
    } catch (e) {}

    if (!finalUrl) {
      finalUrl = await compressImageToDataUrl(file, 1920, 1080, 0.85);
    }

    const inputEl = document.getElementById(targetInputId);
    if (inputEl) inputEl.value = finalUrl;
    if (previewImgId) {
      const prevEl = document.getElementById(previewImgId);
      if (prevEl) prevEl.src = finalUrl;
    }

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
          body: JSON.stringify({ [key]: finalUrl })
        });
        const result = await res.json();
        if (result.success) {
          showToast('Đã tự động lưu Banner mới vào hệ thống!', 'success');
        }
      } catch (err) {
        console.error('Lỗi khi tự động lưu banner:', err);
      }
    }
  } catch (err) {
    showToast('Lỗi khi xử lý banner!', 'error');
  } finally {
    fileInput.value = '';
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

function toggleSmtpPassVisibility() {
  const inp = document.getElementById('set-smtp-pass');
  const icon = document.getElementById('toggle-smtp-pass-icon');
  if (!inp || !icon) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    inp.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
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
window.addQuoteTypeItem = addQuoteTypeItem;
window.removeQuoteTypeItem = removeQuoteTypeItem;
window.moveQuoteTypeItem = moveQuoteTypeItem;
window.resetQuoteTypesDefault = resetQuoteTypesDefault;
window.saveQuoteTypesSettings = saveQuoteTypesSettings;
window.updateQuoteTypeName = updateQuoteTypeName;
window.updateQuoteTypeShowProducts = updateQuoteTypeShowProducts;
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
window.toggleSmtpPassVisibility = toggleSmtpPassVisibility;

