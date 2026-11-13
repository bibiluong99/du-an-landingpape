const { db, query, run } = require('../db');

async function updateData() {
  console.log('=== CẬP NHẬT DỮ LIỆU ĐIỆN VIỆT KHỚP 100% MOCKUP ===');

  // 1. Cập nhật 6 danh mục chính xác từ Mockup
  const categories = [
    { id: 1, name: 'Dây điện', image: '/images/mockup_assets/cat-day-dien.png', show_in_slider: 1 },
    { id: 2, name: 'Dây cáp điện', image: '/images/mockup_assets/cat-day-cap-dien.png', show_in_slider: 1 },
    { id: 3, name: 'Thiết bị điện', image: '/images/mockup_assets/cat-thiet-bi-dien.png', show_in_slider: 1 },
    { id: 4, name: 'Ổ cắm, công tắc', image: '/images/mockup_assets/cat-o-cam-cong-tac.png', show_in_slider: 1 },
    { id: 5, name: 'Phụ kiện điện', image: '/images/mockup_assets/cat-phu-kien-dien.png', show_in_slider: 0 },
    { id: 6, name: 'Đèn chiếu sáng', image: '/images/mockup_assets/cat-den-chieu-sang.png', show_in_slider: 0 },
  ];

  for (const c of categories) {
    const existing = await query("SELECT id FROM categories WHERE id = ?", [c.id]);
    if (existing.length > 0) {
      await run("UPDATE categories SET name = ?, image = ?, show_in_slider = ? WHERE id = ?", [c.name, c.image, c.show_in_slider, c.id]);
    } else {
      await run("INSERT INTO categories (id, name, image, show_in_slider) VALUES (?, ?, ?, ?)", [c.id, c.name, c.image, c.show_in_slider]);
    }
  }
  console.log('✔ Đã cập nhật 6 danh mục chuẩn');

  // 2. Cập nhật 5 sản phẩm bán chạy chính xác từ Mockup
  const products = [
    {
      id: 1,
      name: 'Dây điện Cadivi 2.5mm²',
      category_id: 1,
      price: 85000,
      original_price: 100000,
      image: '/images/mockup_assets/prod-cadivi-25.png',
      description: 'Dây điện đơn ruột đồng Cadivi CV 2.5mm² bọc nhựa PVC cách điện chất lượng cao, an toàn tuyệt đối cho hệ thống điện gia đình.',
      specs: 'Ruột đồng 100%, Điện áp 450/750V, Tiêu chuẩn TCVN 6610-3',
      is_new: 1,
      is_promo: 1
    },
    {
      id: 2,
      name: 'Cáp điện CVV 3x1.5mm²',
      category_id: 2,
      price: 120000,
      original_price: 150000,
      image: '/images/mockup_assets/prod-cap-cvv.png',
      description: 'Cáp điện lực hạ thế CVV 3x1.5mm² lõi đồng nguyên chất bọc 2 lớp cách điện PVC, bền bỉ chống rò rỉ.',
      specs: '3 lõi đồng x 1.5mm², Cách điện PVC/PVC, Điện áp 0.6/1kV',
      is_new: 1,
      is_promo: 1
    },
    {
      id: 3,
      name: 'Aptomat 2P 63A',
      category_id: 3,
      price: 270000,
      original_price: 300000,
      image: '/images/mockup_assets/prod-aptomat-63a.png',
      description: 'Cầu dao tự động MCB 2 Pha 63A đóng ngắt nhanh nhạy, bảo vệ quá tải và ngắn mạch tối đa.',
      specs: 'Dòng định mức 63A, 2 Cực (2P), Dòng cắt ngắn mạch 6kA, Tiêu chuẩn IEC 60898',
      is_new: 0,
      is_promo: 1
    },
    {
      id: 4,
      name: 'Dây điện LS 1.5mm²',
      category_id: 1,
      price: 72000,
      original_price: 82000,
      image: '/images/mockup_assets/prod-day-ls.png',
      description: 'Dây điện LS VINA 1.5mm² ruột đồng mềm dẫn điện tốt, chịu nhiệt cao chống cháy lan an toàn.',
      specs: 'Ruột đồng tinh khiết 99.99%, Tiết diện 1.5mm², Cách điện PVC cao cấp',
      is_new: 1,
      is_promo: 1
    },
    {
      id: 5,
      name: 'Máng cáp điện 40x60',
      category_id: 5,
      price: 45000,
      original_price: 55000,
      image: '/images/mockup_assets/prod-mang-cap.png',
      description: 'Máng nẹp luồn dây điện PVC 40x60mm chống cháy, bền đẹp, nắp gài chắc chắn bảo vệ dây dẫn thẩm mỹ.',
      specs: 'Kích thước 40x60mm, Chiều dài 2m/cây, Nhựa PVC tự chống cháy',
      is_new: 0,
      is_promo: 1
    }
  ];

  for (const p of products) {
    const existing = await query("SELECT id FROM products WHERE id = ?", [p.id]);
    if (existing.length > 0) {
      await run(
        `UPDATE products SET name = ?, category_id = ?, price = ?, original_price = ?, image = ?, description = ?, specs = ?, is_new = ?, is_promo = ? WHERE id = ?`,
        [p.name, p.category_id, p.price, p.original_price, p.image, p.description, p.specs, p.is_new, p.is_promo, p.id]
      );
    } else {
      await run(
        `INSERT INTO products (id, name, category_id, price, original_price, image, description, specs, is_new, is_promo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.category_id, p.price, p.original_price, p.image, p.description, p.specs, p.is_new, p.is_promo]
      );
    }
  }
  console.log('✔ Đã cập nhật 5 sản phẩm bán chạy chuẩn');

  // 3. Cập nhật 3 bài viết blog
  const blogs = [
    {
      id: 1,
      title: 'Hướng dẫn chọn dây điện phù hợp cho gia đình',
      image: '/images/mockup_assets/blog-chon-day-dien.png',
      content: 'Để đảm bảo an toàn tuyệt đối cho ngôi nhà, việc tính toán công suất chịu tải và chọn đúng tiết diện dây dẫn đồng theo tiêu chuẩn là vô cùng quan trọng...',
      author: 'Kỹ sư Điện Việt',
      created_at: '2024-11-12 09:00:00'
    },
    {
      id: 2,
      title: 'Cách tiết kiệm điện hiệu quả tại nhà',
      image: '/images/mockup_assets/blog-tiet-kiem-dien.png',
      content: 'Áp dụng các giải pháp như tắt thiết bị ở chế độ chờ, thay thế bóng đèn LED thông minh và bảo dưỡng định kỳ các thiết bị tiêu thụ công suất lớn...',
      author: 'Điện Việt News',
      created_at: '2024-11-05 14:30:00'
    },
    {
      id: 3,
      title: 'Ưu điểm của đèn LED so với đèn truyền thống',
      image: '/images/mockup_assets/blog-den-led.png',
      content: 'Đèn LED tiết kiệm đến 80% điện năng so với đèn sợi đốt, tuổi thọ lên tới 50.000 giờ thắp sáng và không phát sinh tia cực tím gây hại mắt...',
      author: 'Ban Công Nghệ',
      created_at: '2024-10-28 16:15:00'
    }
  ];

  for (const b of blogs) {
    const existing = await query("SELECT id FROM blogs WHERE id = ?", [b.id]);
    if (existing.length > 0) {
      await run(
        `UPDATE blogs SET title = ?, image = ?, content = ?, author = ?, created_at = ? WHERE id = ?`,
        [b.title, b.image, b.content, b.author, b.created_at, b.id]
      );
    } else {
      await run(
        `INSERT INTO blogs (id, title, image, content, author, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [b.id, b.title, b.image, b.content, b.author, b.created_at]
      );
    }
  }
  console.log('✔ Đã cập nhật 3 blog tin tức chuẩn');

  setTimeout(() => process.exit(0), 500);
}

updateData().catch(err => {
  console.error(err);
  process.exit(1);
});
