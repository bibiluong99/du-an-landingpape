const { run, query, get } = require('../db');

async function migrate() {
  console.log('--- BẮT ĐẦU CẬP NHẬT DỮ LIỆU ĐIỆN VIỆT ---');

  // 1. Cập nhật Settings
  const settings = [
    { key: 'company_name', value: 'Điện Việt' },
    { key: 'company_slogan', value: 'Kết nối giá trị - Thắp sáng tương lai' },
    { key: 'hero_title', value: 'Dây điện - Cáp điện' },
    { key: 'hero_slogan', value: 'Chất lượng tạo nên giá trị!' },
    { key: 'hero_subtitle', value: 'An toàn • Bền bỉ • Hiệu quả' },
    { key: 'hero_image', value: '/images/hero-banner.jpg' },
    { key: 'about_title', value: 'Công ty TNHH Điện Việt' },
    { key: 'about_history', value: 'Với hơn 10 năm kinh nghiệm trong lĩnh vực thiết bị điện, Điện Việt tự hào là đơn vị phân phối dây cáp điện và thiết bị đóng cắt hàng đầu tại Việt Nam.' },
    { key: 'about_mission', value: 'Điện Việt cam kết mang đến cho khách hàng những sản phẩm chất lượng, giải pháp tối ưu và dịch vụ chuyên nghiệp nhất.' },
    { key: 'about_values', value: 'Sản phẩm chất lượng • Giá cả cạnh tranh • Dịch vụ tận tâm' },
    { key: 'phone', value: '1800 1234' },
    { key: 'email', value: 'hotro@dienviet.vn' },
    { key: 'address', value: 'Số 123 Nguyễn Văn Cừ, Hà Nội' },
    { key: 'zalo_link', value: 'https://zalo.me/18001234' },
    { key: 'facebook_link', value: 'https://facebook.com/dienviet.official' },
    { key: 'shopee_link', value: 'https://shopee.vn/dienviet' },
    { key: 'maps_embed', value: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.9242941011835!2d105.86790517596956!3d21.035715987541243!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135a987d605ff79%3A0x6b8d2e85ab5ff8aa!2zMTIzIE5ndXnhu4VuIFbEg24gQ-G7qywgTG9uZyBCacOqbiwgSMOgIE7hu5lp!5e0!3m2!1svi!2s!4v1710000000000!5m2!1svi!2s' }
  ];

  for (const s of settings) {
    const exist = await get('SELECT id FROM settings WHERE key = ?', [s.key]);
    if (exist) {
      await run('UPDATE settings SET value = ? WHERE key = ?', [s.value, s.key]);
    } else {
      await run('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
    }
  }
  console.log('✓ Đã cập nhật Cài đặt hệ thống (Settings)');

  // 2. Làm mới Categories
  await run('DELETE FROM categories');
  const categories = [
    {
      id: 1,
      name: 'Dây điện',
      slug: 'day-dien',
      description: 'Dây điện dân dụng Cadivi, LS Vina, Daphaco ruột đồng nguyên chất cách điện PVC an toàn.',
      image: '/images/cat-day-dien.svg',
      show_in_slider: 1,
      sort_order: 1
    },
    {
      id: 2,
      name: 'Dây cáp điện',
      slug: 'day-cap-dien',
      description: 'Dây cáp điện lực hạ thế CVV, CXV 1-4 lõi đồng, cáp ngầm, cáp chống cháy tiêu chuẩn.',
      image: '/images/cat-day-cap-dien.svg',
      show_in_slider: 1,
      sort_order: 2
    },
    {
      id: 3,
      name: 'Thiết bị điện',
      slug: 'thiet-bi-dien',
      description: 'Cầu dao tự động MCB, MCCB, Aptomat chống rò chống giật, khởi động từ contactor.',
      image: '/images/cat-thiet-bi-dien.svg',
      show_in_slider: 1,
      sort_order: 3
    },
    {
      id: 4,
      name: 'Ổ cắm, công tắc',
      slug: 'o-cam-cong-tac',
      description: 'Mặt ổ cắm 3 chấu an toàn, công tắc hạt đơn/đôi cao cấp phong cách hiện đại.',
      image: '/images/cat-o-cam-cong-tac.svg',
      show_in_slider: 1,
      sort_order: 4
    },
    {
      id: 5,
      name: 'Phụ kiện điện',
      slug: 'phu-kien-dien',
      description: 'Đầu cosse đồng, ống gen co nhiệt, băng dính cách điện, cầu đấu kẹp dây chất lượng cao.',
      image: '/images/cat-phu-kien-dien.svg',
      show_in_slider: 1,
      sort_order: 5
    },
    {
      id: 6,
      name: 'Đèn chiếu sáng',
      slug: 'den-chieu-sang',
      description: 'Đèn LED âm trần siêu mỏng Downlight, đèn tuýp LED, đèn rọi ray, đèn chiếu sáng công nghiệp.',
      image: '/images/cat-den-chieu-sang.svg',
      show_in_slider: 1,
      sort_order: 6
    }
  ];

  for (const c of categories) {
    await run(
      'INSERT INTO categories (id, name, slug, description, image, show_in_slider, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.slug, c.description, c.image, c.show_in_slider, c.sort_order]
    );
  }
  console.log('✓ Đã cập nhật 6 danh mục chuẩn Điện Việt');

  // 3. Làm mới Products
  await run('DELETE FROM products');
  const products = [
    {
      id: 1,
      category_id: 1,
      name: 'Dây điện Cadivi 2.5mm²',
      slug: 'day-dien-cadivi-2-5mm',
      price: 85000,
      original_price: 100000,
      image: '/images/prod-day-cadivi.svg',
      short_desc: 'Dây điện đơn ruột đồng mềm bọc cách điện PVC Cadivi CV 2.5mm² tiêu chuẩn TCVN.',
      description: '<p>Dây điện đơn 1 lõi ruột đồng Cadivi 2.5mm² chuyên dùng cho hệ thống điện gia đình, căn hộ, văn phòng. Khả năng dẫn điện vượt trội, lớp vỏ PVC dày dặn cách điện an toàn tuyệt đối, chịu nhiệt độ làm việc lên tới 70°C.</p>',
      specs: JSON.stringify({
        'Thương hiệu': 'Cadivi',
        'Tiết diện ruột dẫn': '2.5 mm²',
        'Vật liệu ruột dẫn': 'Đồng nguyên chất 99.9%',
        'Vật liệu cách điện': 'PVC cao cấp',
        'Điện áp danh định': '450/750V',
        'Chiều dài đóng gói': 'Cuộn 100 mét'
      }),
      is_new: 1,
      is_promo: 1,
      stock: 1200
    },
    {
      id: 2,
      category_id: 2,
      name: 'Cáp điện CVV 3x1.5mm²',
      slug: 'cap-dien-cvv-3x1-5mm',
      price: 120000,
      original_price: 150000,
      image: '/images/prod-cap-cvv.svg',
      short_desc: 'Cáp điện lực hạ thế CVV 3 lõi ruột đồng cách điện PVC vỏ bọc PVC chống chịu va đập tốt.',
      description: '<p>Cáp điện lực hạ thế CVV 3x1.5mm² phù hợp cho đường truyền tải điện trung tâm, phân phối nguồn điện máy móc nhà xưởng và công trình công cộng. Vỏ bảo vệ màu đen bền bỉ, chống ẩm mốc và tia UV.</p>',
      specs: JSON.stringify({
        'Quy cách': 'CVV 3 x 1.5 mm²',
        'Số lõi': '3 lõi phân màu (Đỏ, Vàng, Xanh)',
        'Ruột dẫn': 'Đồng mềm ủ trần class 2',
        'Cách điện': 'PVC chất lượng cao',
        'Vỏ bọc ngoài': 'PVC đen chống lão hóa',
        'Điện áp làm việc': '0.6/1kV'
      }),
      is_new: 0,
      is_promo: 1,
      stock: 850
    },
    {
      id: 3,
      category_id: 3,
      name: 'Aptomat 2P 63A',
      slug: 'aptomat-2p-63a',
      price: 270000,
      original_price: 300000,
      image: '/images/prod-aptomat-63a.svg',
      short_desc: 'Cầu dao tự động MCB 2 cực 63A ngắt mạch bảo vệ chống quá tải và ngắn mạch tiêu chuẩn IEC.',
      description: '<p>Aptomat 2P 63A là thiết bị đóng cắt an toàn cho tổng nguồn gia đình, toà nhà. Cơ chế lẫy gạt nhanh dập hồ quang tức thì, độ bền cơ học đạt trên 20.000 lần đóng cắt, bảo vệ tài sản và tính mạng tối đa.</p>',
      specs: JSON.stringify({
        'Dòng điện định mức': '63A',
        'Số cực': '2P (2 Pha)',
        'Điện áp định mức': '230/400V AC',
        'Dòng cắt ngắn mạch': '6000A (6kA)',
        'Đường đặc tính cắt': 'Type C',
        'Tiêu chuẩn': 'IEC/EN 60898-1'
      }),
      is_new: 1,
      is_promo: 1,
      stock: 650
    },
    {
      id: 4,
      category_id: 1,
      name: 'Dây điện LS 1.5mm²',
      slug: 'day-dien-ls-1-5mm',
      price: 72000,
      original_price: 82000,
      image: '/images/prod-day-ls.svg',
      short_desc: 'Dây điện đơn ruột đồng LS Vina 1.5mm² chất lượng tiêu chuẩn Hàn Quốc, độ dẻo cao.',
      description: '<p>Dây điện LS-VINA 1.5mm² ruột đồng mềm nguyên chất, vỏ bọc PVC chống cháy lan hiệu quả. Thích hợp đi dây chiếu sáng, công tắc âm tường và hệ thống cấp nguồn tải nhẹ đến trung bình.</p>',
      specs: JSON.stringify({
        'Thương hiệu': 'LS VINA Cable & System',
        'Mã sản phẩm': 'Cu/PVC 1x1.5mm²',
        'Màu sắc vỏ': 'Đỏ nổi bật',
        'Điện áp danh định': '450/750V',
        'Độ bền kéo đứt': 'Đạt tiêu chuẩn KS C',
        'Quy cách': 'Cuộn 100m'
      }),
      is_new: 0,
      is_promo: 1,
      stock: 980
    },
    {
      id: 5,
      category_id: 5,
      name: 'Máng cáp điện 40x60',
      slug: 'mang-cap-dien-40x60',
      price: 45000,
      original_price: 55000,
      image: '/images/prod-mang-cap.svg',
      short_desc: 'Nẹp máng gen luồn dây điện PVC chống cháy 40x60mm nắp gài tiện lợi cho công trình.',
      description: '<p>Máng ghen luồn dây điện 40x60mm màu trắng sữa thanh lịch, sản xuất từ nhựa PVC nguyên sinh chống bắt lửa, tự dập tắt khi cách nguồn nhiệt. Nắp đậy thiết kế ngàm khớp chắc chắn, dễ dàng tháo lắp kiểm tra dây điện.</p>',
      specs: JSON.stringify({
        'Kích thước': '40mm (Cao) x 60mm (Rộng)',
        'Chiều dài tiêu chuẩn': '2 mét/cây',
        'Chất liệu': 'Nhựa PVC chống cháy cao cấp',
        'Màu sắc': 'Trắng sữa',
        'Tính năng': 'Chịu lực nén, kháng tia cực tím'
      }),
      is_new: 1,
      is_promo: 1,
      stock: 2500
    },
    {
      id: 6,
      category_id: 6,
      name: 'Đèn LED Âm Trần Downlight 9W Điện Việt',
      slug: 'den-led-am-tran-downlight-9w',
      price: 65000,
      original_price: 85000,
      image: '/images/cat-den-chieu-sang.svg',
      short_desc: 'Đèn LED panel tròn siêu mỏng 9W ánh sáng trung tính, tiết kiệm điện 85% tuổi thọ 30.000h.',
      description: '<p>Đèn LED âm trần 9W viền nhôm tản nhiệt cao cấp, chip LED SMD thế hệ mới không nhấp nháy, bảo vệ thị lực tối đa. Ánh sáng dịu êm, góc tỏa rộng 120 độ cho không gian phòng khách, phòng ngủ hiện đại.</p>',
      specs: JSON.stringify({
        'Công suất': '9W',
        'Quang thông': '810 Lm',
        'Lỗ khoét trần': 'D90 - D110 mm',
        'Nhiệt độ màu': '4000K (Trung tính) / 6500K (Trắng)',
        'Tuổi thọ': '30.000 giờ'
      }),
      is_new: 1,
      is_promo: 0,
      stock: 1400
    },
    {
      id: 7,
      category_id: 4,
      name: 'Ổ Cắm Đôi 3 Chấu Có Công Tắc Điện Việt',
      slug: 'o-cam-doi-3-chau-co-cong-tac',
      price: 55000,
      original_price: 68000,
      image: '/images/cat-o-cam-cong-tac.svg',
      short_desc: 'Ổ cắm đôi 3 chấu kèm công tắc bật tắt và đèn báo tín hiệu, màn che an toàn cho trẻ nhỏ.',
      description: '<p>Ổ cắm đôi tích hợp công tắc ngắt nguồn độc lập không cần rút phích cắm. Nhíp đồng phosphor đàn hồi cao, giữ chân cắm chắc chắn không lỏng lẻo sau hàng nghìn lần sử dụng.</p>',
      specs: JSON.stringify({
        'Dòng tải': '16A - 250V AC',
        'Chất liệu mặt': 'Nhựa PC chống xước chống cháy',
        'Cực tiếp xúc': 'Đồng hợp kim phosphor cao cấp'
      }),
      is_new: 1,
      is_promo: 0,
      stock: 900
    },
    {
      id: 8,
      category_id: 5,
      name: 'Hộp Đầu Cosse Dây Điện Cao Cấp (100 Chiếc)',
      slug: 'hop-dau-cosse-day-dien-100-chiec',
      price: 95000,
      original_price: 110000,
      image: '/images/cat-phu-kien-dien.svg',
      short_desc: 'Bộ 100 đầu cosse bọc nhựa cách điện nhiều màu (đầu tròn, đầu dẹp, đầu kim) mạ thiếc chống oxy hóa.',
      description: '<p>Hộp đầu cosse kẹp dây điện chuyên dụng giúp kết nối tủ điện gọn gàng, tiếp xúc điện hoàn hảo không phát sinh tia lửa điện, chống chập cháy cho công trình chuyên nghiệp.</p>',
      specs: JSON.stringify({
        'Số lượng': '100 chiếc/hộp',
        'Kích cỡ dây': '0.5mm² đến 6.0mm²',
        'Chất liệu': 'Đồng đỏ mạ thiếc, bọc nhựa PVC'
      }),
      is_new: 1,
      is_promo: 0,
      stock: 600
    }
  ];

  for (const p of products) {
    await run(
      'INSERT INTO products (id, category_id, name, slug, price, original_price, image, short_desc, description, specs, is_new, is_promo, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.category_id, p.name, p.slug, p.price, p.original_price, p.image, p.short_desc, p.description, p.specs, p.is_new, p.is_promo, p.stock]
    );
  }
  console.log('✓ Đã cập nhật 8 sản phẩm chuẩn Điện Việt');

  // 4. Làm mới Blogs
  await run('DELETE FROM blogs');
  const blogs = [
    {
      id: 1,
      title: 'Hướng dẫn chọn dây điện phù hợp cho gia đình',
      slug: 'huong-dan-chon-day-dien-phu-hop-cho-gia-dinh',
      author: 'Ban Kỹ Thuật Điện Việt',
      image: '/images/blog-chon-day-dien.jpg',
      summary: 'Bí quyết tính toán tiết diện dây điện 1.5mm², 2.5mm², 4.0mm² chuẩn xác cho từng thiết bị gia dụng giúp đảm bảo an toàn tuyệt đối và tiết kiệm chi phí.',
      content: '<p>Việc lựa chọn tiết diện dây dẫn điện phù hợp là yếu tố sống còn đảm bảo an toàn phòng chống cháy nổ cho mọi gia đình. Nếu dây quá nhỏ, tải điện lớn sẽ gây nóng chảy vỏ bọc và chập mạch...</p><p>1. Thiết bị chiếu sáng: Sử dụng dây đơn 1.5mm².<br>2. Ổ cắm thông thường, tivi, quạt: Dây 2.5mm².<br>3. Điều hòa nhiệt độ, bình nóng lạnh, bếp từ: Sử dụng dây từ 4.0mm² đến 6.0mm².</p>',
      created_at: '2024-11-12 09:00:00'
    },
    {
      id: 2,
      title: 'Cách tiết kiệm điện hiệu quả tại nhà',
      slug: 'cach-tiet-kiem-dien-hieu-qua-tai-nha',
      author: 'Chuyên Gia Năng Lượng',
      image: '/images/blog-tiet-kiem-dien.jpg',
      summary: 'Tổng hợp các giải pháp tối ưu hóa mức tiêu thụ điện gia đình, cách sử dụng thiết bị làm mát và chiếu sáng thông minh giảm đến 30% hóa đơn tiền điện.',
      content: '<p>Trong bối cảnh chi phí sinh hoạt ngày càng tăng, áp dụng các mẹo sử dụng điện thông minh không chỉ giúp giảm gánh nặng hóa đơn hàng tháng mà còn bảo vệ tuổi thọ thiết bị...</p><p>Hãy cài đặt điều hòa ở mức 26-28 độ C kèm quạt gió, vệ sinh lưới lọc định kỳ và rút phích cắm thiết bị ở chế độ chờ (standby).</p>',
      created_at: '2024-11-05 14:30:00'
    },
    {
      id: 3,
      title: 'Ưu điểm của đèn LED so với đèn truyền thống',
      slug: 'uu-diem-cua-den-led-so-voi-den-truyen-thong',
      author: 'Đội Ngũ R&D Điện Việt',
      image: '/images/blog-den-led.jpg',
      summary: 'So sánh chi tiết hiệu suất quang thông, tuổi thọ lên tới 50.000 giờ và độ an toàn cho thị lực giữa công nghệ chiếu sáng LED hiện đại và bóng đèn sợi đốt, huỳnh quang.',
      content: '<p>Công nghệ chiếu sáng LED (Light Emitting Diode) đã tạo ra một cuộc cách mạng xanh toàn cầu. So với bóng đèn sợi đốt tiêu thụ nhiều năng lượng và tỏa nhiệt lớn, đèn LED chuyển hóa đến 90% điện năng thành quang năng...</p>',
      created_at: '2024-10-28 16:15:00'
    }
  ];

  for (const b of blogs) {
    await run(
      'INSERT INTO blogs (id, title, slug, author, image, summary, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [b.id, b.title, b.slug, b.author, b.image, b.summary, b.content, b.created_at]
    );
  }
  console.log('✓ Đã cập nhật 3 bài viết tin tức chuẩn Điện Việt');
  console.log('--- HOÀN TẤT MIGRATION ĐIỆN VIỆT ---');
}

migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

