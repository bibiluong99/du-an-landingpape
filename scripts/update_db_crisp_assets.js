const { query, run } = require('../db');

async function updateDbAssets() {
  console.log('=== UPDATE DB WITH CRISP HIGH-RES ASSETS ===');

  // Categories
  const categories = [
    { id: 1, name: 'Dây điện', image: '/images/cat-day-dien.svg' },
    { id: 2, name: 'Dây cáp điện', image: '/images/cat-day-cap-dien.svg' },
    { id: 3, name: 'Thiết bị điện', image: '/images/cat-thiet-bi-dien.svg' },
    { id: 4, name: 'Ổ cắm, công tắc', image: '/images/cat-o-cam-cong-tac.svg' },
    { id: 5, name: 'Phụ kiện điện', image: '/images/cat-phu-kien-dien.svg' },
    { id: 6, name: 'Đèn chiếu sáng', image: '/images/cat-den-chieu-sang.svg' },
  ];

  for (const c of categories) {
    await run("UPDATE categories SET image = ? WHERE id = ?", [c.image, c.id]);
  }
  console.log('✔ Updated 6 categories to crisp vector SVGs');

  // Products
  const products = [
    { id: 1, image: '/images/prod-day-cadivi.svg' },
    { id: 2, image: '/images/prod-cap-cvv.svg' },
    { id: 3, image: '/images/prod-aptomat-63a.svg' },
    { id: 4, image: '/images/prod-day-ls.svg' },
    { id: 5, image: '/images/prod-mang-cap.svg' },
  ];

  for (const p of products) {
    await run("UPDATE products SET image = ? WHERE id = ?", [p.image, p.id]);
  }
  console.log('✔ Updated 5 products to crisp vector SVGs');

  // Blogs
  const blogs = [
    { id: 1, image: '/images/blog-chon-day-dien.jpg' },
    { id: 2, image: '/images/blog-tiet-kiem-dien.jpg' },
    { id: 3, image: '/images/blog-den-led.jpg' },
  ];

  for (const b of blogs) {
    await run("UPDATE blogs SET image = ? WHERE id = ?", [b.image, b.id]);
  }
  console.log('✔ Updated 3 blogs to crisp HD photos');

  setTimeout(() => process.exit(0), 500);
}

updateDbAssets().catch(err => {
  console.error(err);
  process.exit(1);
});

