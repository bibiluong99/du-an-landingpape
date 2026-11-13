const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlFiles = [
  'index.html',
  'about.html',
  'products.html',
  'product-detail.html',
  'blogs.html',
  'blog-detail.html',
  'contact.html'
];

let allPassed = true;
function check(title, condition, detail) {
  if (condition) {
    console.log(`[PASS] ${title}`);
  } else {
    console.error(`[FAIL] ${title} - ${detail || ''}`);
    allPassed = false;
  }
}

// 1. Footer text check
htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
  check(`Footer text in ${file}`, content.includes('@ 2026 Điện Việt'), 'Missing "@ 2026 Điện Việt"');
});

// 2. Ẩn nút Tìm hiểu thêm
const indexContent = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const aboutSection = indexContent.slice(indexContent.indexOf('id="about"'), indexContent.indexOf('id="contact"'));
check('Index page: "Tìm hiểu thêm" hidden in about section', !aboutSection.includes('>Tìm hiểu thêm<'));

const aboutContent = fs.readFileSync(path.join(publicDir, 'about.html'), 'utf8');
const aboutUsSection = aboutContent.slice(aboutContent.indexOf('id="about-us"'), aboutContent.indexOf('id="why-choose-us"'));
check('About page: "Tìm hiểu thêm" hidden in about-us section', !aboutUsSection.includes('>Tìm hiểu thêm<'));

// 3. Admin: 3 Sub-tabs
const adminContent = fs.readFileSync(path.join(publicDir, 'admin.html'), 'utf8');
check('Admin has subtab-btn-banners', adminContent.includes('id="subtab-btn-banners"'));
check('Admin has subtab-btn-business', adminContent.includes('id="subtab-btn-business"'));
check('Admin has subtab-btn-about', adminContent.includes('id="subtab-btn-about"'));
check('Admin has subtab-content-banners', adminContent.includes('id="subtab-content-banners"'));
check('Admin has subtab-content-business', adminContent.includes('id="subtab-content-business"'));
check('Admin has subtab-content-about', adminContent.includes('id="subtab-content-about"'));

// 4. Admin: Upload Logo
check('Admin has preview-logo', adminContent.includes('id="preview-logo"'));
check('Admin has file-logo', adminContent.includes('id="file-logo"'));
check('Admin has set-logo-url', adminContent.includes('id="set-logo-url"'));

// 5. Admin: Hide Sứ mệnh
check('Admin hides mission', adminContent.includes('style="display: none;"') && adminContent.includes('id="set-about-mission"'));

// 6. Landing page & main.js: Dynamic about_title, about_history, about_values
const mainJs = fs.readFileSync(path.join(publicDir, 'js', 'main.js'), 'utf8');
check('main.js binds about-title', mainJs.includes("getElementById('about-title')"));
check('main.js binds about-history', mainJs.includes("getElementById('about-history')"));
check('main.js binds about-values', mainJs.includes("getElementById('about-values')"));
check('main.js binds logo_url to site-logo-img', mainJs.includes(".site-logo-img") && mainJs.includes("s.logo_url"));

// Admin JS functions
const adminJs = fs.readFileSync(path.join(publicDir, 'js', 'admin.js'), 'utf8');
check('admin.js has switchSettingsSubTab', adminJs.includes("function switchSettingsSubTab"));
check('admin.js has uploadLogoImage', adminJs.includes("function uploadLogoImage"));
check('admin.js has saveBusinessSettings', adminJs.includes("function saveBusinessSettings"));
check('admin.js has saveAboutSettings', adminJs.includes("function saveAboutSettings"));

console.log('\n================================');
console.log(allPassed ? 'ALL CHECKS PASSED SUCCESSFULLY!' : 'SOME CHECKS FAILED!');
console.log('================================');

