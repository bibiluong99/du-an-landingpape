# KẾ HOẠCH TỐI ƯU HÓA SEO TOÀN DIỆN (SEO MASTER PLAN)
**Dự án**: Website Landing Page & Catalog Bán Hàng B2B/B2C — **Công ty TNHH Điện Việt**
**Mục tiêu**: Tăng thứ hạng từ khóa tự nhiên trên Google (Thiết bị điện, Dây cáp điện Cadivi, Aptomat Schneider/Panasonic...), hiển thị Rich Snippets (Giá tiền, Còn hàng) trên kết quả tìm kiếm và hiển thị thẻ xem trước (Preview Card) đẹp mắt khi chia sẻ link qua Zalo / Facebook.

---

## 1. Đánh giá hiện trạng SEO (SEO Audit)

| Hạng mục SEO | Hiện trạng trong Source Code | Mức độ ưu tiên |
| :--- | :--- | :---: |
| **Title & Meta Description trang chủ/danh mục** | Mới chỉ có `<title>`, thiếu `<meta name="description">`, `<meta name="keywords">`, `<link rel="canonical">`. | 🔴 Cao |
| **OpenGraph & Zalo/Facebook Preview (`og:*`)** | Chưa có `og:title`, `og:description`, `og:image`, `og:type`. Gửi link qua Zalo/Messenger chưa hiện ảnh và giá sản phẩm. | 🔴 Cao |
| **SSR SEO Động cho Chi tiết Sản phẩm & Blog** | `/product-detail?id=X` và `/blog-detail?id=Y` đang dùng `<title>` cố định và đợi JS ở trình duyệt tải xong mới gắn dữ liệu (Client-Side Rendering). Bot Zalo/Facebook và Crawler không đọc được thông tin từng sản phẩm. | 🔴 Cao |
| **Dữ liệu có cấu trúc (Schema.org JSON-LD)** | Chưa có Schema `Organization`, `LocalBusiness`, `Product` (hiển thị giá bán VNĐ trên Google), `Article`, và `BreadcrumbList`. | 🔴 Cao |
| **Sitemap động (`/sitemap.xml`) & `/robots.txt`** | Chưa có route sinh tự động `sitemap.xml` và `robots.txt` từ cơ sở dữ liệu Turso Cloud. | 🟠 Trung bình - Cao |
| **Tối ưu hình ảnh & Tốc độ tải (Core Web Vitals)** | Đã tích hợp **Cloudinary CDN** (tự động nén `q_auto,f_auto`). Cần bổ sung thêm `loading="lazy"` và `alt` chuẩn từ khóa cho ảnh danh sách. | 🟠 Trung bình |
| **URL thân thiện (Clean Slug URLs)** | Đang dùng query `/product-detail?id=1`, nên hỗ trợ song song cả URL dạng `/san-pham/day-dien-cadivi-cv-1-5-1` để tối ưu từ khóa trên thanh địa chỉ. | 🟡 Nâng cao |

---

## 2. Lộ trình Triển khai Kỹ thuật (4 Giai đoạn)

### Giai đoạn 1: Server-Side Injection (SSR SEO Động) trong `src/utils/ssr.js`
Nâng cấp hàm `servePageWithBanner(res, fileName, ...)` nhận thêm `req` để tự động bơm (inject) bộ thẻ Meta chuẩn SEO vào trong `<head>` trước khi trả HTML về trình duyệt:

