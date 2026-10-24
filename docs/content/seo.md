# SEO

Quy ước: `{TEN_SHOP}` thường ngắn. Nếu title dài hơn 60 ký tự sau khi thay biến, cắt tên sản phẩm/danh mục trước, giữ `| {TEN_SHOP}` ở cuối. Meta description cắt ở 155 ký tự theo ranh giới từ. Mọi trang có canonical tuyệt đối `https://{TEN_MIEN}{path}` (bỏ query lọc/sắp xếp/phân trang ở canonical, trừ `?page=` từ trang 2 trở đi giữ chính nó).

## 1. Theo route

### `/` Trang chủ
- Title: `{TEN_SHOP} – Mô hình, quà tặng và in 3D theo yêu cầu`
- Meta: `Shop đồ in 3D: mô hình, móc khóa tên, chậu cây mini, phụ kiện bàn làm việc. Nhận in theo file STL/3MF. Cọc 50%, phần còn lại COD.`
- H1: `Đồ in 3D làm tại xưởng, giao toàn quốc`
- OG title: `{TEN_SHOP} – Đồ in 3D và in theo yêu cầu`
- OG description: `Mô hình, quà tặng, phụ kiện in 3D. Gửi file để nhận báo giá in riêng. Giao Viettel Post, thu COD phần còn lại.`

### `/danh-muc/[slug]`
- Title: `{tenDanhMuc} in 3D | {TEN_SHOP}` (trang 2+: `{tenDanhMuc} in 3D – Trang {n} | {TEN_SHOP}`)
- Meta: `{tenDanhMuc} in 3D bằng nhựa PLA/PETG, nhiều màu và kích thước. Xem giá, chọn mẫu, cọc 50% qua QR, nhận hàng trả phần còn lại.`
- H1: `{tenDanhMuc}`
- OG title: `{tenDanhMuc} in 3D – {TEN_SHOP}`
- OG description: dùng 155 ký tự đầu của đoạn giới thiệu danh mục trong `trang_chu_danh_muc.md`.

### `/san-pham/[slug]`
- Title: `{tenSanPham} | {TEN_SHOP}`
- Meta: `{moTaNgan}` (mô tả ngắn của sản phẩm, ≤155 ký tự). Nếu trống: `{tenSanPham} in 3D, chất liệu {chatLieu}. Giá {gia}. Cọc 50% qua QR, nhận hàng trả phần còn lại.`
- H1: `{tenSanPham}`
- OG title: `{tenSanPham}`
- OG description: như meta. OG image: ảnh chính sản phẩm 1200×1200 hoặc 1200×630. `og:type = product`.

### `/gio-hang`
- Title: `Giỏ hàng | {TEN_SHOP}`
- Meta: `Xem lại sản phẩm trong giỏ hàng trước khi đặt.`
- H1: `Giỏ hàng`
- OG: không cần (trang noindex).

### `/thanh-toan`
- Title: `Thanh toán | {TEN_SHOP}`
- Meta: `Nhập địa chỉ nhận hàng, cọc 50% tiền hàng qua QR, phần còn lại trả khi nhận.`
- H1: `Thanh toán`
- OG: không cần (noindex). Trang QR cọc dùng cùng quy tắc, title `Chuyển khoản cọc đơn {maDon} | {TEN_SHOP}`.

### `/theo-doi-don`
- Title: `Theo dõi đơn hàng | {TEN_SHOP}`
- Meta: `Tra trạng thái đơn bằng mã đơn và số điện thoại đặt hàng.`
- H1: `Theo dõi đơn hàng`
- OG title: `Theo dõi đơn hàng – {TEN_SHOP}`; OG description như meta.

### `/dat-in`
- Title: `In 3D theo yêu cầu từ file STL, 3MF | {TEN_SHOP}`
- Meta: `Tải file STL hoặc 3MF, chọn nhựa và màu, xem giá tạm tính ngay. Shop gửi báo giá chính thức, bạn duyệt rồi mới cọc 50%.`
- H1: `In 3D theo yêu cầu`
- OG title: `In 3D theo yêu cầu – {TEN_SHOP}`
- OG description: `Gửi file STL/3MF, nhận báo giá trước khi trả tiền. In PLA, PETG, TPU, resin. Giao Viettel Post toàn quốc.`

