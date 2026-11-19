// ========================================================
// MODULE: CHỨC NĂNG LẬP BÁO GIÁ, XUẤT PDF/WORD & GỬI GMAIL (ADMIN-QUOTES.JS)
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

  const logoUrl = (websiteSettingsCache?.logo_url && !websiteSettingsCache.logo_url.includes('/admin'))
    ? websiteSettingsCache.logo_url
    : (document.getElementById('set-logo-url')?.value?.trim() || '/uploads/img-1794390284769-958980201.png');

  const companyName = cleanVietnameseText(websiteSettingsCache?.company_name || document.getElementById('set-company-name')?.value || 'CÔNG TY TNHH ĐIỆN VIỆT');
  const companyAddr = cleanVietnameseText(websiteSettingsCache?.address || document.getElementById('set-address')?.value || 'Số 123 Nguyễn Văn Cừ, Hà Nội');
  const companyPhone = cleanVietnameseText(websiteSettingsCache?.phone || document.getElementById('set-phone')?.value || '0764333998');
  const companyEmail = cleanVietnameseText(websiteSettingsCache?.email || document.getElementById('set-email')?.value || 'hotro@dienviet.vn');

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
    vatPercent: 0,
    quoteNotes: `- Bảng giá trên là giá niêm yết đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất`,
    thankYouText: 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!',
    showTotal: true
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
  currentQuoteContract.quoteNotes = `- Bảng giá trên là giá niêm yết đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất`;
  currentQuoteContract.thankYouText = 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!';
  currentQuoteContract.showTotal = true;
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

