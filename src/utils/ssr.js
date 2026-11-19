const path = require('path');
const fs = require('fs');
const { get } = require('../../db');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

// Helper phục vụ trang HTML kèm theo Banner & Logo mới nhất trực tiếp từ cơ sở dữ liệu
async function servePageWithBanner(res, fileName, bannerKey, bannerId) {
  try {
    let filePath = path.join(PUBLIC_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public', fileName);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), fileName);
    }

    if (!fs.existsSync(filePath)) {
      // Trên môi trường Serverless nếu public/ không nằm trong Lambda bundle, chuyển hướng về URL tĩnh
      return res.redirect(`/${fileName}`);
    }

    let html = fs.readFileSync(filePath, 'utf8');

    // 1. Lấy banner mới nhất từ database
    if (bannerKey && bannerId) {
      const bannerSetting = await get('SELECT value FROM settings WHERE key = ?', [bannerKey]);
      if (bannerSetting && bannerSetting.value) {
        const val = bannerSetting.value;
        const regex1 = new RegExp(`id=["']${bannerId}["']([\\s\\S]*?)src=["'][^"']*["']`, 'i');
        const regex2 = new RegExp(`src=["'][^"']*["']([\\s\\S]*?)id=["']${bannerId}["']`, 'i');

        if (regex1.test(html)) {
          html = html.replace(regex1, `id="${bannerId}"$1src="${val}"`);
        } else if (regex2.test(html)) {
          html = html.replace(regex2, `src="${val}"$1id="${bannerId}"`);
        }
      }
    }

    // 2. Lấy logo mới nhất từ database và inject trực tiếp vào HTML (Header & Footer)
    const logoSetting = await get('SELECT value FROM settings WHERE key = ?', ['logo_url']);
    if (logoSetting && logoSetting.value && logoSetting.value.trim()) {
      const logoUrl = logoSetting.value.trim();

      // Header: Ẩn site-logo-icon, hiện site-logo-img với src mới nhất
      html = html.replace(/(class=["'][^"']*site-logo-icon)([^"']*["'])/g, (m, p1, p2) => {
        return p1.includes('hidden') ? m : p1 + ' hidden' + p2;
      });
      html = html.replace(/(<img[^>]*class=["'][^"']*site-logo-img[^"']*["'][^>]*)/g, (imgTag) => {
        let updated = imgTag.replace(/\bhidden\b\s*/g, '');
        if (/src=["'][^"']*["']/.test(updated)) {
          updated = updated.replace(/src=["'][^"']*["']/, `src="${logoUrl}"`);
        } else {
          updated = updated.replace('<img', `<img src="${logoUrl}"`);
        }
        return updated;
      });

      // Footer: Ẩn footer-logo-icon, hiện footer-logo-img với src mới nhất
      html = html.replace(/(class=["'][^"']*footer-logo-icon)([^"']*["'])/g, (m, p1, p2) => {
        return p1.includes('hidden') ? m : p1 + ' hidden' + p2;
      });
      html = html.replace(/(<img[^>]*class=["'][^"']*footer-logo-img[^"']*["'][^>]*)/g, (imgTag) => {
        let updated = imgTag.replace(/\bhidden\b\s*/g, '');
        if (/src=["'][^"']*["']/.test(updated)) {
          updated = updated.replace(/src=["'][^"']*["']/, `src="${logoUrl}"`);
        } else {
          updated = updated.replace('<img', `<img src="${logoUrl}"`);
        }
        return updated;
      });
    }

    // 3. Lấy Tên thương hiệu & Slogan mới nhất từ database và inject trực tiếp vào HTML
    const nameSetting = await get('SELECT value FROM settings WHERE key = ?', ['company_name']);
    const sloganSetting = await get('SELECT value FROM settings WHERE key = ?', ['company_slogan']);

    if (nameSetting && nameSetting.value && nameSetting.value.trim()) {
      const name = nameSetting.value.trim();
      const words = name.split(/\s+/);
      let headerNameHtml = name;
      let footerNameHtml = name;
      if (words.length > 1) {
        const last = words.slice(-1)[0];
        const rest = words.slice(0, -1).join(' ');
        headerNameHtml = `${rest} <span class="text-[#c8102e]">${last}</span>`;
        footerNameHtml = `${rest} <span class="text-red-200">${last}</span>`;
      }

      html = html.replace(
        /(<div[^>]*id=["']company-name-header["'][^>]*>)([\s\S]*?)(<\/div>)/i,
        `$1${headerNameHtml}$3`
      );
      html = html.replace(
        /(<span[^>]*class=["'][^"']*site-footer-company-name[^"']*["'][^>]*>)([\s\S]*?)(<\/span>)/i,
        `$1${footerNameHtml}$3`
      );
    }

    if (sloganSetting && sloganSetting.value && sloganSetting.value.trim()) {
      const slogan = sloganSetting.value.trim();
      html = html.replace(
        /(<span[^>]*id=["']company-slogan-header["'][^>]*>)([\s\S]*?)(<\/span>)/i,
        `$1${slogan}$3`
      );
      html = html.replace(
        /(<span[^>]*class=["'][^"']*site-footer-slogan[^"']*["'][^>]*>)([\s\S]*?)(<\/span>)/i,
        `$1${slogan}$3`
      );
    }

    // 4. Lấy Nội dung Giới thiệu (Về chúng tôi) mới nhất từ database và inject trực tiếp
    const aboutTitleSetting = await get('SELECT value FROM settings WHERE key = ?', ['about_title']);
    const aboutHistorySetting = await get('SELECT value FROM settings WHERE key = ?', ['about_history']);

    if (aboutTitleSetting && aboutTitleSetting.value && aboutTitleSetting.value.trim()) {
      const aTitle = aboutTitleSetting.value.trim();
      html = html.replace(
        /(<h[2-4][^>]*id=["']about-title["'][^>]*>)([\s\S]*?)(<\/h[2-4]>)/i,
        `$1${aTitle}$3`
      );
      html = html.replace(
        /(<h[2-4][^>]*id=["']about-us-title["'][^>]*>)([\s\S]*?)(<\/h[2-4]>)/i,
        `$1${aTitle}$3`
      );
    }

    if (aboutHistorySetting && aboutHistorySetting.value && aboutHistorySetting.value.trim()) {
      let aHistory = aboutHistorySetting.value.trim();
      if (aHistory.includes('<style') && !aHistory.includes('</style>')) {
        aHistory += '\n</style>';
      }

      const isRichHtml = /<div\b|<article\b|<section\b|<style\b|company-intro-card/i.test(aHistory);

      if (isRichHtml && fileName === 'about.html') {
        html = html.replace(/id=["']about-us-col-right["']\s+class=["'][^"']*["']/i, 'id="about-us-col-right" class="hidden"');
        html = html.replace(/id=["']about-us-col-left["']\s+class=["'][^"']*["']/i, 'id="about-us-col-left" class="w-full"');
        html = html.replace(/id=["']about-us-grid["']\s+class=["'][^"']*["']/i, 'id="about-us-grid" class="w-full"');
        if (/<h[1-3]\b|class=["'][^"']*company-title[^"']*["']/i.test(aHistory)) {
          html = html.replace(/id=["']about-us-title["']\s+class=["'][^"']*["']/i, 'id="about-us-title" class="hidden"');
        }
      }

      if (isRichHtml && fileName === 'index.html') {
        const cleanHtml = aHistory.replace(/<style\b[^>]*>[\s\S]*?(<\/style>|$)/gi, '');
        const pMatches = cleanHtml.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi);
        let summary = '';
        if (pMatches && pMatches.length > 0) {
          summary = pMatches.slice(0, 3).map(p => p.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join('\n\n');
        } else {
          summary = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        html = html.replace(
          /(<p[^>]*id=["']about-history["'][^>]*>)([\s\S]*?)(<\/p>)/i,
          (match, p1, p2, p3) => `${p1}${summary}${p3}`
        );
      } else {
        html = html.replace(
          /(<(?:p|div)[^>]*id=["']about-history["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
          (match, p1, p2, p3) => `${p1}${aHistory}${p3}`
        );
      }

      html = html.replace(
        /(<(?:p|div)[^>]*id=["']about-us-desc["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
        (match, p1, p2, p3) => `${p1}${aHistory}${p3}`
      );
    }

    const aboutWhySetting = await get('SELECT value FROM settings WHERE key = ?', ['about_why_choose']);
    if (aboutWhySetting && aboutWhySetting.value && aboutWhySetting.value.trim()) {
      const aWhy = aboutWhySetting.value.trim();
      html = html.replace(
        /(<(?:p|div)[^>]*id=["']about-why-desc["'][^>]*class=["'][^"']*?)\bhidden\b([^"']*["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
        (match, p1, p2, p3, p4) => `${p1}${p2}>${aWhy}${p4}`
      );
    }

    const aboutValuesSetting = await get('SELECT value FROM settings WHERE key = ?', ['about_values']);
    if (aboutValuesSetting && aboutValuesSetting.value && aboutValuesSetting.value.trim()) {
      const aVal = aboutValuesSetting.value.trim();
      html = html.replace(
        /(<(?:p|div)[^>]*id=["']about-values-desc["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
        (match, p1, p2, p3) => `${p1}${aVal}${p3}`
      );
    }

    // 5. Inject Danh sách Loại Báo Giá / Liên Hệ vào trang contact.html & index.html
    if (fileName === 'contact.html') {
      const quoteTypesSetting = await get('SELECT value FROM settings WHERE key = ?', ['quote_types']);
      if (quoteTypesSetting && quoteTypesSetting.value) {
        try {
          const list = JSON.parse(quoteTypesSetting.value);
          if (Array.isArray(list) && list.length > 0) {
            let optionsHtml = '<option value="" selected>-- Chọn loại --</option>\n';
            list.forEach((item) => {
              const name = typeof item === 'string' ? item : item.name;
              const showProducts = typeof item === 'object' && item.show_products ? 'true' : 'false';
              optionsHtml += `                  <option value="${name}" data-show-products="${showProducts}">${name}</option>\n`;
            });
            html = html.replace(
              /(<select[^>]*id=["']form-type["'][^>]*>)([\s\S]*?)(<\/select>)/i,
              (match, p1, p2, p3) => `${p1}\n${optionsHtml}                ${p3}`
            );
          }
        } catch (e) { }
      }
    }

    if (fileName === 'index.html') {
      const quoteTypesSetting = await get('SELECT value FROM settings WHERE key = ?', ['quote_types']);
      if (quoteTypesSetting && quoteTypesSetting.value) {
        try {
          const list = JSON.parse(quoteTypesSetting.value);
          if (Array.isArray(list) && list.length > 0) {
            const radiosHtml = list.map((item, idx) => {
              const name = typeof item === 'string' ? item : item.name;
              const show = typeof item === 'object' && item.show_products ? 'true' : 'false';
              return `<label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-xs sm:text-sm text-slate-700"><input type="radio" name="contact-type" value="${name}" data-show-products="${show}" ${idx === 0 ? 'checked' : ''} class="text-[#c8102e] focus:ring-[#c8102e] w-4 h-4"><span>${name}</span></label>`;
            }).join('\n            ');
            html = html.replace(
              /(<div[^>]*id=["']contact-modal-type-group["'][^>]*>)([\s\S]*?)(<\/div>)/i,
              (match, p1, p2, p3) => `${p1}\n            ${radiosHtml}\n          ${p3}`
            );
          }
        } catch (e) { }
      }
    }

    // Luôn gắn query version chống cache cho các file js
    const v = Date.now();
    html = html.replace(/\/js\/main\.js(\?v=[^"']*)?/g, `/js/main.js?v=${v}`);
    html = html.replace(/\/js\/products\.js(\?v=[^"']*)?/g, `/js/products.js?v=${v}`);
    html = html.replace(/\/js\/product-detail\.js(\?v=[^"']*)?/g, `/js/product-detail.js?v=${v}`);
    html = html.replace(/\/js\/blogs\.js(\?v=[^"']*)?/g, `/js/blogs.js?v=${v}`);
    html = html.replace(/\/js\/blog-detail\.js(\?v=[^"']*)?/g, `/js/blog-detail.js?v=${v}`);
    html = html.replace(/\/js\/contact\.js(\?v=[^"']*)?/g, `/js/contact.js?v=${v}`);
    html = html.replace(/\/js\/admin\.js(\?v=[^"']*)?/g, `/js/admin.js?v=${v}`);
    html = html.replace(/\/js\/admin-quotes\.js(\?v=[^"']*)?/g, `/js/admin-quotes.js?v=${v}`);
    html = html.replace(/\/js\/admin-settings\.js(\?v=[^"']*)?/g, `/js/admin-settings.js?v=${v}`);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(html);
  } catch (err) {
    console.warn('Lưu ý render trang:', err.message);
    try {
      res.sendFile(path.join(PUBLIC_DIR, fileName));
    } catch (e) {
      res.redirect(`/${fileName}`);
    }
  }
}

module.exports = {
  PUBLIC_DIR,
  servePageWithBanner
};
