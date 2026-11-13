const { run, query } = require('./db');

const products = [
  // 1. Dây điện (Cat 1)
  {
    category_id: 1,
    name: 'Dây điện đơn ruột đồng Cadivi CV 1.5 mm² (Cu/PVC)',
    price: 5800,
    original_price: 6500,
    image: '/images/prod-cadivi-red.jpg',
    images: JSON.stringify(['/images/prod-cadivi-red.jpg', '/images/prod-cadivi-thumb-1.jpg', '/images/prod-cadivi-big.jpg']),
    short_desc: 'Dây điện đơn Cadivi CV 1.5mm² ruột đồng mềm 99.99%, bọc nhựa PVC cách điện cao cấp.\n- Dẫn điện tốt, an toàn tuyệt đối chống cháy nổ\n- Độ bền cao, tiêu chuẩn TCVN 6610-3 / IEC 60227\n- Phù hợp hệ thống chiếu sáng và công tắc dân dụng',
    description: 'Dây điện đơn Cadivi CV 1.5mm² (Cu/PVC) được sản xuất trên dây chuyền công nghệ hiện đại, ruột dẫn gồm các sợi đồng ủ mềm bện tròn đồng tâm đạt độ tinh khiết 99.99%. Vỏ bọc PVC cách điện chất lượng cao, chịu được điện áp 450/750V và nhiệt độ làm việc dài hạn 70°C. Thích hợp lắp đặt trong hệ thống điện dân dụng và công nghiệp.',
    specs: JSON.stringify({ 'Tiêu chuẩn': 'TCVN 6610-3 / IEC 60227-3', 'Điện áp định mức': '450/750V', 'Ruột dẫn': 'Đồng tinh chất 99.99%', 'Tiết diện': '1.5 mm²', 'Nhiệt độ làm việc': '70°C', 'Xuất xứ': 'Cadivi Việt Nam' }),
    applications: '- Đi dây cấp nguồn cho hệ thống đèn chiếu sáng gia đình, căn hộ, văn phòng.\n- Đấu nối công tắc, ổ cắm phụ và các bảng điện dân dụng.\n- Luồn trong ống ghen PVC âm tường, âm trần hoặc đi nổi an toàn.',
    warranty_policy: '- Bảo hành chính hãng Cadivi 24 tháng theo tiêu chuẩn nhà máy.\n- Cam kết 100% ruột đồng nguyên chất, hoàn tiền 200% nếu phát hiện hàng giả.\n- Đổi mới trong vòng 7 ngày nếu lỗi cách điện hoặc nứt vỏ nhựa do nhà sản xuất.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 1,
    name: 'Dây điện đơn Cadivi CV 2.5 mm² ruột đồng dẫn điện (Cu/PVC)',
    price: 9600,
    original_price: 11000,
    image: '/images/prod-cadivi-red.jpg',
    images: JSON.stringify(['/images/prod-cadivi-red.jpg', '/images/prod-cadivi-thumb-2.jpg', '/images/prod-cadivi-big.jpg']),
    short_desc: 'Dây điện đơn Cadivi 2.5mm² chịu tải cao, chuyên dùng cấp nguồn ổ cắm và thiết bị điện lạnh.\n- Ruột đồng nguyên chất 99.99% dẫn điện tối ưu\n- Vỏ cách điện PVC chịu nhiệt 70°C bền bỉ\n- Đầy đủ chứng nhận CO/CQ từ nhà máy Cadivi',
    description: 'Dây điện Cadivi CV 2.5 mm² là dòng dây điện hạ thế tiêu chuẩn được sử dụng rộng rãi nhất trong các công trình nhà ở, khách sạn và văn phòng. Ruột đồng nguyên chất nhiều sợi bện chặt giúp giảm thiểu suy hao điện áp, đảm bảo an toàn tối đa cho các thiết bị công suất vừa và lớn.',
    specs: JSON.stringify({ 'Tiêu chuẩn': 'TCVN 6610 / IEC 60227', 'Điện áp': '450/750V', 'Ruột dẫn': 'Đồng ủ mềm 99.99%', 'Tiết diện': '2.5 mm²', 'Cách điện': 'PVC cao cấp', 'Xuất xứ': 'Cadivi Việt Nam' }),
    applications: '- Đi dây cấp nguồn cho hệ thống ổ cắm phòng khách, phòng ngủ, nhà bếp.\n- Cấp nguồn cho máy lạnh 1.5HP - 2HP, bình nước nóng gia đình.\n- Lắp đặt cho các tòa nhà căn hộ, biệt thự và nhà xưởng.',
    warranty_policy: '- Bảo hành chính hãng Cadivi 24 tháng.\n- Cam kết chất lượng chính hãng 100% kèm hóa đơn VAT.\n- Hỗ trợ đổi trả miễn phí trong vòng 7 ngày nếu chưa sử dụng.',
    is_new: 1,
    is_promo: 0
  },
  {
    category_id: 1,
    name: 'Dây điện đôi mềm Oval Cadivi VCmd 2x1.5 mm²',
    price: 14500,
    original_price: 16800,
    image: '/images/prod-soft-red.jpg',
    images: JSON.stringify(['/images/prod-soft-red.jpg', '/images/prod-cadivi-thumb-3.jpg']),
    short_desc: 'Dây đôi mềm dẹp Cadivi 2 lõi đồng bọc PVC, chuyên dùng cho thiết bị điện di động.\n- Lõi đồng bện nhiều sợi siêu mềm dẻo, dễ uốn nắn\n- Vỏ PVC màu đỏ hoặc trắng trang nhã, cách điện an toàn\n- Chịu uốn gập liên tục không đứt gãy',
    description: 'Dây điện đôi mềm dẹp Cadivi VCmd 2x1.5 mm² (300/500V) gồm 2 ruột dẫn bằng đồng ủ mềm xoắn nhiều sợi, cách điện và bọc vỏ nhựa PVC phẳng hình oval. Dây có độ mềm dẻo tuyệt vời, rất dễ uốn cong và đấu nối trong không gian hẹp.',
    specs: JSON.stringify({ 'Mã sản phẩm': 'VCmd 2x1.5', 'Điện áp': '300/500V', 'Ruột dẫn': '2 lõi đồng mềm nhiều sợi', 'Tiết diện danh định': '2 x 1.5 mm²', 'Màu vỏ': 'Đỏ / Trắng', 'Hãng sản xuất': 'Cadivi' }),
    applications: '- Làm dây nguồn cắm nối dài cho quạt điện, tivi, máy vi tính và thiết bị văn phòng.\n- Đấu nối đèn bàn, thiết bị chiếu sáng di động trang trí.\n- Dùng trong sửa chữa và lắp ráp thiết bị gia dụng trong nhà.',
    warranty_policy: '- Bảo hành chính hãng 12 tháng.\n- Đổi mới ngay lập tức nếu sản phẩm có lỗi từ nhà sản xuất.',
    is_new: 0,
    is_promo: 1
  },
  {
    category_id: 1,
    name: 'Dây điện đơn LS Vina 4.0 mm² ruột đồng cao cấp',
    price: 16200,
    original_price: 18500,
    image: '/images/prod-ls-yellow.jpg',
    images: JSON.stringify(['/images/prod-ls-yellow.jpg', '/images/prod-day-ls.svg']),
    short_desc: 'Dây điện công nghệ Hàn Quốc LS Vina 4.0mm² chịu tải cực khỏe, ít tỏa nhiệt.\n- Ruột đồng chất lượng cao theo tiêu chuẩn quốc tế KS/IEC\n- Cách điện PVC đặc biệt chống biến dạng khi quá tải nhẹ\n- Thích hợp cấp nguồn trục chính và bếp từ',
    description: 'Dây điện đơn LS-VINA 4.0mm² được chế tạo theo công nghệ hàng đầu của tập đoàn LS Hàn Quốc. Khả năng dẫn dòng lớn, tỷ lệ thất thoát điện cực thấp và lớp cách điện bền bỉ theo năm tháng.',
    specs: JSON.stringify({ 'Tiêu chuẩn': 'IEC 60227 / KS C 8305', 'Điện áp': '450/750V', 'Tiết diện': '4.0 mm²', 'Ruột dẫn': 'Đồng tinh chất', 'Thương hiệu': 'LS-VINA Cable' }),
    applications: '- Đi dây nguồn trục chính từ tủ tổng đến các tủ điện nhánh từng tầng.\n- Cấp nguồn riêng cho bếp từ đôi/ba, lò nướng và máy điều hòa trung tâm.\n- Thi công hệ thống điện cơ quan, xưởng gia công cơ khí nhẹ.',
    warranty_policy: '- Bảo hành chính hãng LS Vina 24 tháng.\n- Đầy đủ chứng chỉ kiểm định chất lượng xuất xưởng.',
    is_new: 0,
    is_promo: 0
  },

  // 2. Dây cáp điện (Cat 2)
  {
    category_id: 2,
    name: 'Cáp điện lực hạ thế Cadivi CXV 3x16 + 1x10 mm² (0.6/1kV)',
    price: 165000,
    original_price: 185000,
    image: '/images/prod-cap-cvv.svg',
    images: JSON.stringify(['/images/prod-cap-cvv.svg', '/images/prod-cvv-black.jpg']),
    short_desc: 'Cáp điện lực 4 lõi đồng hạ thế bọc XLPE/PVC chất lượng số 1 Việt Nam.\n- Cách điện XLPE chịu nhiệt độ ruột dẫn lên tới 90°C\n- Vỏ PVC đen bảo vệ cơ học và chống ẩm xuất sắc\n- Tiêu chuẩn TCVN 5935-1 / IEC 60502-1',
    description: 'Cáp điện lực hạ thế Cadivi CXV 3x16+1x10 mm² ruột đồng, cách điện XLPE, vỏ PVC dùng để truyền tải và phân phối điện áp 0.6/1kV. Cáp có đặc tính cách điện vượt trội, khả năng chịu quá tải cao và tuổi thọ trên 30 năm.',
    specs: JSON.stringify({ 'Tiêu chuẩn': 'TCVN 5935-1 / IEC 60502-1', 'Cấp điện áp': '0.6/1 kV', 'Số lõi': '4 lõi (3 pha + 1 trung tính)', 'Tiết diện': '3x16 + 1x10 mm²', 'Cách điện': 'XLPE', 'Vỏ ngoài': 'PVC màu đen' }),
    applications: '- Cáp ngầm hoặc cáp treo truyền tải điện từ trạm biến áp vào công trình.\n- Cấp nguồn tổng cho tòa nhà, chung cư, nhà máy và khu công nghiệp.\n- Phân phối điện động lực cho hệ thống tủ điện MSB, MDB.',
    warranty_policy: '- Bảo hành chính hãng Cadivi 36 tháng.\n- Đầy đủ chứng chỉ xuất xưởng CO, CQ và biên bản thử nghiệm cao thế.\n- Hỗ trợ kỹ thuật cắt chiều dài theo yêu cầu dự án.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 2,
    name: 'Cáp điện hạ thế Cadivi CVV 2x4.0 mm² ruột đồng bọc PVC',
    price: 38000,
    original_price: 42000,
    image: '/images/prod-cvv-black.jpg',
    images: JSON.stringify(['/images/prod-cvv-black.jpg', '/images/prod-cvv-blue.jpg']),
    short_desc: 'Cáp tròn 2 lõi bọc PVC/PVC chịu lực tốt, truyền tải điện an toàn.\n- Hai lõi đồng tròn bọc cách điện màu riêng biệt (Đỏ/Xanh)\n- Vỏ bọc ngoài PVC đen chống tia cực tím UV ngoài trời\n- Lắp đặt thuận tiện trong nhà và ngoài trời',
    description: 'Cáp điện lực hạ thế CVV 2x4.0 mm² Cadivi có 2 lớp vỏ bảo vệ PVC kép, chống trầy xước và va đập cơ học tốt khi luồn ống hoặc chôn ngầm nông. Ruột đồng tiêu chuẩn cho dòng tải ổn định.',
    specs: JSON.stringify({ 'Cấp điện áp': '0.6/1 kV', 'Số lõi': '2 lõi', 'Tiết diện': '2 x 4.0 mm²', 'Vật liệu': 'Cu / PVC / PVC', 'Hãng sản xuất': 'Cadivi' }),
    applications: '- Cấp nguồn kéo từ công tơ điện chính về tủ điện phân phối gia đình.\n- Cấp nguồn chiếu sáng sân vườn, đèn đường nội khu và cổng ngõ.\n- Đấu nối hệ thống máy bơm chìm, động cơ tưới tiêu nông nghiệp.',
    warranty_policy: '- Bảo hành 24 tháng theo chuẩn Cadivi.\n- Đổi trả linh hoạt trong 7 ngày nếu hàng còn nguyên cuộn.',
    is_new: 0,
    is_promo: 0
  },
  {
    category_id: 2,
    name: 'Cáp chống cháy Cadivi FR-CXV 2x2.5 mm² chịu nhiệt 950°C',
    price: 28500,
    original_price: 32000,
    image: '/images/prod-cvv-blue.jpg',
    images: JSON.stringify(['/images/prod-cvv-blue.jpg', '/images/prod-cadivi-big.jpg']),
    short_desc: 'Cáp chống cháy cao cấp ruột đồng có băng mica chịu nhiệt 950°C trong 3 giờ.\n- Duy trì nguồn điện khi có hỏa hoạn theo tiêu chuẩn BS 6387 CWZ\n- Vỏ bọc ít khói không độc hại LSHF an toàn tính mạng\n- Đáp ứng đầy đủ quy chuẩn PCCC hiện hành',
    description: 'Cáp chống cháy Cadivi FR-CXV được trang bị lớp băng Mica chịu nhiệt cao, kết hợp cách điện XLPE và vỏ bảo vệ chống bắt lửa. Trong điều kiện cháy 950°C, cáp vẫn duy trì dòng điện liên tục suốt 3 giờ để cung cấp cho hệ thống cứu hộ cứu nạn.',
    specs: JSON.stringify({ 'Tiêu chuẩn chống cháy': 'BS 6387 CWZ / IEC 60331', 'Điện áp': '0.6/1 kV', 'Nhiệt độ chịu lửa': '950°C trong 180 phút', 'Tiết diện': '2 x 2.5 mm²', 'Lớp bảo vệ': 'Băng Mica chống cháy + XLPE' }),
    applications: '- Cấp nguồn cho hệ thống báo cháy, chuông còi báo động khẩn cấp.\n- Nguồn cấp thang máy thoát hiểm, quạt hút khói sự cố và bơm cứu hỏa.\n- Hệ thống đèn chiếu sáng sự cố khẩn cấp và biển chỉ dẫn Exit.',
    warranty_policy: '- Bảo hành chính hãng Cadivi 36 tháng.\n- Cung cấp trọn bộ hồ sơ kiểm định PCCC của Cục Cảnh sát PCCC.',
    is_new: 1,
    is_promo: 0
  },

  // 3. Thiết bị điện (Cat 3)
  {
    category_id: 3,
    name: 'Aptomat tự động MCB Schneider Acti9 2P 32A 6kA (A9F74232)',
    price: 185000,
    original_price: 220000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-thiet-bi-dien.jpg']),
    short_desc: 'Cầu dao tự động Schneider Pháp bảo vệ quá tải và ngắn mạch cực nhạy.\n- Dòng cắt định mức 6kA độ bền điện cơ trên 20.000 lần\n- Cửa sổ chỉ thị trạng thái tiếp điểm VisiSafe màu đỏ/xanh\n- Nhựa chống cháy cao cấp, tiếp điểm mạ bạc chống dính',
    description: 'Aptomat MCB Schneider Acti9 iC60N 2P 32A 6kA là giải pháp bảo vệ an toàn hàng đầu thế giới cho hệ thống điện gia đình và công nghiệp. Sản phẩm sở hữu cơ chế dập hồ quang tiên tiến và công nghệ VisiTrip chỉ báo lỗi tức thì.',
    specs: JSON.stringify({ 'Thương hiệu': 'Schneider Electric (Pháp)', 'Mã sản phẩm': 'A9F74232', 'Số cực': '2P', 'Dòng định mức': '32A', 'Dòng cắt ngắn mạch': '6 kA', 'Điện áp': '230/400V AC' }),
    applications: '- Aptomat tổng phân nhánh cho từng tầng nhà ở, căn hộ hoặc văn phòng.\n- Đóng ngắt bảo vệ máy điều hòa công suất lớn, bếp từ, bình nóng lạnh.\n- Lắp đặt trong tủ điện phân phối dân dụng và công nghiệp nhẹ.',
    warranty_policy: '- Bảo hành chính hãng Schneider Electric 24 tháng.\n- 1 đổi 1 trong vòng 30 ngày nếu phát sinh lỗi kỹ thuật từ nhà sản xuất.\n- Hỗ trợ tư vấn thông số tải và kỹ thuật lắp đặt 24/7.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 3,
    name: 'Cầu dao chống giật RCBO Panasonic 2P 32A 30mA (BBDE23231CNV)',
    price: 520000,
    original_price: 590000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-thiet-bi-dien.jpg']),
    short_desc: 'Aptomat chống rò chống giật Panasonic chuẩn Nhật Bản bảo vệ tính mạng gia đình.\n- Tích hợp 3 trong 1: Chống rò điện 30mA, chống quá tải và ngắn mạch\n- Tự động ngắt cực nhanh chỉ trong 0.03 giây khi có dòng rò\n- Nút Test kiểm tra định kỳ tiện lợi, an toàn tuyệt đối',
    description: 'Cầu dao tự động chống rò và ngắn mạch RCBO Panasonic 2P 32A 30mA bảo vệ gia đình toàn diện khỏi các tai nạn giật điện nguy hiểm và sự cố chập cháy. Cơ cấu cảm biến dòng rò siêu nhạy ngắt nguồn trong tích tắc.',
    specs: JSON.stringify({ 'Thương hiệu': 'Panasonic (Nhật Bản)', 'Loại': 'RCBO (Chống giật + Quá tải)', 'Số cực': '2P (1P+N)', 'Dòng định mức': '32A', 'Dòng rò ngắt': '30mA', 'Thời gian ngắt': '< 0.03 giây' }),
    applications: '- Bảo vệ chống giật cho bình nóng lạnh, máy nước nóng trực tiếp phòng tắm.\n- Lắp đặt bảo vệ nhánh ổ cắm phòng trẻ em, phòng bếp và máy giặt.\n- Bảo vệ an toàn chống rò điện cho các thiết bị ngoài trời, hồ bơi.',
    warranty_policy: '- Bảo hành chính hãng Panasonic 24 tháng đổi mới hoàn toàn.\n- Đảm bảo độ chính xác dòng rò 30mA chuẩn an toàn sinh mạng quốc tế.',
    is_new: 1,
    is_promo: 0
  },
  {
    category_id: 3,
    name: 'Aptomat khối MCCB LS 3 Pha 100A 18kA (ABN103c 100A)',
    price: 980000,
    original_price: 1150000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-thiet-bi-dien.jpg']),
    short_desc: 'Aptomat khối MCCB LS công nghiệp Hàn Quốc, sức chịu tải mạnh mẽ.\n- Dòng định mức 100A 3 pha, dòng cắt ngắn mạch 18kA\n- Độ bền cơ học 25.000 lần đóng cắt tin cậy\n- Vỏ đúc Bakelite chịu lực và chịu nhiệt vượt trội',
    description: 'Aptomat khối MCCB LS ABN103c 100A 3P 18kA được thiết kế chuyên dụng cho các tủ điện phân phối tổng công nghiệp, nhà xưởng và tòa nhà thương mại. Thiết kế vỏ đúc chắc chắn, vận hành ổn định trong môi trường khắc nghiệt.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'LS Electric (Hàn Quốc)', 'Model': 'ABN103c 100A', 'Số cực': '3 Pha (3P)', 'Dòng định mức In': '100A', 'Dòng cắt Icu': '18kA tại 380/415V', 'Tiêu chuẩn': 'IEC 60947-2' }),
    applications: '- Cầu dao tổng cho nhà xưởng sản xuất, cơ sở kinh doanh, nhà máy chế biến.\n- Lắp đặt trong tủ phân phối chính MSB cấp nguồn cho hệ thống máy móc 3 pha.\n- Đóng cắt phân phối cho tòa nhà văn phòng, nhà hàng, khách sạn lớn.',
    warranty_policy: '- Bảo hành chính hãng LS Electric 18 tháng.\n- Đầy đủ giấy tờ chứng nhận xuất xứ CO và chứng nhận chất lượng CQ.',
    is_new: 0,
    is_promo: 1
  },
  {
    category_id: 3,
    name: 'Khởi động từ Contactor Schneider LC1D25M7 3P 25A 220V',
    price: 430000,
    original_price: 490000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-thiet-bi-dien.jpg']),
    short_desc: 'Contactor Schneider TeSys D điều khiển động cơ và chiếu sáng tự động.\n- Cuộn hút 220VAC hoạt động êm ái, tiếp điểm bạc chống hồ quang\n- Tích hợp sẵn 1NO + 1NC phụ trợ\n- Dễ dàng kết nối rơ le nhiệt và timer hẹn giờ',
    description: 'Khởi động từ Contactor Schneider LC1D25M7 (TeSys Deca) 3P 25A là thiết bị điều khiển từ xa đáng tin cậy nhất cho các tải động cơ và hệ thống chiếu sáng công suất cao. Tiếp điểm hợp kim bạc độ bền điện cao.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'Schneider Electric', 'Dòng định mức (AC-3)': '25A', 'Công suất động cơ': '11 kW (380V)', 'Điện áp cuộn coil': '220V AC 50/60Hz', 'Tiếp điểm phụ': '1 NO + 1 NC' }),
    applications: '- Điều khiển khởi động và bảo vệ động cơ bơm nước công nghiệp, quạt thông gió.\n- Tự động hóa hệ thống chiếu sáng công cộng, biển quảng cáo ngoài trời.\n- Đấu nối tủ điều khiển máy nén khí, hệ thống sấy và máy công cụ.',
    warranty_policy: '- Bảo hành chính hãng Schneider 24 tháng.\n- 1 đổi 1 trong 15 ngày nếu cuộn coil phát sinh lỗi.',
    is_new: 0,
    is_promo: 0
  },

  // 4. Ổ cắm, công tắc (Cat 4)
  {
    category_id: 4,
    name: 'Bộ công tắc đơn 1 chiều Schneider AvatarOn màu trắng viền mạ',
    price: 68000,
    original_price: 82000,
    image: '/images/prod-cong-tac-don.jpg',
    images: JSON.stringify(['/images/prod-cong-tac-don.jpg', '/images/prod-o-cam-doi.jpg']),
    short_desc: 'Công tắc thiết kế tràn viền phẳng hiện đại phong cách châu Âu.\n- Công nghệ bấm êm ái không gây ồn, độ bền trên 40.000 lần nhấn\n- Mặt phủ bóng chống bám vân tay và chống ố vàng theo thời gian\n- Đèn LED hắt sáng định vị trong đêm sang trọng',
    description: 'Dòng sản phẩm AvatarOn của Schneider Electric mang tính đột phá với thiết kế tràn viền phẳng hoàn toàn, thao tác nhấn cực êm và có thể thay đổi mặt che theo phong cách nội thất cá nhân. Đạt giải thưởng thiết kế quốc tế iF Design Award.',
    specs: JSON.stringify({ 'Thương hiệu': 'Schneider Electric', 'Dòng sản phẩm': 'AvatarOn', 'Màu sắc': 'Trắng bóng (White)', 'Dòng định mức': '16AX 250VAC', 'Độ bền': '40.000 lần bật/tắt', 'Chất liệu': 'Nhựa Polycarbonate cao cấp' }),
    applications: '- Lắp đặt điều khiển đèn cho biệt thự, căn hộ cao cấp, khách sạn và resort.\n- Thi công hệ thống điện âm tường cho văn phòng hiện đại.\n- Thay thế nâng cấp mặt công tắc cũ để tạo vẻ đẹp sang trọng cho ngôi nhà.',
    warranty_policy: '- Bảo hành chính hãng Schneider 10 năm về cơ cấu cơ học.\n- Đổi mới nếu công tắc bị kẹt hạt hoặc gãy chốt trong quá trình sử dụng.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 4,
    name: 'Bộ ổ cắm đôi 3 chấu có màn che an toàn Panasonic Wide Series',
    price: 92000,
    original_price: 110000,
    image: '/images/prod-o-cam-doi.jpg',
    images: JSON.stringify(['/images/prod-o-cam-doi.jpg', '/images/prod-cong-tac-don.jpg']),
    short_desc: 'Ổ cắm đôi 3 chấu Panasonic chuẩn Universal cắm chắc chắn không lỏng lẻo.\n- Màng che bảo vệ chống trẻ nhỏ chọc que vào lỗ điện\n- Chân kẹp đồng đàn hồi cao su đúc nguyên khối chịu tải 16A\n- Nhựa Urea Resin chống cháy nổ tuyệt đối',
    description: 'Ổ cắm đôi 3 chấu có màn che an toàn Panasonic Wide Series (WEV1582-7SW) được tin dùng hàng đầu nhờ độ bền tiếp điểm phi thường. Khả năng giữ phích cắm chặt chẽ, không phát sinh tia lửa điện khi cắm hoặc rút thiết bị công suất lớn.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'Panasonic', 'Dòng sản phẩm': 'Wide Series', 'Số cổng cắm': '2 cổng 3 chấu đa năng', 'Dòng định mức': '16A - 250V', 'Tính năng an toàn': 'Màn che chống giật Shutter', 'Chất liệu': 'Nhựa Urea Resin chống cháy' }),
    applications: '- Hệ thống ổ cắm điện đa năng cho phòng khách, phòng ngủ, phòng làm việc.\n- Cắm các thiết bị công suất cao: Lò nướng, lò vi sóng, bếp điện, nồi chiên.\n- Tương thích tốt với tất cả phích cắm 2 chấu tròn, 2 chấu dẹt và 3 chấu chuẩn Mỹ/Âu/Á.',
    warranty_policy: '- Bảo hành chính hãng Panasonic 24 tháng.\n- Đổi mới trong 7 ngày nếu lỗi chân kẹp tiếp xúc.',
    is_new: 0,
    is_promo: 0
  },
  {
    category_id: 4,
    name: 'Mặt 3 thiết bị kèm 3 công tắc Sino Vanlock S18',
    price: 42000,
    original_price: 50000,
    image: '/images/prod-cong-tac-don.jpg',
    images: JSON.stringify(['/images/prod-cong-tac-don.jpg', '/images/prod-o-cam-doi.jpg']),
    short_desc: 'Bộ công tắc Sino dòng S18 bền bỉ quốc dân, giá thành kinh tế.\n- Hạt công tắc hạt tròn tiếp điểm bạc bật tắt dứt khoát\n- Khung xương kim loại chống cong vênh khi bắt vít vào đế âm\n- Lựa chọn hàng đầu cho các công trình nhà ở và phòng trọ',
    description: 'Bộ mặt 3 công tắc 1 chiều Sino S18 là sản phẩm phổ biến nhất thị trường xây dựng Việt Nam. Với giá thành hợp lý, độ bền bỉ cao và dễ dàng lắp đặt, sản phẩm luôn là sự lựa chọn tối ưu cho các dự án xây dựng dân dụng.',
    specs: JSON.stringify({ 'Thương hiệu': 'Sino - Vanlock', 'Dòng sản phẩm': 'Series S18', 'Cấu hình': 'Mặt 3 lỗ + 3 hạt công tắc 1 chiều', 'Dòng tải': '10A - 250V', 'Xuất xứ': 'Việt Nam' }),
    applications: '- Điều khiển 3 cụm đèn chiếu sáng độc lập trong phòng khách hoặc hành lang.\n- Thi công nhà phố, chung cư bình dân, dãy phòng trọ cho thuê.\n- Thích hợp lắp đặt trên mọi loại đế âm chữ nhật Sino chuẩn.',
    warranty_policy: '- Bảo hành chính hãng Sino 12 tháng.\n- Đổi trả linh hoạt trong 7 ngày.',
    is_new: 0,
    is_promo: 0
  },

  // 5. Phụ kiện điện (Cat 5)
  {
    category_id: 5,
    name: 'Ống luồn dây điện PVC chống cháy Sino Nanoco D20 (Cây 2.92m)',
    price: 25000,
    original_price: 30000,
    image: '/images/prod-ong-luon-pvc.jpg',
    images: JSON.stringify(['/images/prod-ong-luon-pvc.jpg', '/images/prod-mang-cap.svg']),
    short_desc: 'Ống nhựa tròn luồn dây điện cứng chống cháy, chịu lực nén 750N.\n- Chống dập vỡ khi chôn âm tường bê tông hoặc đổ sàn\n- Khả năng tự dập tắt lửa khi nguồn nhiệt rời xa\n- Bề mặt trơn láng kéo dây điện dễ dàng không xước vỏ',
    description: 'Ống luồn dây điện PVC cứng Sino Nanoco D20 (đường kính ngoài 20mm) được sản xuất từ nhựa PVC cao cấp pha phụ gia chống cháy và chống gặm nhấm. Chịu được lực nén cao đến 750N, uốn cong bằng lò xo dễ dàng mà không bị gãy dập.',
    specs: JSON.stringify({ 'Thương hiệu': 'Sino Nanoco', 'Đường kính ngoài': '20 mm (D20)', 'Chiều dài': '2.92 mét/cây', 'Lực nén định mức': '750 N', 'Khả năng chịu nhiệt': '-5°C đến 60°C', 'Chống cháy': 'Tự tắt lửa trong 30 giây' }),
    applications: '- Luồn bảo vệ dây điện chôn âm sàn bê tông, âm tường gạch xây.\n- Đi nổi trên trần thạch cao, tầng hầm để xe và nhà xưởng.\n- Kết hợp cùng các phụ kiện cút nối, tê chia ngả và kẹp đỡ ống D20 đồng bộ.',
    warranty_policy: '- Bảo hành chất lượng vật liệu 24 tháng.\n- Đổi trả nếu ống bị biến dạng nứt gãy trong quá trình giao nhận.',
    is_new: 0,
    is_promo: 1
  },
  {
    category_id: 5,
    name: 'Máng cáp tôn mạ kẽm nhúng nóng 100x50x1.2mm (Cây 2.5m)',
    price: 115000,
    original_price: 135000,
    image: '/images/prod-mang-cap.svg',
    images: JSON.stringify(['/images/prod-mang-cap.svg', '/images/prod-ong-luon-pvc.jpg']),
    short_desc: 'Máng dẫn cáp điện Trunking tôn mạ kẽm dày 1.2mm chịu tải trọng lớn.\n- Bề mặt mạ kẽm chống gỉ sét, chống ăn mòn môi trường\n- Kèm nắp máng bảo vệ ngăn bụi bẩn và côn trùng cắn phá dây\n- Đột lỗ tiếp địa và bắt nối gia cố vững chắc',
    description: 'Máng cáp điện (Cable Trunking) kích thước 100x50mm độ dày 1.2mm chế tạo từ tôn mạ kẽm chất lượng cao. Giúp nâng đỡ và sắp xếp gọn gàng số lượng lớn dây cáp điện trục chính trong công trình.',
    specs: JSON.stringify({ 'Quy cách': 'Rộng 100mm x Cao 50mm', 'Độ dày tôn': '1.2 mm', 'Chiều dài tiêu chuẩn': '2.5 mét/cây', 'Vật liệu': 'Tôn tráng kẽm nhúng nóng', 'Bao gồm': 'Thân máng + Nắp máng + Bulong nối' }),
    applications: '- Đỡ và gom gọn toàn bộ hệ thống cáp điện trục đứng trong tòa nhà cao tầng.\n- Đi cáp treo trần trong siêu thị, trung tâm thương mại và nhà xưởng may.\n- Đảm bảo an toàn kỹ thuật, phòng chống chuột bọ và tăng tính thẩm mỹ.',
    warranty_policy: '- Bảo hành vật liệu 36 tháng không bong tróc lớp mạ kẽm.\n- Đầy đủ giấy chứng nhận xuất xưởng của đơn vị gia công cơ khí.',
    is_new: 1,
    is_promo: 0
  },
  {
    category_id: 5,
    name: 'Tủ điện âm tường chứa 4-8 Aptomat Sino E4FC',
    price: 95000,
    original_price: 115000,
    image: '/images/prod-aptomat-63a.svg',
    images: JSON.stringify(['/images/prod-aptomat-63a.svg', '/images/hd/cat-phu-kien-dien.jpg']),
    short_desc: 'Tủ điện âm tường Sino mặt nhựa cao cấp nắp che trong suốt khói mờ.\n- Đế sắt dập sơn tĩnh điện chống rỉ, gắn thanh ray cài MCB chuẩn Din-rail\n- Chứa vừa từ 4 đến 8 module aptomat đơn\n- Thiết kế phẳng ôm sát mặt tường tinh tế',
    description: 'Hộp chứa cầu dao tủ điện âm tường Sino E4FC nắp mở 180 độ màu trà trong suốt giúp dễ dàng quan sát tình trạng các aptomat bên trong. Thiết kế thẩm mỹ, viền vát cạnh trang nhã phù hợp với mọi không gian phòng ở.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'Sino Electric', 'Mã hiệu': 'E4FC 4/8L', 'Sức chứa': '4 đến 8 cực (module) MCB', 'Kiểu lắp': 'Âm tường', 'Vật liệu': 'Mặt nhựa ABS + Đế sắt sơn tĩnh điện' }),
    applications: '- Làm tủ điện phân phối cho từng tầng nhà phố, từng phòng căn hộ chung cư.\n- Bảo vệ tập trung các aptomat nguồn, aptomat đèn và điều hòa.\n- Dễ dàng thao tác mở nắp kiểm tra hoặc bật tắt cầu dao an toàn.',
    warranty_policy: '- Bảo hành chính hãng 12 tháng.\n- Đổi mới nếu đế tủ bị móp méo hoặc nứt vỡ nắp che.',
    is_new: 0,
    is_promo: 0
  },

  // 6. Đèn chiếu sáng (Cat 6)
  {
    category_id: 6,
    name: 'Máng đèn LED tuýp T8 1.2m 18W Điện Việt ánh sáng trắng 6500K',
    price: 85000,
    original_price: 105000,
    image: '/images/prod-den-led-tuyp.jpg',
    images: JSON.stringify(['/images/prod-den-led-tuyp.jpg', '/images/prod-den-led-a60.jpg']),
    short_desc: 'Máng đèn LED tuýp T8 1.2m 18W sáng rực rỡ, góc chiếu rộng cho văn phòng và nhà xưởng.\n- Chip LED SMD 2835 siêu sáng, khởi động tức thì không nhấp nháy\n- Thân máng nhôm tản nhiệt nhanh, chóa nhựa tán quang chống chói mắt\n- Tiết kiệm 60% điện năng so với bóng huỳnh quang cũ',
    description: 'Bộ máng đèn LED tuýp T8 nhôm Điện Việt chiều dài 1.2m công suất 18W là giải pháp chiếu sáng hiện đại, tiết kiệm điện năng tối đa. Đèn khởi động tức thì không cần tắc te chấn lưu, ánh sáng phân bố đều và êm dịu cho thị giác.',
    specs: JSON.stringify({ 'Công suất': '18W', 'Chiều dài': '1.2 mét (1200mm)', 'Chip LED': 'SMD 2835 siêu sáng', 'Vật liệu': 'Máng nhôm tản nhiệt + Nắp mica tán quang', 'Quang thông': '1900 Lm', 'Bảo hành': '24 tháng đổi mới' }),
    applications: '- Chiếu sáng phòng khách, phòng làm việc, trường học, bệnh viện.\n- Lắp đặt cho xưởng may, xưởng cơ khí, kho bãi lưu trữ hàng hóa.\n- Thay thế hoàn hảo các bộ máng đèn huỳnh quang 36W truyền thống.',
    warranty_policy: '- Bảo hành chính hãng 24 tháng đổi mới.\n- 1 đổi 1 tận nơi nếu bóng bị suy giảm độ sáng bất thường hoặc cháy nguồn driver.',
    is_new: 1,
    is_promo: 1
  },
  {
    category_id: 6,
    name: 'Đèn LED Downlight âm trần Rạng Đông 9W đổi 3 màu (D AT04L 90/9W)',
    price: 110000,
    original_price: 135000,
    image: '/images/prod-den-led-a60.jpg',
    images: JSON.stringify(['/images/prod-den-led-a60.jpg', '/images/prod-den-led-tuyp.jpg']),
    short_desc: 'Đèn âm trần Rạng Đông 3 chế độ màu (Trắng / Vàng / Trung tính) chuyển đổi bằng công tắc.\n- Chip LED Samsung thế hệ mới độ bền 30.000 giờ chiếu sáng\n- Chỉ số hoàn màu CRI > 80 cho màu sắc vật thể trung thực\n- Thân vỏ nhôm đúc tản nhiệt cực êm, lỗ khoét trần tiêu chuẩn 90mm',
    description: 'Đèn LED Downlight đổi màu âm trần Rạng Đông D AT04L 90/9W cho phép thay đổi 3 màu ánh sáng linh hoạt: Trắng 6500K sảng khoái, Vàng 3000K ấm cúng và Trung tính 4000K tự nhiên. Sử dụng chip LED Samsung cao cấp.',
    specs: JSON.stringify({ 'Hãng sản xuất': 'Rạng Đông', 'Model': 'D AT04L ĐM 90/9W', 'Công suất': '9W', 'Lỗ khoét trần': 'Phi 90 mm', 'Nhiệt độ màu': 'Đổi 3 màu (3000K/4000K/6500K)', 'Tuổi thọ': '30.000 giờ' }),
    applications: '- Lắp âm trần thạch cao phòng khách, phòng ngủ, phòng ăn gia đình hiện đại.\n- Trang trí showroom, shop thời trang, quán cafe, khách sạn.\n- Đổi màu ánh sáng linh hoạt tùy theo thời điểm và nhu cầu sinh hoạt.',
    warranty_policy: '- Bảo hành chính hãng Rạng Đông 24 tháng.\n- Đổi mới trực tiếp trong vòng 7 ngày.',
    is_new: 1,
    is_promo: 0
  },
  {
    category_id: 6,
    name: 'Bóng đèn LED Bulb trụ nhôm đúc 30W Điện Việt chống nước bụi IP65',
    price: 75000,
    original_price: 95000,
    image: '/images/prod-den-led-a60.jpg',
    images: JSON.stringify(['/images/prod-den-led-a60.jpg', '/images/prod-den-led-tuyp.jpg']),
    short_desc: 'Bóng đèn búp trụ công suất cao 30W đui xoáy E27 thông dụng, quang thông 3000Lm.\n- Bầu bóng nhựa PC xuyên sáng 92%, góc chiếu rộng 270 độ\n- Đế nhôm nguyên khối đúc cánh tản nhiệt sâu tăng tuổi thọ linh kiện\n- Chống côn trùng bay vào và chống bụi ẩm hiệu quả',
    description: 'Bóng đèn LED búp trụ nhôm đúc 30W Điện Việt mang lại nguồn sáng cực mạnh với góc chiếu rộng 270°. Thiết kế kín khít đạt chuẩn IP65 giúp ngăn bụi, ẩm và côn trùng xâm nhập.',
    specs: JSON.stringify({ 'Công suất': '30W', 'Đui đèn': 'E27 tiêu chuẩn xoắn vặn', 'Quang thông': '3000 Lm', 'Cấp bảo vệ': 'IP65', 'Điện áp': '160 - 240V', 'Vật liệu': 'Nhôm đúc nguyên khối + Nhựa PC' }),
    applications: '- Chiếu sáng sân vườn, cổng ngõ, khu vực ban công ngoài trời.\n- Lắp đặt trong nhà kho, xưởng mộc, gara ô tô, chuồng trại nông nghiệp.\n- Chiếu sáng quầy hàng chợ đêm, ki-ốt bán hàng ngoài trời.',
    warranty_policy: '- Bảo hành chính hãng 12 tháng đổi mới 1-1.',
    is_new: 0,
    is_promo: 0
  }
];

async function seed() {
  console.log('1. Đang xóa toàn bộ sản phẩm cũ trong bảng products...');
  await run('DELETE FROM products');
  try {
    await run("DELETE FROM sqlite_sequence WHERE name = 'products'");
  } catch (e) {}

  console.log('2. Đang thêm 20 sản phẩm mẫu chuẩn Điện Việt...');
  for (const prod of products) {
    const slug = prod.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    await run(`
      INSERT INTO products (
        category_id, name, slug, price, original_price, image, images,
        short_desc, description, specs, applications, warranty_policy, is_new, is_promo, stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `, [
      prod.category_id,
      prod.name,
      slug,
      prod.price,
      prod.original_price,
      prod.image,
      prod.images,
      prod.short_desc,
      prod.description,
      prod.specs,
      prod.applications,
      prod.warranty_policy,
      prod.is_new,
      prod.is_promo
    ]);
  }

  const count = await query('SELECT count(*) as total FROM products');
  console.log('Xong! Tổng số sản phẩm hiện tại trong CSDL:', count[0].total);
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Lỗi khi seed sản phẩm:', err);
    process.exit(1);
  });