// ========================================================
// CHỌN SẢN PHẨM VÀO BẢNG BÁO GIÁ
// ========================================================
async function openQuoteProductPickerModal() {
  syncQuoteEditInputsToState();
  const modal = document.getElementById('quote-product-picker-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  // Nạp danh sách sản phẩm và danh mục nếu chưa có
  await Promise.all([
    ensureProductsLoaded(),
    ensureCategoriesLoaded()
  ]);

  // Cập nhật dropdown danh mục theo phân cấp cha/con (optgroup)
  const catSelect = document.getElementById('quote-product-picker-category');
  if (catSelect) {
    catSelect.innerHTML = buildCategoryDropdownHtml(true, 'Tất cả danh mục');
  }

  const searchInput = document.getElementById('quote-product-picker-search');
  if (searchInput) {
    searchInput.value = '';
    setTimeout(() => searchInput.focus(), 100);
  }

  filterQuoteProductPicker();
}

function closeQuoteProductPickerModal() {
  const modal = document.getElementById('quote-product-picker-modal');
  if (modal) modal.classList.add('hidden');
}

function filterQuoteProductPicker() {
  const listEl = document.getElementById('quote-product-picker-list');
  if (!listEl) return;

  const keyword = (document.getElementById('quote-product-picker-search')?.value || '').toLowerCase().trim();
  const categoryId = document.getElementById('quote-product-picker-category')?.value || 'all';

  let list = Array.isArray(productsCache) ? productsCache : [];

  if (categoryId && categoryId !== 'all') {
    const childCatIds = categoriesCache
      .filter(c => String(c.parent_id) === String(categoryId))
      .map(c => String(c.id));

    list = list.filter(p => {
      const pCat = String(p.category_id);
      return pCat === String(categoryId) || childCatIds.includes(pCat);
    });
  }
  if (keyword) {
    list = list.filter(p => (p.name || '').toLowerCase().includes(keyword));
  }

  if (list.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <i class="fa-solid fa-box-open text-3xl mb-2 text-slate-300"></i>
        <p class="text-xs font-semibold">Không tìm thấy sản phẩm phù hợp!</p>
        <button type="button" onclick="addBlankQuoteItemAndClosePicker()" class="mt-3 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-[#c8102e] border border-red-200 font-bold text-xs rounded-xl transition inline-flex items-center space-x-1 cursor-pointer">
          <i class="fa-solid fa-pen-to-square"></i>
          <span>Tự nhập hạng mục mới</span>
        </button>
      </div>
    `;
    return;
  }

  listEl.innerHTML = list.map(p => {
    const isSelected = currentQuoteContract && currentQuoteContract.items.some(it => it.name.trim().toLowerCase() === (p.name || '').trim().toLowerCase());
    const cat = Array.isArray(categoriesCache) ? categoriesCache.find(c => String(c.id) === String(p.category_id)) : null;
    let catName = cat ? cat.name : (p.category_name || '');
    if (cat && cat.parent_id) {
      const parentCat = categoriesCache.find(c => String(c.id) === String(cat.parent_id));
      if (parentCat) {
        catName = `${parentCat.name} › ${cat.name}`;
      }
    }

    return `
      <div class="p-3 bg-white hover:bg-red-50/40 rounded-2xl border border-slate-200 hover:border-red-200 transition flex items-center justify-between gap-3 shadow-2xs">
        <div class="flex items-center space-x-3 min-w-0 flex-1">
          <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-image text-slate-400 text-sm"></i>`}
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-bold text-xs sm:text-sm text-slate-800 truncate" title="${escapeHtml(p.name)}">
              ${escapeHtml(p.name)}
            </div>
            <div class="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500">
              ${catName ? `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">${escapeHtml(catName)}</span>` : ''}
              <span>ĐVT: <strong class="text-slate-700">${escapeHtml(p.unit || 'Cái')}</strong></span>
            </div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-bold text-xs sm:text-sm font-mono text-[#c8102e] mb-1">
            ${formatVND(p.price || 0)}
          </div>
          <button 
            type="button" 
            onclick="selectProductForQuote(${p.id}, this)" 
            class="px-3.5 py-1.5 ${isSelected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#c8102e] hover:bg-red-700 text-white'} font-bold text-xs rounded-xl shadow-2xs transition flex items-center space-x-1 cursor-pointer active:scale-95"
          >
            <i class="fa-solid ${isSelected ? 'fa-check' : 'fa-plus'} text-[11px]"></i>
            <span>${isSelected ? 'Đã thêm' : 'Chọn'}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function selectProductForQuote(productId, btnEl) {
  if (!currentQuoteContract) return;
  const p = productsCache.find(x => x.id === productId);
  if (!p) return;

  syncQuoteEditInputsToState();

  const existing = currentQuoteContract.items.find(it => it.name.trim().toLowerCase() === (p.name || '').trim().toLowerCase());
  if (existing) {
    existing.quantity += 1;
    showToast(`Đã tăng số lượng "${p.name}" lên ${existing.quantity}!`, 'success');
  } else {
    if (currentQuoteContract.items.length === 1 && !currentQuoteContract.items[0].name.trim()) {
      currentQuoteContract.items[0] = {
        id: Date.now(),
        name: cleanVietnameseText(p.name),
        unit: cleanVietnameseText(p.unit || 'Cái'),
        quantity: 1,
        price: p.price || 0
      };
    } else {
      currentQuoteContract.items.push({
        id: Date.now(),
        name: cleanVietnameseText(p.name),
        unit: cleanVietnameseText(p.unit || 'Cái'),
        quantity: 1,
        price: p.price || 0
      });
    }
    showToast(`Đã thêm "${p.name}" vào bảng báo giá!`, 'success');
  }

  renderQuoteContractModal();

  if (btnEl) {
    btnEl.className = 'px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl shadow-2xs transition flex items-center space-x-1 cursor-pointer active:scale-95';
    btnEl.innerHTML = '<i class="fa-solid fa-check text-[11px]"></i><span>Đã thêm</span>';
  }
}

function addBlankQuoteItemAndClosePicker() {
  if (!currentQuoteContract) return;
  syncQuoteEditInputsToState();
  currentQuoteContract.items.push({
    id: Date.now(),
    name: '',
    unit: 'Cái',
    quantity: 1,
    price: 0
  });
  closeQuoteProductPickerModal();
  renderQuoteContractModal();
}

// Chuyển đổi chuỗi DataURI (base64) sang định dạng nhị phân Blob để tải file chuẩn 100%
function dataUriToBlob(dataUri) {
  try {
    const parts = dataUri.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : 'application/pdf';
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  } catch (e) {
    console.warn('Lỗi khi convert dataUri sang Blob:', e);
    return null;
  }
}

async function submitSendQuoteContract() {
  if (!currentQuoteContract || !currentQuoteContract.contactId) {
    showToast('Không tìm thấy thông tin liên hệ để gửi báo giá!', 'error');
    return;
  }

  const contactId = currentQuoteContract.contactId;

  // Đồng bộ thông tin người dùng vừa nhập trong form
  syncQuoteEditInputsToState();

  const buyerEmail = (currentQuoteContract.buyerEmail || '').trim();
  if (!buyerEmail) {
    showToast('Khách hàng chưa có địa chỉ email để gửi báo giá! Vui lòng nhập email khách hàng trong mục Khách hàng.', 'warning', 4500);
    return;
  }

  const btnSend = document.getElementById('btn-submit-send-quote');
  const originalBtnHtml = btnSend ? btnSend.innerHTML : '';
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.classList.add('opacity-75', 'cursor-not-allowed');
    btnSend.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-base"></i><span>Đang tạo PDF & gửi Gmail...</span>`;
  }

  try {
    // 1. Chuẩn bị nội dung render báo giá
    syncQuoteEditInputsToState();
    renderQuotePreviewHtml();

    let pdfBase64 = '';
    let pdfBlob = null;

    // Lưu lại vị trí scroll hiện tại để không làm phiền người dùng
    const originalScrollX = window.scrollX || window.pageXOffset || 0;
    const originalScrollY = window.scrollY || window.pageYOffset || 0;

    // GIAI ĐOẠN 1: Render PDF bằng html2canvas + jsPDF chuẩn tuyệt đối
    const stage = document.createElement('div');
    stage.id = 'direct-pdf-export-stage';
    stage.style.cssText = `
      position: absolute !important;
      top: 0px !important;
      left: 0px !important;
      width: 794px !important;
      min-height: 1120px !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      z-index: 9999999 !important;
      padding: 36px 40px !important;
      box-sizing: border-box !important;
      font-family: ${currentContractFont === 'arial' ? "Arial, 'Helvetica Neue', Helvetica, sans-serif" : "'Times New Roman', Times, serif"} !important;
      font-size: 13pt !important;
      line-height: 1.5 !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
    stage.innerHTML = buildQuoteHtml(currentQuoteContract);
    document.body.appendChild(stage);

    try {
      // 1. Chuyển đổi toàn bộ ảnh trong văn bản sang inline Base64 data URL
      const imgs = Array.from(stage.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        return new Promise(resolve => {
          if (!img.src || img.src.startsWith('data:')) return resolve();
          const tempImg = new Image();
          tempImg.crossOrigin = 'anonymous';
          tempImg.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = tempImg.naturalWidth || tempImg.width || 150;
              canvas.height = tempImg.naturalHeight || tempImg.height || 80;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
              img.src = canvas.toDataURL('image/png');
            } catch (e) {}
            resolve();
          };
          tempImg.onerror = () => {
            img.style.display = 'none';
            resolve();
          };
          tempImg.src = img.src;
          setTimeout(resolve, 800);
        });
      }));

      // Cuộn lên đầu trang tạm thời trong 1 tích tắc để html2canvas chụp đúng tọa độ 0,0
      window.scrollTo(0, 0);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 200));

      const stageWidth = stage.offsetWidth || 794;
      const stageHeight = stage.offsetHeight || 1120;

      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(stage, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: stageWidth,
          height: stageHeight,
          windowWidth: 1200,
          backgroundColor: '#ffffff',
          logging: false
        });

        if (canvas && canvas.width > 100 && canvas.height > 100) {
          const JsPdfConstructor = (window.jspdf && (window.jspdf.jsPDF || window.jspdf)) || window.jsPDF;
          if (JsPdfConstructor) {
            const pdfDoc = new JsPdfConstructor('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgHeight = (canvas.height * pageWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdfDoc.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 5) {
              position = heightLeft - imgHeight;
              pdfDoc.addPage();
              pdfDoc.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
              heightLeft -= pageHeight;
            }

            pdfBase64 = pdfDoc.output('datauristring');
            if (pdfBase64) {
              pdfBlob = dataUriToBlob(pdfBase64);
            }
          }
        }
      }
    } catch (renderErr) {
      console.warn('Lỗi tại giai đoạn render canvas PDF:', renderErr);
    } finally {
      window.scrollTo(originalScrollX, originalScrollY);
      if (stage.parentNode) {
        stage.parentNode.removeChild(stage);
      }
    }

    // GIAI ĐOẠN 2: Nếu pdfBase64 chưa đủ dung lượng (> 20.000 ký tự), fallback qua html2pdf bundle
    if ((!pdfBase64 || pdfBase64.length < 20000) && typeof html2pdf !== 'undefined') {
      try {
        switchQuoteTab('preview');
        renderQuotePreviewHtml();
        await new Promise(r => setTimeout(r, 200));
        const printableEl = document.getElementById('quote-contract-printable');
        if (printableEl) {
          const optFallback = {
            margin: [8, 8, 8, 8],
            filename: `Bao_Gia_${currentQuoteContract.contractNo || 'Dien_Viet'}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              scrollX: 0,
              scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          const fallbackWorker = html2pdf().set(optFallback).from(printableEl);
          const fallbackData = await fallbackWorker.outputPdf('datauristring');
          if (fallbackData && fallbackData.length > 20000) {
            pdfBase64 = fallbackData;
            pdfBlob = dataUriToBlob(fallbackData);
          }
        }
      } catch (eFallback) {
        console.warn('Lỗi fallback html2pdf:', eFallback);
      }
    }

    // GIAI ĐOẠN 3: Fallback Vector trực tiếp bằng jsPDF (Đảm bảo 100% không bao giờ rỗng file)
    if (!pdfBase64 || pdfBase64.length < 15000) {
      try {
        const JsPdfConstructor = (window.jspdf && (window.jspdf.jsPDF || window.jspdf)) || window.jsPDF;
        if (JsPdfConstructor) {
          const vDoc = new JsPdfConstructor('p', 'mm', 'a4');
          vDoc.setFontSize(16);
          vDoc.text(cleanVietnameseText(currentQuoteContract.sellerCompany || 'DIEN VIET'), 105, 18, { align: 'center' });
          vDoc.setFontSize(12);
          vDoc.text('BANG BAO GIA THIET BI DIEN', 105, 26, { align: 'center' });
          if (currentQuoteContract.contractNo) {
            vDoc.setFontSize(10);
            vDoc.text(`So: ${cleanVietnameseText(currentQuoteContract.contractNo)}`, 105, 32, { align: 'center' });
          }

          vDoc.setFontSize(10);
          vDoc.text(`Khach hang: ${cleanVietnameseText(currentQuoteContract.buyerRep || '')}`, 14, 42);
          vDoc.text(`Dien thoai: ${cleanVietnameseText(currentQuoteContract.buyerPhone || '')}`, 14, 48);
          vDoc.text(`Email: ${cleanVietnameseText(currentQuoteContract.buyerEmail || '')}`, 14, 54);
          if (currentQuoteContract.buyerAddress) {
            vDoc.text(`Dia chi: ${cleanVietnameseText(currentQuoteContract.buyerAddress)}`, 14, 60);
          }

          // Kẻ bảng hạng mục báo giá
          let startY = 68;
          vDoc.setFillColor(240, 240, 240);
          vDoc.rect(14, startY, 182, 8, 'F');
          vDoc.setFontSize(9);
          vDoc.text('STT', 16, startY + 5.5);
          vDoc.text('HANG MUC / SAN PHAM', 28, startY + 5.5);
          vDoc.text('DVT', 115, startY + 5.5);
          vDoc.text('SL', 130, startY + 5.5);
          vDoc.text('DON GIA', 145, startY + 5.5);
          vDoc.text('THANH TIEN', 170, startY + 5.5);

          startY += 8;
          (currentQuoteContract.items || []).forEach((it, idx) => {
            vDoc.text(String(idx + 1), 16, startY + 6);
            vDoc.text(cleanVietnameseText(it.name).substring(0, 42), 28, startY + 6);
            vDoc.text(cleanVietnameseText(it.unit), 115, startY + 6);
            vDoc.text(String(it.quantity), 130, startY + 6);
            vDoc.text(formatVND(it.price).replace(/\s*₫/g, ''), 145, startY + 6);
            vDoc.text(formatVND(it.quantity * it.price).replace(/\s*₫/g, ''), 170, startY + 6);
            vDoc.line(14, startY + 8, 196, startY + 8);
            startY += 8;
          });

          startY += 4;
          const subTotalNum = (currentQuoteContract.items || []).reduce((sum, it) => sum + (it.quantity * it.price), 0);
          vDoc.setFontSize(11);
          vDoc.text(`TONG CONG: ${formatVND(subTotalNum)}`, 196, startY + 4, { align: 'right' });

          pdfBase64 = vDoc.output('datauristring');
          pdfBlob = dataUriToBlob(pdfBase64);
        }
      } catch (vErr) {
        console.warn('Lỗi fallback vector PDF:', vErr);
      }
    }

    if (!pdfBlob && pdfBase64) {
      pdfBlob = dataUriToBlob(pdfBase64);
    }

    // Giá trên sản phẩm là giá niêm yết đã bao gồm thuế, KHÔNG tính thêm VAT 10%
    const subtotal = (currentQuoteContract.items || []).reduce((sum, it) => sum + (it.quantity * it.price), 0);
    const grandTotal = subtotal;

    const localSettings = getLocalStore(LOCAL_STORAGE_KEYS.SETTINGS, {});
    const activeSmtpUser = (websiteSettingsCache?.smtp_user || localSettings.smtp_user || document.getElementById('set-smtp-user')?.value || '').trim();
    const activeSmtpPass = (websiteSettingsCache?.smtp_pass || localSettings.smtp_pass || document.getElementById('set-smtp-pass')?.value || '').trim();

    // 2. Gửi yêu cầu gửi email báo giá kèm PDF đến máy chủ
    const res = await fetch(`/api/admin/contacts/${contactId}/send-quote-email`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pdfBase64,
        contractNo: currentQuoteContract.contractNo,
        buyerEmail,
        buyerName: currentQuoteContract.buyerRep,
        quoteTotal: formatVND(grandTotal),
        notes: currentQuoteContract.quoteNotes,
        companyName: currentQuoteContract.sellerCompany,
        smtpUser: activeSmtpUser,
        smtpPass: activeSmtpPass
      })
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

      // Cập nhật LocalStorage để bảo toàn khi F5 hoặc Ctrl+Shift+R
      const localContacts = getLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, []);
      const foundLocal = localContacts.find(x => String(x.id) === String(contactId));
      if (foundLocal) {
        foundLocal.quote_sent = 1;
        if (result.status) foundLocal.status = result.status;
        setLocalStore(LOCAL_STORAGE_KEYS.CONTACTS, localContacts);
      }

      if (result.smtpConfigured && result.sent) {
        showToast(result.message || `Đã gửi báo giá kèm file PDF đến Gmail ${buyerEmail} thành công!`, 'success', 5000);
      } else {
        // Tải file PDF trực tiếp về máy tính người dùng (đảm bảo file có nội dung hoàn chỉnh 100%)
        if (pdfBlob) {
          const blobUrl = URL.createObjectURL(pdfBlob);
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = `Bao_Gia_${currentQuoteContract.contractNo || 'Dien_Viet'}.pdf`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } else if (pdfBase64) {
          const downloadLink = document.createElement('a');
          downloadLink.href = pdfBase64;
          downloadLink.download = `Bao_Gia_${currentQuoteContract.contractNo || 'Dien_Viet'}.pdf`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }

        const safeSubject = encodeURIComponent(`[BÁO GIÁ] ${currentQuoteContract.sellerCompany || 'Điện Việt'} gửi Báo giá thiết bị điện - Số: ${currentQuoteContract.contractNo || ''}`);
        const safeBody = encodeURIComponent(`Kính gửi ${currentQuoteContract.buyerRep || 'Quý khách hàng'},\n\nĐiện Việt xin gửi tới Quý khách bảng báo giá chi tiết thiết bị điện theo yêu cầu (file PDF đính kèm).\nTổng giá trị: ${formatVND(grandTotal)}\n\nQuý khách vui lòng kiểm tra file PDF đính kèm hoặc phản hồi email này nếu cần hỗ trợ thêm.\n\nTrân trọng cảm ơn!`);
        const composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(buyerEmail)}&su=${safeSubject}&body=${safeBody}`;
        window.open(composeUrl, '_blank');

        showToast(`Đã xuất PDF báo giá & mở Gmail gửi tới ${buyerEmail}! (Giá niêm yết chuẩn không tính thêm VAT)`, 'info', 7000);
      }

      closeQuoteContractModal();
      viewContactDetail(contactId);
      renderContactsTable();
    } else {
      showToast(result.message || 'Không thể gửi báo giá!', 'error');
    }
  } catch (err) {
    console.error('Lỗi khi gửi báo giá:', err);
    showToast('Lỗi khi gửi báo giá: ' + err.message, 'error');
  } finally {
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.classList.remove('opacity-75', 'cursor-not-allowed');
      btnSend.innerHTML = originalBtnHtml;
    }
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

  const it = currentQuoteContract.items[index];
  const rowSubtotalEl = document.getElementById(`qc-item-subtotal-${index}`);
  if (rowSubtotalEl) {
    rowSubtotalEl.textContent = formatVND(it.quantity * it.price);
  }

  recalcQuoteTotals();
}

function recalcQuoteTotals() {
  if (!currentQuoteContract) return;
  const subtotal = currentQuoteContract.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);

  const grandTotalEl = document.getElementById('qc-calc-grand-total');
  if (grandTotalEl) grandTotalEl.textContent = formatVND(subtotal);

  const editTotalEl = document.getElementById('qc-edit-grand-total');
  if (editTotalEl) editTotalEl.textContent = formatVND(subtotal);
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
            <button type="button" onclick="openQuoteProductPickerModal()" class="px-4 py-2 bg-[#c8102e] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer shrink-0">
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
                <th class="py-2.5 px-3 w-36 text-right">Thành Tiền (VNĐ)</th>
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
                  <td class="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs" id="qc-item-subtotal-${idx}">
                    ${formatVND(it.quantity * it.price)}
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
            <tfoot class="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colspan="5" class="py-2.5 px-3 text-right font-black uppercase text-slate-700 text-[11px] tracking-wider">TỔNG CỘNG:</td>
                <td class="py-2.5 px-3 text-right font-mono font-black text-sm text-[#c8102e]" id="qc-edit-grand-total">
                  ${formatVND(q.items.reduce((sum, it) => sum + (it.quantity * it.price), 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- KHỐI 3: GHI CHÚ BÁO GIÁ -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <span class="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-2 pb-2 border-b border-slate-100">
          <i class="fa-solid fa-comment-dots text-[#c8102e]"></i>
          <span>3. Ghi Chú Báo Giá</span>
        </span>

        <div>
          <label class="block text-[11px] font-bold text-slate-600 mb-1">Nội dung Ghi chú (mỗi dòng một ý):</label>
          <textarea id="qc-quote-notes" rows="3" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none">${escapeHtml(q.quoteNotes || '- Bảng giá trên là giá niêm yết đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất')}</textarea>
        </div>
      </div>

      <!-- Nút Gửi Báo Giá to ở dưới cùng -->
      <div class="pt-2">
        <button 
          type="button" 
          id="btn-submit-send-quote"
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

function buildQuoteHtml(q) {
  if (!q) return '';
  const subtotal = (q.items || []).reduce((sum, it) => sum + (it.quantity * it.price), 0);

  let logoSrc = q.sellerLogo;
  if (!logoSrc || logoSrc.includes('/admin') || logoSrc === window.location.href) {
    logoSrc = websiteSettingsCache?.logo_url || '/uploads/img-1794390284769-958980201.png';
  }

  return `
    <!-- KHỐI 1: HEADER LOGO + THÔNG TIN ĐƠN VỊ -->
    <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #334155; margin-bottom: 24px; padding-bottom: 14px;">
      <tr>
        <td style="width: 25%; vertical-align: middle; padding: 4px 14px 14px 0; text-align: center;">
          <img src="${logoSrc}" onerror="this.onerror=null; this.src='/uploads/img-1794390284769-958980201.png';" alt="Logo" style="max-height: 80px; max-width: 150px; object-fit: contain; display: block; margin: 0 auto;" />
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
          <th style="border: 1px solid #334155; padding: 9px 6px; text-align: center; width: 70px; font-weight: bold;">ĐVT</th>
          <th style="border: 1px solid #334155; padding: 9px 6px; text-align: center; width: 55px; font-weight: bold;">SL</th>
          <th style="border: 1px solid #334155; padding: 9px 10px; text-align: right; width: 110px; font-weight: bold;">ĐƠN GIÁ</th>
          <th style="border: 1px solid #334155; padding: 9px 12px; text-align: right; width: 130px; font-weight: bold;">THÀNH TIỀN</th>
        </tr>
      </thead>
      <tbody>
        ${(q.items || []).map((it, idx) => `
          <tr>
            <td style="border: 1px solid #334155; padding: 8px 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #334155; padding: 8px 12px; font-weight: 600;">${escapeHtml(cleanVietnameseText(it.name))}</td>
            <td style="border: 1px solid #334155; padding: 8px 6px; text-align: center;">${escapeHtml(cleanVietnameseText(it.unit))}</td>
            <td style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: bold;">${it.quantity}</td>
            <td style="border: 1px solid #334155; padding: 8px 10px; text-align: right; font-weight: 600;">${formatVND(it.price)}</td>
            <td style="border: 1px solid #334155; padding: 8px 12px; text-align: right; font-weight: bold; color: #0f172a;">${formatVND(it.quantity * it.price)}</td>
          </tr>
        `).join('')}
        <!-- DÒNG TỔNG CỘNG DƯỚI CUỐI DANH SÁCH -->
        <tr style="background-color: #f8fafc; font-weight: bold;">
          <td colspan="5" style="border: 1px solid #334155; padding: 9px 12px; text-align: right; text-transform: uppercase; font-weight: bold; font-size: 13px;">TỔNG CỘNG:</td>
          <td style="border: 1px solid #334155; padding: 9px 12px; text-align: right; font-weight: bold; color: #000; font-size: 13.5px;">${formatVND(subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <!-- KHỐI 5: GHI CHÚ -->
    <div style="margin-bottom: 18px; font-size: 13px; line-height: 1.7; color: #1e293b;">
      <div style="font-weight: bold; margin-bottom: 3px;">Ghi chú:</div>
      <div style="white-space: pre-line; padding-left: 4px;">${escapeHtml(cleanVietnameseText(q.quoteNotes || '- Bảng giá trên là giá niêm yết đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất'))}</div>
    </div>

    <!-- KHỐI 6: LỜI CẢM ƠN -->
    <div style="margin: 22px 0 16px; font-weight: bold; font-size: 13.5px; text-transform: uppercase; color: #0f172a;">
      ${escapeHtml(cleanVietnameseText(q.thankYouText || 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!'))}
    </div>

    <!-- KHỐI 7: BẢNG KÝ TÊN 2 BÊN -->
    <table style="width: 100%; border-none; border-collapse: collapse; margin-top: 10px; margin-bottom: 25px;">
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

function renderQuotePreviewHtml() {
  const container = document.getElementById('quote-contract-printable');
  if (!container || !currentQuoteContract) return;
  container.innerHTML = buildQuoteHtml(currentQuoteContract);
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
  const subtotal = (q.items || []).reduce((sum, it) => sum + (it.quantity * it.price), 0);

  let rawLogo = q.sellerLogo;
  if (!rawLogo || rawLogo.includes('/admin')) {
    rawLogo = websiteSettingsCache?.logo_url || '/uploads/img-1794390284769-958980201.png';
  }
  const logoSrc = rawLogo.startsWith('http') ? rawLogo : (window.location.origin + rawLogo);

  const docHtml = `
    <!-- PHẦN 1: HEADER LOGO + ĐƠN VỊ BÁO GIÁ -->
    <table class="header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 14pt; border: none;" border="0">
      <tr>
        <td style="width: 25%; vertical-align: middle; padding: 4pt 12pt 8pt 0; text-align: center; border: none;">
          <img src="${logoSrc}" alt="Logo" width="80" height="80" style="width: 80pt; height: 80pt; max-width: 80pt; max-height: 80pt; border: none; display: inline-block;" />
        </td>
        <td style="width: 75%; vertical-align: middle; padding: 4pt 0 8pt 14pt; border-left: 2pt solid #000; border-top: none; border-right: none; border-bottom: none;">
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
      <table class="noborder-table" style="width: 100%; border: none; margin-top: 2pt;" border="0">
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
    <table class="items-table" style="width: 100%; border-collapse: collapse; margin: 10pt 0 14pt;" border="1">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 6pt 4pt; text-align: center; width: 35pt;">STT</th>
          <th style="padding: 6pt 8pt; text-align: left;">HẠNG MỤC</th>
          <th style="padding: 6pt 4pt; text-align: center; width: 50pt;">ĐVT</th>
          <th style="padding: 6pt 4pt; text-align: center; width: 35pt;">SL</th>
          <th style="padding: 6pt 6pt; text-align: right; width: 85pt;">ĐƠN GIÁ</th>
          <th style="padding: 6pt 8pt; text-align: right; width: 100pt;">THÀNH TIỀN</th>
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
            <td style="padding: 5pt 8pt; text-align: right; font-weight: bold;">${formatVND(it.quantity * it.price)}</td>
          </tr>
        `).join('')}
        <!-- DÒNG TỔNG CỘNG DƯỚI CUỐI DANH SÁCH -->
        <tr style="background-color: #f2f2f2; font-weight: bold;">
          <td colspan="5" style="padding: 6pt 8pt; text-align: right; text-transform: uppercase; font-weight: bold;">TỔNG CỘNG:</td>
          <td style="padding: 6pt 8pt; text-align: right; font-weight: bold; font-size: 11pt;">${formatVND(subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <!-- PHẦN 5: GHI CHÚ -->
    <div style="margin-bottom: 14pt; font-size: 10.5pt; line-height: 1.5;">
      <strong>Ghi chú:</strong><br>
      ${escapeHtml(cleanVietnameseText(q.quoteNotes || '- Bảng giá trên là giá niêm yết đã bao gồm thuế VAT\n- Đơn báo giá trên có hiệu lực đến khi có thông báo mới nhất')).replace(/\n/g, '<br>')}
    </div>

    <!-- PHẦN 6: LỜI CẢM ƠN -->
    <div style="margin: 16pt 0 14pt; font-weight: bold; font-size: 11pt; text-transform: uppercase;">
      ${escapeHtml(cleanVietnameseText(q.thankYouText || 'TRÂN TRỌNG CẢM ƠN QUÝ KHÁCH!'))}
    </div>

    <!-- PHẦN 7: KÝ TÊN -->
    <table class="noborder-table" style="width: 100%; border: none; margin-top: 10pt; margin-bottom: 25pt;" border="0">
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
  table.items-table {
    border-collapse: collapse;
    width: 100%;
    margin: 10pt 0 14pt;
  }
  table.items-table th, table.items-table td {
    border: 1pt solid black;
    padding: 6pt;
    font-size: 10.5pt;
  }
  table.items-table th {
    background-color: #f2f2f2;
    text-align: center;
    font-weight: bold;
  }
  table.header-table, table.noborder-table {
    border-collapse: collapse;
    width: 100%;
    border: none;
    margin: 4pt 0;
  }
  table.header-table td, table.noborder-table td {
    border: none;
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

// Gắn các hàm báo giá vào window
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
window.openQuoteProductPickerModal = openQuoteProductPickerModal;
window.closeQuoteProductPickerModal = closeQuoteProductPickerModal;
window.filterQuoteProductPicker = filterQuoteProductPicker;
window.selectProductForQuote = selectProductForQuote;
window.addBlankQuoteItemAndClosePicker = addBlankQuoteItemAndClosePicker;

