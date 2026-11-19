const path = require('path');
const fs = require('fs');
const { get, query } = require('../../db');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripHtmlText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style\b[^>]*>[\s\S]*?(<\/style>|$)/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?(<\/script>|$)/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBaseUrl(req) {
  if (!req) return 'https://dienviet.vn';
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'dienviet.vn').split(',')[0].trim();
  return `${proto}://${host}`;
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return `${baseUrl}/images/hero-banner-main.jpg`;
  const trimmed = String(url).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('data:')) return `${baseUrl}/images/hero-banner-main.jpg`;
  return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function formatPriceVND(price) {
  const n = Number(price) || 0;
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
}

// Xây dựng thẻ Meta SEO, OpenGraph (Zalo/FB) & Schema.org JSON-LD động từ Turso DB
async function buildSeoHeadTags(req, fileName, settingsMap) {
  const baseUrl = getBaseUrl(req);
  const companyName = settingsMap.company_name || 'Công ty TNHH Điện Việt';
  const slogan = settingsMap.company_slogan || 'Kết nối giá trị - Thắp sáng tương lai';
  const phone = settingsMap.phone || '1800 1234';
  const email = settingsMap.email || 'hotro@dienviet.vn';
  const address = settingsMap.address || 'Số 123 Nguyễn Văn Cừ, Hà Nội';
  const defaultOgImage = toAbsoluteUrl(settingsMap.banner_home || settingsMap.logo_url || '/images/hero-banner-main.jpg', baseUrl);
  const logoAbs = toAbsoluteUrl(settingsMap.logo_url || '/images/logo.png', baseUrl);

  let title = `${companyName} - ${slogan}`;
  let description = `Phân phối thiết bị điện chính hãng: Dây điện Cadivi, cáp điện LS Vina, Aptomat Schneider, Panasonic, đèn LED chiếu sáng. Cam kết 100% chính hãng, đầy đủ CO/CQ, báo giá dự án nhanh chóng.`;
  let keywords = 'thiết bị điện, dây điện cadivi, cáp điện hạ thế, aptomat schneider, ổ cắm panasonic, đèn led chiếu sáng, điện việt';
  let ogImage = defaultOgImage;
  let ogType = 'website';
  let canonicalUrl = `${baseUrl}${req ? req.path : '/'}`;
  const schemas = [];

  // Schema Organization / HardwareStore mặc định cho toàn site
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'HardwareStore',
    name: companyName,
    url: baseUrl,
    logo: logoAbs,
    image: defaultOgImage,
    telephone: phone,
    email: email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressCountry: 'VN'
    },
    sameAs: [settingsMap.facebook_link, settingsMap.zalo_link, settingsMap.shopee_link].filter(Boolean)
  };

  if (fileName === 'index.html') {
    canonicalUrl = `${baseUrl}/`;
    schemas.push(orgSchema);
  } else if (fileName === 'products.html') {
    title = `Danh sách Sản phẩm Thiết bị Điện Chính hãng | ${companyName}`;
    description = `Khám phá danh mục thiết bị điện, dây cáp điện Cadivi, LS Vina, Aptomat MCB/MCCB/RCBO, công tắc ổ cắm và đèn LED giá tốt nhất tại ${companyName}.`;
    ogImage = toAbsoluteUrl(settingsMap.banner_products || defaultOgImage, baseUrl);
    canonicalUrl = `${baseUrl}/products`;
    schemas.push(orgSchema);
  } else if (fileName === 'about.html') {
    title = `Giới thiệu ${companyName} - Đối tác Thiết bị Điện Uy tín`;
    description = stripHtmlText(settingsMap.about_mission || settingsMap.about_why_choose || description).slice(0, 160);
    ogImage = toAbsoluteUrl(settingsMap.banner_about || defaultOgImage, baseUrl);
    canonicalUrl = `${baseUrl}/about`;
    schemas.push(orgSchema);
  } else if (fileName === 'blogs.html') {
    title = `Tin tức & Kiến thức Kỹ thuật Điện | ${companyName}`;
    description = `Cập nhật kinh nghiệm chọn dây điện, aptomat chống giật, giải pháp chiếu sáng LED tiết kiệm điện và tin tức khuyến mãi từ ${companyName}.`;
    ogImage = toAbsoluteUrl(settingsMap.banner_blogs || defaultOgImage, baseUrl);
    canonicalUrl = `${baseUrl}/blogs`;
  } else if (fileName === 'contact.html') {
    title = `Liên hệ & Yêu cầu Báo giá Thiết bị Điện | ${companyName}`;
    description = `Liên hệ ${companyName} qua Hotline ${phone} để nhận báo giá chiết khấu đại lý, công trình dự án dây cáp điện và thiết bị điện chính hãng.`;
    ogImage = toAbsoluteUrl(settingsMap.banner_contact || defaultOgImage, baseUrl);
    canonicalUrl = `${baseUrl}/contact`;
    schemas.push(orgSchema);
  } else if (fileName === 'product-detail.html' && req && req.query && req.query.id) {
    try {
      const prod = await get(
        `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
        [req.query.id]
      );
      if (prod) {
        const priceStr = formatPriceVND(prod.price);
        title = `${prod.name} - Giá ${priceStr} | ${companyName}`;
        const rawDesc = stripHtmlText(prod.short_desc || prod.description || '');
        description = rawDesc ? `${rawDesc.slice(0, 155)}...` : `${prod.name} chính hãng giá ${priceStr} tại ${companyName}. Đầy đủ CO/CQ, bảo hành uy tín.`;
        keywords = `${prod.name}, ${prod.category_name || 'thiết bị điện'}, mua ${prod.name}, báo giá ${prod.name}, ${companyName}`;
        ogImage = toAbsoluteUrl(prod.image || defaultOgImage, baseUrl);
        ogType = 'product';
        canonicalUrl = `${baseUrl}/product-detail?id=${prod.id}`;

        // Schema Product (Rich Snippets hiển thị Giá tiền & Còn hàng trên Google)
        schemas.push({
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: prod.name,
          image: [ogImage],
          description: stripHtmlText(prod.description || prod.short_desc || prod.name).slice(0, 300),
          sku: `DV-${prod.id}`,
          category: prod.category_name || 'Thiết bị điện',
          brand: {
            '@type': 'Brand',
            name: companyName
          },
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'VND',
            price: String(Number(prod.price) || 0),
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: companyName
            }
          }
        });

        // Schema BreadcrumbList
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Sản phẩm', item: `${baseUrl}/products` },
            { '@type': 'ListItem', position: 3, name: prod.name, item: canonicalUrl }
          ]
        });
      }
    } catch (e) {}
  } else if (fileName === 'blog-detail.html' && req && req.query && req.query.id) {
    try {
      const blog = await get('SELECT * FROM blogs WHERE id = ?', [req.query.id]);
      if (blog) {
        title = `${blog.title} | ${companyName}`;
        const rawSummary = stripHtmlText(blog.summary || blog.content || '');
        description = rawSummary ? `${rawSummary.slice(0, 158)}` : `${blog.title} - Chia sẻ kiến thức từ ${companyName}.`;
        keywords = `${blog.title}, ${blog.category || 'tin tức điện'}, ${companyName}`;
        ogImage = toAbsoluteUrl(blog.image || defaultOgImage, baseUrl);
        ogType = 'article';
        canonicalUrl = `${baseUrl}/blog-detail?id=${blog.id}`;

        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: blog.title,
          image: [ogImage],
          datePublished: blog.created_at || new Date().toISOString(),
          author: {
            '@type': 'Person',
            name: blog.author || companyName
          },
          publisher: {
            '@type': 'Organization',
            name: companyName,
            logo: { '@type': 'ImageObject', url: logoAbs }
          },
          description: description
        });
      }
    } catch (e) {}
  }

  const schemaScripts = schemas
    .map(s => `  <script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');

  const metaHtml = `
  <!-- SEO Meta Tags & OpenGraph (Zalo / Facebook / Google Rich Snippets) -->
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="keywords" content="${escapeAttr(keywords)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:type" content="${escapeAttr(ogType)}">
  <meta property="og:site_name" content="${escapeAttr(companyName)}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
  <meta property="og:image" content="${escapeAttr(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(title)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  <meta name="twitter:image" content="${escapeAttr(ogImage)}">
${schemaScripts}`;

  return { title, metaHtml };
}

// Helper phục vụ trang HTML kèm theo Banner, Logo & SEO Metadata động trực tiếp từ cơ sở dữ liệu
async function servePageWithBanner(res, fileName, bannerKey, bannerId, req = null) {
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

    // Nạp tất cả settings 1 lần duy nhất để tối ưu tốc độ SSR (thay vì gọi 8-10 query riêng lẻ)
    const settingsRows = await query('SELECT key, value FROM settings');
    const settingsMap = {};
    (settingsRows || []).forEach(r => {
      if (r && r.key) settingsMap[r.key] = r.value;
    });

    // 0. Inject SEO Meta Tags, OpenGraph & JSON-LD Schema động vào <head>
    const { title: seoTitle, metaHtml } = await buildSeoHeadTags(req, fileName, settingsMap);
    if (seoTitle) {
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(seoTitle)}</title>`);
    }
    if (metaHtml && html.includes('</head>')) {
      html = html.replace('</head>', `${metaHtml}\n</head>`);
    }

    // 1. Lấy banner mới nhất từ database
    if (bannerKey && bannerId && settingsMap[bannerKey]) {
      const val = settingsMap[bannerKey];
      const regex1 = new RegExp(`id=["']${bannerId}["']([\\s\\S]*?)src=["'][^"']*["']`, 'i');
      const regex2 = new RegExp(`src=["'][^"']*["']([\\s\\S]*?)id=["']${bannerId}["']`, 'i');

      if (regex1.test(html)) {
        html = html.replace(regex1, `id="${bannerId}"$1src="${val}"`);
      } else if (regex2.test(html)) {
        html = html.replace(regex2, `src="${val}"$1id="${bannerId}"`);
      }
    }

    // 2. Lấy logo mới nhất từ database và inject trực tiếp vào HTML (Header & Footer)
    if (settingsMap.logo_url && settingsMap.logo_url.trim()) {
      const logoUrl = settingsMap.logo_url.trim();

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
    if (settingsMap.company_name && settingsMap.company_name.trim()) {
      const name = settingsMap.company_name.trim();
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

    if (settingsMap.company_slogan && settingsMap.company_slogan.trim()) {
      const slogan = settingsMap.company_slogan.trim();
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
    if (settingsMap.about_title && settingsMap.about_title.trim()) {
      const aTitle = settingsMap.about_title.trim();
      html = html.replace(
        /(<h[2-4][^>]*id=["']about-title["'][^>]*>)([\s\S]*?)(<\/h[2-4]>)/i,
        `$1${aTitle}$3`
      );
      html = html.replace(
        /(<h[2-4][^>]*id=["']about-us-title["'][^>]*>)([\s\S]*?)(<\/h[2-4]>)/i,
        `$1${aTitle}$3`
      );
    }

    if (settingsMap.about_history && settingsMap.about_history.trim()) {
      let aHistory = settingsMap.about_history.trim();
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

    if (settingsMap.about_why_choose && settingsMap.about_why_choose.trim()) {
      const aWhy = settingsMap.about_why_choose.trim();
      html = html.replace(
        /(<(?:p|div)[^>]*id=["']about-why-desc["'][^>]*class=["'][^"']*?)\bhidden\b([^"']*["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
        (match, p1, p2, p3, p4) => `${p1}${p2}>${aWhy}${p4}`
      );
    }

    if (settingsMap.about_values && settingsMap.about_values.trim()) {
      const aVal = settingsMap.about_values.trim();
      html = html.replace(
        /(<(?:p|div)[^>]*id=["']about-values-desc["'][^>]*>)([\s\S]*?)(<\/(?:p|div)>)/i,
        (match, p1, p2, p3) => `${p1}${aVal}${p3}`
      );
    }

    // 5. Inject Danh sách Loại Báo Giá / Liên Hệ vào trang contact.html & index.html
    if (fileName === 'contact.html' && settingsMap.quote_types) {
      try {
        const list = JSON.parse(settingsMap.quote_types);
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

    if (fileName === 'index.html' && settingsMap.quote_types) {
      try {
        const list = JSON.parse(settingsMap.quote_types);
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
  getBaseUrl,
  servePageWithBanner
};