### Trang pháp lý
| Route | Title | Meta | H1 |
|---|---|---|---|
| `/dieu-khoan` | `Điều khoản sử dụng | {TEN_SHOP}` | `Điều kiện mua hàng, đặt cọc, đặt in theo yêu cầu và trách nhiệm của hai bên khi mua tại {TEN_SHOP}.` | `Điều khoản sử dụng` |
| `/chinh-sach-bao-mat` | `Chính sách bảo mật | {TEN_SHOP}` | `{TEN_SHOP} thu thập dữ liệu gì, dùng để làm gì, giữ bao lâu và quyền của bạn theo Nghị định 13/2023/NĐ-CP.` | `Chính sách bảo mật` |
| `/doi-tra-hoan-tien` | `Đổi trả và hoàn tiền | {TEN_SHOP}` | `Khi nào được đổi trả, khi nào hoàn cọc, dung sai của hàng in 3D và cách gửi yêu cầu.` | `Chính sách đổi trả và hoàn tiền` |
| `/van-chuyen` | `Chính sách vận chuyển | {TEN_SHOP}` | `Giao hàng toàn quốc qua Viettel Post, thu COD phần còn lại, được xem hàng trước khi trả tiền.` | `Chính sách vận chuyển` |

OG cho trang pháp lý: OG title = title bỏ `| {TEN_SHOP}`, OG description = meta.

## 2. JSON-LD

### Organization (đặt ở layout gốc, mọi trang)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "{TEN_SHOP}",
  "url": "https://{TEN_MIEN}/",
  "logo": "https://{TEN_MIEN}/logo.png",
  "email": "{EMAIL}",
  "telephone": "{SDT}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{DIA_CHI}",
    "addressCountry": "VN"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "{SDT}",
    "email": "{EMAIL}",
    "contactType": "customer service",
    "availableLanguage": "vi"
  }
}
```

### Product (trang `/san-pham/[slug]`)
Một sản phẩm nhiều biến thể có giá khác nhau thì dùng `AggregateOffer` (lowPrice/highPrice). Không thêm `aggregateRating`/`review` khi chưa có đánh giá thật lưu trong D1.
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{tenSanPham}",
  "description": "{moTaNgan}",
  "image": ["{anh1Url}", "{anh2Url}"],
  "sku": "{sku}",
  "brand": { "@type": "Brand", "name": "{TEN_SHOP}" },
  "material": "{chatLieu}",
  "category": "{tenDanhMuc}",
  "offers": {
    "@type": "Offer",
    "url": "https://{TEN_MIEN}/san-pham/{slug}",
    "priceCurrency": "VND",
    "price": "{gia}",
    "availability": "https://schema.org/{InStock|OutOfStock|PreOrder}",
    "itemCondition": "https://schema.org/NewCondition",
    "seller": { "@type": "Organization", "name": "{TEN_SHOP}" }
  }
}
```
`availability`: còn tồn kho → `InStock`; hết hàng nhưng in theo đơn → `PreOrder`; ngừng bán → `OutOfStock`. `price` là số nguyên, không dấu chấm.

### BreadcrumbList
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": "https://{TEN_MIEN}/" },
    { "@type": "ListItem", "position": 2, "name": "{tenDanhMuc}", "item": "https://{TEN_MIEN}/danh-muc/{slugDanhMuc}" },
    { "@type": "ListItem", "position": 3, "name": "{tenSanPham}" }
  ]
}
```
Trang danh mục chỉ có 2 mục. FAQPage JSON-LD nằm trong `trang_chu_danh_muc.md`.

## 3. robots.txt
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /pos
Disallow: /thanh-toan
Disallow: /gio-hang
Disallow: /theo-doi-don
Disallow: /api/
Disallow: /*?*sort=
Disallow: /*?*filter=

Sitemap: https://{TEN_MIEN}/sitemap.xml
```
Thêm `<meta name="robots" content="noindex, nofollow">` cho `/gio-hang`, `/thanh-toan`, trang QR, `/theo-doi-don`, trang báo giá đặt in riêng của khách, `/admin`, `/pos`. robots.txt chỉ chặn crawl, thẻ meta mới chặn index.