1. **Với các trang chính (`/`, `/products`, `/about`, `/blogs`, `/contact`)**:
   - Tự động gắn `<title>`, `<meta name="description">`, `<link rel="canonical">`.
   - Tự động gắn bộ thẻ **OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`)** sử dụng Banner/Logo từ Cloudinary CDN.
2. **Với trang Chi tiết Sản phẩm (`/product-detail?id=:id`)**:
   - Truy vấn nhanh sản phẩm từ **Turso DB** theo `req.query.id` ngay trên Server.
   - Bơm trực tiếp vào `<head>`:
     - `<title>[Tên sản phẩm] - Giá chính hãng tốt nhất | Điện Việt</title>`
     - `<meta name="description" content="[Mô tả ngắn sản phẩm] - Cam kết chính hãng 100%, đầy đủ CO/CQ, giao hàng toàn quốc.">`
     - `<meta property="og:title" content="[Tên sản phẩm] - Giá: [Giá VNĐ]">`
     - `<meta property="og:image" content="[Link ảnh sản phẩm Cloudinary]">`
   - Bơm sẵn tên sản phẩm vào thẻ `<h1>` và mô tả vào HTML để Googlebot đọc được 100% nội dung mà không cần chờ JavaScript.
3. **Với trang Chi tiết Tin tức (`/blog-detail?id=:id`)**:
   - Truy vấn bài viết từ **Turso DB** theo `req.query.id`.
   - Bơm `<title>[Tiêu đề bài viết] | Điện Việt</title>`, `<meta name="description" content="[Tóm tắt bài viết]">`, `<meta property="og:image" content="[Ảnh bài viết]">` và nội dung bài viết vào HTML.

---

### Giai đoạn 2: Tích hợp Schema.org JSON-LD (Google Rich Snippets)
Tự động sinh thẻ `<script type="application/ld+json">` ngay từ Server (`src/utils/ssr.js`) cho từng loại trang:

1. **Trang chủ (`/`) & Liên hệ (`/contact`) — Schema `Organization` & `HardwareStore` / `LocalBusiness`**:
   - Khai báo tên Công ty TNHH Điện Việt, Logo, Hotline, Email, Địa chỉ, Giờ làm việc, Link Zalo/Facebook/Shopee.
2. **Trang Chi tiết Sản phẩm (`/product-detail`) — Schema `Product` + `BreadcrumbList`**:
   ```json
   {
     "@context": "https://schema.org/",
     "@type": "Product",
     "name": "Dây điện đơn ruột đồng Cadivi CV 1.5 mm² (Cu/PVC)",
     "image": ["https://res.cloudinary.com/..."],
     "description": "Dây điện đơn Cadivi CV 1.5mm² ruột đồng mềm 99.99%...",
     "brand": { "@type": "Brand", "name": "Điện Việt" },
     "offers": {
       "@type": "Offer",
       "priceCurrency": "VND",
       "price": "5800",
       "availability": "https://schema.org/InStock"
     }
   }
   ```
   *(Giúp Google hiển thị trực tiếp **Giá bán: 5.800 ₫ • Còn hàng** ngay dưới tiêu đề tìm kiếm).*
3. **Trang Chi tiết Blog (`/blog-detail`) — Schema `NewsArticle` / `BlogPosting`**:
   - Khai báo tiêu đề, tác giả, ngày đăng (`datePublished`), ảnh đại diện và đơn vị xuất bản.

---

### Giai đoạn 3: Hệ thống `/sitemap.xml` và `/robots.txt` Tự Động
Thêm 2 route đặc biệt trong `src/routes/pageRoutes.js`:

1. **`GET /robots.txt`**:
   - Cho phép mọi Search Engine (`User-agent: *`, `Allow: /`) quét toàn bộ các trang bán hàng.
   - Chặn quét trang quản trị (`Disallow: /admin`, `Disallow: /login`, `Disallow: /api/`).
   - Trỏ đường dẫn tới `Sitemap: https://<domain>/sitemap.xml`.
2. **`GET /sitemap.xml`**:
   - Tự động truy vấn danh sách toàn bộ **Danh mục đang bật**, **Sản phẩm đang hiển thị (`is_active = 1`)** và **Bài viết Blog** từ **Turso Cloud DB**.
   - Xuất ra chuẩn XML Sitemap với `lastmod`, `changefreq` và `priority` (`1.0` cho trang chủ, `0.9` cho trang sản phẩm, `0.8` cho từng sản phẩm & bài viết).
   - Mỗi khi Admin thêm sản phẩm mới hoặc viết bài blog mới, Sitemap tự động cập nhật theo thời gian thực.

---

### Giai đoạn 4: Quản trị SEO trong Admin CMS & Tối ưu On-Page
1. **Cấu hình SEO tổng quát trong trang Admin (`/admin` ➔ Cấu hình Website)**:
   - Cho phép Admin tùy chỉnh: `Meta Title mặc định`, `Meta Description trang chủ`, `Từ khóa SEO (Keywords)` và `Ảnh chia sẻ mạng xã hội (OG Image)` nếu muốn thay đổi.
2. **Tối ưu thẻ Semantic HTML & Hình ảnh**:
   - Đảm bảo mỗi trang có duy nhất 1 thẻ `<h1>` chứa từ khóa chính.
   - Bổ sung `loading="lazy"` và `decoding="async"` cho toàn bộ ảnh danh sách sản phẩm và tin tức để tăng điểm **Google PageSpeed / Lighthouse**.
   - Hỗ trợ URL thân thiện có chứa `slug` (ví dụ: `/product-detail?id=1&slug=day-dien-don-ruot-dong-cadivi-cv-1-5-mm2`).

---

## 3. Kết quả đạt được sau khi triển khai
- **Chia sẻ link qua Zalo / Facebook / Messenger**: Hiển thị ngay khung thẻ lớn với Ảnh nét từ Cloudinary + Tiêu đề sản phẩm + Giá bán + Mô tả chuyên nghiệp.
- **Trên Google Search**: Đạt chuẩn Rich Results (hiển thị giá sản phẩm VNĐ, tình trạng Còn hàng, đường dẫn Breadcrumb).
- **Tự động Index**: Sẵn sàng nộp `/sitemap.xml` lên **Google Search Console** để Google tự động thu thập toàn bộ sản phẩm và bài viết tư vấn kỹ thuật.