## 4. Sitemap
- Route `/sitemap.xml` sinh từ D1 mỗi lần gọi (cache ngắn ở edge).
- Gồm: `/`, `/dat-in`, mọi `/danh-muc/[slug]` có ít nhất 1 sản phẩm đang bán, mọi `/san-pham/[slug]` đang hiển thị, 4 trang pháp lý.
- Không gồm: sản phẩm ẩn/nháp, trang lọc/sắp xếp, giỏ, thanh toán, theo dõi đơn, admin, POS, trang báo giá riêng.
- `lastmod` = `updated_at` của sản phẩm/danh mục; trang pháp lý = `{NGAY_HIEU_LUC}` hoặc lần sửa gần nhất.
- Có `<image:image>` cho ảnh chính sản phẩm. Quá 50.000 URL thì tách sitemap index (khó xảy ra).
- Slug: chữ thường, không dấu, nối bằng `-` (ví dụ `rong-khop-dong`). Đổi slug thì redirect 301 từ slug cũ.

## 5. Từ khóa mục tiêu theo danh mục
Dùng tự nhiên trong H1, đoạn giới thiệu, mô tả. Không nhồi.

| Danh mục (slug gợi ý) | Từ khóa chính | Từ khóa phụ |
|---|---|---|
| Nhân vật & Fantasy (`nhan-vat-fantasy`) | mô hình in 3D | rồng khớp động, mô hình rồng in 3D, đồ chơi in 3D khớp động, mô hình fantasy |
| Quà tặng cá nhân hóa (`qua-tang-ca-nhan-hoa`) | quà tặng in 3D | móc khóa tên in 3D, quà tặng khắc tên, quà sinh nhật handmade in 3D |
| Phụ kiện công nghệ (`phu-kien-cong-nghe`) | phụ kiện in 3D | giá đỡ điện thoại in 3D, kệ tai nghe in 3D, giá đỡ máy tính bảng |
| Đồ trang trí (`do-trang-tri`) | đồ trang trí in 3D | đèn ngủ in 3D, đồ trang trí bàn làm việc, decor bàn in 3D |
| Cây & nhà cửa (`cay-nha-cua`) | chậu cây in 3D | chậu cây mini in 3D, chậu sen đá in 3D, đồ gia dụng in 3D |
| Văn phòng phẩm (`van-phong-pham`) | hộp đựng bút in 3D | ống cắm bút in 3D, khay để bàn, phụ kiện bàn học |
| In theo yêu cầu (`/dat-in`) | in 3D theo yêu cầu | dịch vụ in 3D, in 3D file STL, in 3D giá rẻ (chỉ dùng nếu đúng), báo giá in 3D, in 3D PLA PETG |

## 6. Mẫu alt ảnh
- Ảnh sản phẩm: `{tenSanPham} in 3D nhựa {chatLieu} màu {mau}` + góc chụp nếu là ảnh phụ: `– mặt sau`, `– cận cảnh khớp`, `– đặt trên bàn`.
  Ví dụ: `Rồng khớp động in 3D nhựa PLA màu đỏ – cận cảnh khớp`.
- Ảnh danh mục: `Các mẫu {tenDanhMuc} in 3D`.
- Ảnh hero/trang trí không mang thông tin: `alt=""`.
- Ảnh QR cọc: `Mã QR chuyển khoản cọc đơn {maDon}`.
- Logo: `{TEN_SHOP}`.
- Không viết "hình ảnh của...", không nhồi từ khóa, không quá ~125 ký tự.
