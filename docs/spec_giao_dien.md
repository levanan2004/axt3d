# 3DStore – Spec giao diện (v2, theo bộ 24 màn)

**Nguồn chuẩn:** `giao_dien_24/3D_Print_Store_Codex_UIUX/` (24 PNG ở `02_*`, `03_*`, `04_*` + `05_Specs/mockup_source.html`). Bộ này thay mockup 14 màn cũ. `01_Concept_Boards` chỉ để tham khảo phong cách: chữ/giá trên đó không chính xác và có nhân vật bản quyền, **không lấy theo**.
**Stack:** React Router + TypeScript + Tailwind + shadcn/ui trên Cloudflare (Workers, D1/R2). README trong zip gợi ý Next.js + PostgreSQL → **không theo**, giữ stack của dự án. **Mobile-first.**
"3DStore"/"3D Store" là tên tạm → `<Logo />` (ô vuông cam "3D" + chữ "Store") là component thay được, tên + icon đọc từ config.

**Nguyên tắc cố định (giữ từ v1, ưu tiên hơn mockup khi mâu thuẫn):**
1. Chỉ **1 luồng thanh toán**: cọc 50% tiền hàng qua QR chuyển khoản, phần còn lại + ship thu COD (Viettel Post). Không có lựa chọn "trả toàn bộ trước", ví điện tử hay "COD toàn phần".
2. Tổng tiền luôn **tính**, không hard-code. Giá/phí/tỉ lệ đọc từ `config/shop-config.json` (nguồn `/workspace/web-in-3d/shop-config.json`).
3. Cọc làm tròn **lên** hàng nghìn (`ceilTo1000`). Hạn cọc **30 phút** có đếm ngược. Nội dung CK **`IN3D{mã đơn}`**.
4. Trạng thái đơn phía khách: `cho_coc → da_coc → dang_chuan_bi → da_giao_van_chuyen → hoan_thanh`, + `da_huy`.
5. Không dùng nhân vật/thương hiệu có bản quyền. Chữ cam trên nền trắng phải đạt AA. Logo thay được.

## 1. Design tokens (lấy mẫu từ 24 PNG bằng PIL)

| Token | Hex | Ghi chú |
|---|---|---|
| primary | `#F4511E` (mẫu, khớp README) | nền nút, viền ô tìm kiếm, icon active. Trên trắng **3.48:1 → không đạt AA chữ thường** |
| primary-hover | `#D84315` | hover/pressed |
| primary-text | `#C2410C` | **chữ cam** (giá, link "Xem tất cả →"), 5.18:1 AA |
| primary-light | `#FFF3EE` | nền chip/ô ghi chú cọc/hàng chọn |
| navy | `#152B40` (mẫu) | topline, sidebar admin, nền hero (gradient `#152D42 → #293B49 → #EC7D3B`) |
| text | `#172333` | chữ chính (15.9:1) |
| muted | `#6B7280` | chữ phụ (4.83:1) |
| border | `#E6E9EF` | viền card/input |
| bg | `#F7F8FA` | nền trang; card `#FFFFFF` |
| success | `#00AA48` (mẫu) nền/icon; chữ `#15803D` | đã cọc, đã giao, hoàn tất |
| warning | `#FFCA28` (mẫu, sao rating) nền/icon; chữ `#B45309` | chờ cọc, đếm ngược |
| danger | `#C62828` (mẫu) | in lỗi, đã hủy (5.6:1) |
| info | `#284F6F` (mẫu) | badge "Đang vận chuyển"/"Chờ in" |

Nút primary chữ trắng trên `#F4511E`: chỉ dùng chữ **bold ≥ 16px** (large text ≥3:1). Muốn AA mọi cỡ: nền `#C2410C`.

- **Font:** Be Vietnam Pro (self-host, subset vietnamese+latin, 400/500/600/700/800, `font-display: swap`). Mockup render bằng Arial → thay.
- **Type scale:** xs 12/16 · sm 14/20 · base 16/24 · lg 18/28 · xl 22/28 (tiêu đề section như mockup) · 2xl 26/32 · hero 32 mobile / 40 PC (line-height 1.1, weight 800). Giá card base/700; giá chi tiết 28–32/800.
- **Radius:** 8 (nút, input, ô tìm kiếm) · 12 (card, panel, hero) · full (badge, swatch).
- **Spacing:** 8/12/16/24/32. Padding container 16 mobile / 20 PC. Gap grid 12 mobile / 16 PC.
- **Shadow:** card `0 2px 9px rgb(21 42 56 / .06)`; sticky bar `0 -2px 8px rgb(21 42 56 / .08)`.
- **Breakpoints:** mobile `<768` · tablet `md 768–1023` · laptop `lg 1024–1439` · desktop `xl ≥1440`. **Container max 1320px** (theo bộ mới; v1 là 1280). QA tại 360/375/390/430/768/834/1024/1280/1440/1920, không tràn ngang.

### tailwind.config (theme.extend)
```ts
theme: {
  container: { center: true, padding: { DEFAULT: "1rem", lg: "1.25rem" } },
  screens: { md: "768px", lg: "1024px", xl: "1440px" },
  extend: {
    maxWidth: { content: "1320px" },
    fontFamily: { sans: ['"Be Vietnam Pro"', "system-ui", "sans-serif"] },
    colors: {
      brand: { DEFAULT: "#F4511E", hover: "#D84315", text: "#C2410C", light: "#FFF3EE" },
      navy: { DEFAULT: "#152B40", 600: "#284F6F" },
      ink: "#172333",
      success: { DEFAULT: "#00AA48", text: "#15803D" },
      warning: { DEFAULT: "#FFCA28", text: "#B45309" },
      danger: "#C62828",
      border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))",
      background: "hsl(var(--background))", foreground: "hsl(var(--foreground))",
      primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
      secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
      muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
      accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
      destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
      card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
    },
    borderRadius: { lg: "var(--radius)", md: "8px", sm: "6px" },
    boxShadow: { card: "0 2px 9px rgb(21 42 56 / .06)", bar: "0 -2px 8px rgb(21 42 56 / .08)" },
  },
}
```

### shadcn CSS variables
```css
:root {
  --background: 220 23% 97%;        /* #F7F8FA */
  --foreground: 214 38% 15%;        /* #172333 */
  --card: 0 0% 100%; --card-foreground: 214 38% 15%;
  --popover: 0 0% 100%; --popover-foreground: 214 38% 15%;
  --primary: 14 91% 54%;            /* #F4511E */
  --primary-foreground: 0 0% 100%;
  --secondary: 17 100% 97%;         /* #FFF3EE */
  --secondary-foreground: 17 88% 40%; /* #C2410C */
  --muted: 220 20% 95%; --muted-foreground: 220 9% 46%;
  --accent: 17 100% 97%; --accent-foreground: 17 88% 40%;
  --destructive: 0 66% 47%;         /* #C62828 */
  --destructive-foreground: 0 0% 100%;
  --border: 222 22% 92%; --input: 222 22% 92%;   /* #E6E9EF */
  --ring: 17 88% 40%;
  --radius: 0.75rem;
  --sidebar: 210 51% 17%;           /* #152B40 admin */
}
```

## 2. Component dùng chung

- **Topline (≥1024):** nền navy, chữ 12px `#C6D3DE`: trái "Hỗ trợ khách hàng · Theo dõi đơn hàng", phải "Chính sách giao hàng · Đăng nhập / Đăng ký". Ẩn trên mobile.
- **Header PC:** `<Logo />` | ô tìm kiếm cao 48, viền 2px brand, placeholder "Tìm mô hình, phụ kiện, quà tặng in 3D...", nút "Tìm kiếm" nền brand | icon Yêu thích ♡, Giỏ hàng (badge số), Tài khoản. Dòng menu: **☰ Danh mục · Mô hình 3D · Phụ kiện công nghệ · Đồ trang trí · Quà tặng · Đặt in theo yêu cầu · Khuyến mãi** (active = brand-text).
- **Header mobile:** logo + ♡ + 🛒; dưới là ô tìm kiếm full-width (placeholder ngắn "Tìm mô hình, phụ kiện, quà tặng..."). Trang con: back + tiêu đề.
- **Bottom nav mobile:** 5 tab **Trang chủ · Danh mục · Đặt in · Giỏ hàng · Tài khoản** (cao 56 + safe-area). Ẩn khi có sticky action bar (chi tiết SP, giỏ, checkout, QR) – README yêu cầu nút thanh toán không dính navigation.
- **Sidebar danh mục (PC home):** "Danh mục sản phẩm": Tất cả danh mục, Mô hình in 3D, Phụ kiện công nghệ, Đồ trang trí, Quà tặng cá nhân hóa, Đồ gia dụng, Đặt in theo yêu cầu.
- **Product card:** ảnh 1:1 (mockup dùng emoji → thay ảnh thật WebP), tên 2 dòng `line-clamp-2`, giá `brand-text` bold, dòng "★ 4.9 · 124 đã bán" (sao `warning`, chữ muted).
- **Button:** primary (nền brand, chữ trắng bold), secondary (viền brand, chữ brand-text, ví dụ "＋ Thêm vào giỏ hàng"), gray (`#F2F5F8`/chữ `#293A49`), destructive. Cao **44 mobile / 40 PC**, radius 8, padding 13×22.
- **Badge trạng thái:** pill; màu theo nhóm: warning (chờ cọc/chờ in/chờ kiểm tra), brand-light (đang sản xuất/đã cọc), info (đang vận chuyển), success (đã giao/hoàn tất/đã nhận COD), danger (in lỗi/đã hủy).
- **Quantity stepper:** − 1 ＋, nút 36 (mobile 40), min 1, max tồn kho, `aria-label`.
- **Variant picker:** swatch màu tròn 32 (có tên màu cho a11y), chip kích thước (10cm/15cm/20cm), chip vật liệu (PLA/PETG/TPU); hiển thị "Có sẵn / In theo yêu cầu".
- **Order status stepper (khách):** 6 trạng thái cố định; mockup màn 14/15 có 6 mốc chi tiết hơn → map như sau, mốc phụ hiện làm dòng con có thời gian:

| Trạng thái (enum) | Mốc mockup 14/15 |
|---|---|
| `cho_coc` – Chờ cọc | Đã đặt hàng |
| `da_coc` – Đã cọc | Đã thanh toán cọc 50% |
| `dang_chuan_bi` – Đang chuẩn bị | Đang sản xuất in 3D; Đóng gói và tạo vận đơn |
| `da_giao_van_chuyen` – Đã giao vận chuyển | Viettel Post đang vận chuyển (kèm mã vận đơn) |
| `hoan_thanh` – Hoàn thành | Giao thành công |
| `da_huy` – Đã hủy | (badge danger, dừng stepper) |

  Trạng thái nội bộ admin (sản xuất `QUEUED/PRINTING/QA/REPRINT_REQUIRED/PACKED/READY_TO_SHIP`, vận chuyển, COD) là vòng đời riêng, chỉ hiện ở admin; trạng thái khách được suy ra.
- **PriceSummary:** 1 component + 1 hàm `calcOrderTotals(items, config)` dùng chung FE/BE (mục 4).
- **AdminShell:** sidebar navy 240px, logo "3D Store Admin", menu: Tổng quan, Đơn hàng, Sản phẩm, Sản xuất, Tồn kho, Vận chuyển, Khách hàng, Báo cáo, Nhân viên, Cài đặt (phase 1 chỉ bật Tổng quan, Đơn hàng, Sản phẩm, Cài đặt). KPI card: nhãn, số lớn, delta.

## 3. Spec từng màn (24)

| # | Màn | Phase |
|---|---|---|
| 01–04 | Home Desktop 1440 / Laptop 1280 / Tablet 834 / Mobile 390 | 1 |
| 05–06 | Catalog Desktop / Mobile | 1 |
| 07–08 | Product Desktop / Mobile | 1 |
| 09–10 | Cart Desktop / Mobile | 1 |
| 11–12 | Checkout Desktop / Mobile | 1 |
| 13 | QR Deposit | 1 |
| 14–15 | Tracking Desktop / Mobile | 1 |
| 16–17 | Custom Print Desktop / Mobile | 2 |
| 18 | Admin Dashboard (bản đơn giản) | 1 |
| 19 | Admin Orders | 1 |
| 20 | Admin Production | 3 |
| 21–22 | POS Tablet / Mobile | 3 |
| 23 | Admin Reports | 3 |
| 24 | Vận chuyển & đối soát COD Viettel Post (admin) | 3 |

**01 Home Desktop 1440:** topline + header + menu. Hero 3 cột `245px | 1fr | 245px`, gap 16: sidebar danh mục | hero navy→cam, h ≥292, "Sáng tạo không giới hạn cùng in 3D", phụ "Mô hình · Quà tặng · Phụ kiện · Cá nhân hóa", CTA "Khám phá ngay →" | 3 ô lợi ích: "Đặt in 3D theo yêu cầu – Gửi file và nhận báo giá", "Giao hàng toàn quốc – Viettel Post", "Thanh toán linh hoạt – Cọc 50% · COD còn lại". Section "Gợi ý cho bạn" (10 SP) grid **5 cột**, section "Sản phẩm cá nhân hóa" (5 SP).
**02 Home Laptop 1280:** như 01, grid **4 cột** (chính xác hơn: 5 nếu container ≥1240 không có sidebar; mockup hiển thị 5 – chấp nhận 4–5), cột lợi ích có thể thu 220px.
**03 Home Tablet 834:** ẩn sidebar danh mục (thay bằng hàng chip/icon danh mục cuộn ngang), hero full-width, lợi ích thành 3 ô ngang dưới hero, grid **3 cột**. Menu ngang cuộn được hoặc gom vào ☰.
**04 Home Mobile 390:** header mobile + ô tìm kiếm; hero full-width (chữ 32); lợi ích xếp dọc/2 cột; grid **2 cột**; bottom nav.
**05 Catalog Desktop:** breadcrumb "Trang chủ › Mô hình 3D"; sidebar "Bộ lọc sản phẩm" 260px: Danh mục (Mô hình động vật, Mô hình trang trí, **Mô hình nhân vật & fantasy** – đổi từ "Mô hình anime", Phụ kiện 3D), Khoảng giá (Dưới 50.000đ / 50.000–100.000đ / 100.000–200.000đ / Trên 200.000đ – mốc đọc từ config), Màu sắc (swatch), Vật liệu (PLA, PETG, TPU). Đầu list: "Mô hình 3D · 120 sản phẩm" + tab sắp xếp Phổ biến / Mới nhất / Bán chạy / Giá ↑↓ + "Sắp xếp ▼". Grid **4 cột** (có sidebar), phân trang.
**06 Catalog Mobile:** tiêu đề + số SP; thanh sticky: [Bộ lọc] mở Sheet từ dưới (cùng nội dung sidebar, nút "Áp dụng"), chip sắp xếp cuộn ngang; grid **2 cột**.
**07 Product Desktop:** breadcrumb; 2 cột: gallery (ảnh chính 1:1 + 5 thumbnail) | "Rồng 3D khớp động nhiều màu", "★★★★★ 4.9 · 124 đánh giá · Đã bán 350+", giá 89.000đ, Màu sắc, Kích thước (10/15/20cm – giá theo biến thể nếu khác), Số lượng, "Có sẵn / in theo yêu cầu", nút **＋ Thêm vào giỏ hàng** (secondary) + **Mua ngay** (primary); dải cam kết "In 3D chất lượng · Viettel Post toàn quốc · Cọc 50% · COD phần còn lại". Dưới: Mô tả (ví dụ "Thời gian in dự kiến 1–3 ngày…" – số ngày lấy từ dữ liệu SP).
**08 Product Mobile:** ảnh carousel 1:1, info xếp dọc, mô tả accordion; **sticky bottom bar** [Thêm vào giỏ] [Mua ngay] flex-1 h-44 + safe-area; ẩn bottom nav.
**09 Cart Desktop:** "Giỏ hàng (3 sản phẩm)"; 2 cột 8/4: list item (checkbox, ảnh, tên, biến thể "Màu: Đỏ · Kích thước: 15cm", đơn giá, stepper, xóa) | "Tóm tắt đơn hàng" sticky: Tạm tính (n sản phẩm) = Σ, Mã giảm giá, Phí vận chuyển "Tính khi đặt hàng" (hoặc phí flat từ config), Tổng tiền hàng, nút "Tiến hành thanh toán", ghi chú cọc 50%. Ví dụ mockup 89.000 + 59.000 + 39.000 = 187.000đ ✔.
**10 Cart Mobile:** item dạng card; **sticky bar**: chọn tất cả | Tổng (tính) | "Thanh toán (n)".
**11 Checkout Desktop:** stepper 1 Giỏ hàng — 2 Thanh toán — 3 Hoàn tất. 2 cột: Địa chỉ nhận hàng (card + Thay đổi; form địa chỉ cho khách mới) · Đơn vị vận chuyển: Viettel Post "Giao toàn quốc · Thu COD còn lại", phí từ config · **Thanh toán: chỉ 1 dòng thông tin cố định** "Cọc 50% tiền hàng qua chuyển khoản QR, phần còn lại COD khi nhận" (không radio; **bỏ "Thanh toán toàn bộ trước – Không thu COD"** của mockup). Cột phải sticky: PriceSummary (mục 4) + `<DepositPolicyNote />` + nút "Đặt hàng & thanh toán cọc".
**12 Checkout Mobile:** các section xếp dọc; **sticky bar**: "Cọc ngay: 94.000đ" + dòng nhỏ "COD khi nhận: …" + nút "Đặt hàng".
**13 QR Deposit:** card giữa (max 560): "Thanh toán đặt cọc đơn hàng", Mã đơn, QR VietQR (~240px, nút "Lưu ảnh QR" trên mobile), số tiền cọc lớn, ngân hàng/STK/chủ TK (copy), **Nội dung chuyển khoản `IN3D{mã đơn}`** (copy; mockup ghi `3DS20261024001` → sửa), **đếm ngược 30:00** (warning, `aria-live` mỗi phút; hết hạn → đơn `da_huy`/hết hạn + nút đặt lại), nút **"Đã chuyển khoản, kiểm tra ngay"** chỉ refresh trạng thái (không tự xác nhận; chỉ webhook SePay hợp lệ mới chuyển `da_coc`), ghi chú "Hệ thống xác nhận tự động khi nhận giao dịch hợp lệ". Bên cạnh/dưới: PriceSummary rút gọn. Nhãn "QR minh họa" chỉ có ở mockup, không đưa lên production. Mobile: cùng nội dung 1 cột.
**14 Tracking Desktop:** breadcrumb "Tài khoản › Đơn hàng › mã"; tiêu đề "Đơn hàng #mã" + badge; 2 cột: stepper dọc 6 mốc có thời gian | "Thông tin vận chuyển": Viettel Post, Mã vận đơn, **Tiền COD còn lại** (từ PriceSummary), Trạng thái, link "Xem trên Viettel Post"; khối Sản phẩm. Truy cập qua tài khoản hoặc link có token (không lộ dữ liệu theo mã đoán được).
**15 Tracking Mobile:** 1 cột: badge + stepper → vận chuyển → sản phẩm.
**16 Custom Print Desktop (phase 2):** "Đặt in 3D theo yêu cầu – Gửi mẫu thiết kế, chọn chất liệu và nhận báo giá trước khi thanh toán." 3 cột/3 bước: **1. Thông tin yêu cầu** (Tên sản phẩm/dự án, Mô tả, Liên hệ SĐT/email) · **2. File và thông số in** (dropzone "Kéo thả file STL / 3MF vào đây", giới hạn dung lượng từ config, Vật liệu select, Màu sắc) · **3. Nhận báo giá** (giải thích + checklist Duyệt thiết kế → Xác nhận giá & thời gian → Đặt cọc 50% → In và giao Viettel Post). Nút "Gửi yêu cầu báo giá". Sau khi admin báo giá, khách duyệt → vào cùng luồng cọc QR (màn 13). Upload vào R2 qua presigned URL, kiểm tra đuôi/kích thước/MIME.
**17 Custom Print Mobile (phase 2):** 3 bước xếp dọc (hoặc wizard 1/3–3/3), nút gửi sticky dưới.
**18 Admin Dashboard (phase 1 = bản đơn giản):** "Tổng quan kinh doanh" + ngày; phase 1 chỉ: KPI đếm đơn theo trạng thái (Chờ cọc, Đã cọc, Đang chuẩn bị, Đang giao) + bảng "Đơn hàng gần đây". Phase 3: KPI doanh thu/COD chưa đối soát, chart "Doanh thu 7 ngày", khối "Quản lý tại một nơi".
**19 Admin Orders (phase 1):** "Quản lý đơn hàng"; tab lọc (Tất cả, Chờ cọc, Đã cọc, Đang chuẩn bị, Đang giao, Hoàn thành, Đã hủy – thay bộ tab mockup để khớp enum), ô tìm (mã đơn/tên/SĐT), "Xuất CSV"; bảng Mã đơn | Khách | Kênh (Online/POS) | Giá trị | Trạng thái (badge) | "Chi tiết →". Chi tiết đơn: item, PriceSummary, lịch sử cọc (giao dịch SePay), đổi trạng thái, nhập mã vận đơn.
**20 Admin Production (phase 3):** KPI + "Hàng đợi in 3D" (Mã phiếu, SP/vật liệu, Thời gian ước tính, Máy in, Trạng thái: Chờ in/Đang in/Chờ kiểm tra/In lỗi/Hoàn tất, Thao tác), nút "＋ Tạo phiếu sản xuất", khối quy trình (Đã nhận cọc → Chờ in → Đang in → QA → Đóng gói → Sẵn sàng giao → Tạo vận đơn).
**21 POS Tablet (phase 3):** 1024×768, 2 panel: header "3D Store POS · Nhân viên · Quầy", ô "Tìm sản phẩm / quét mã SKU", grid SP 3–4 cột | "Giỏ hàng tại quầy (n)", stepper, Tổng tiền (tính), chọn Tiền mặt / QR chuyển khoản, "Hoàn tất thanh toán" (h-48). Tap ≥48.
**22 POS Mobile (phase 3):** 1 cột, grid 2 cột, giỏ thành sheet/sticky bar tổng + nút thanh toán.
**23 Admin Reports (phase 3):** doanh thu theo nguồn (Website/Quầy/Bán sỉ), chi phí & dòng tiền, COD chờ đối soát; quy tắc "không cộng tiền cọc và COD hai lần".
**24 Vận chuyển & đối soát COD Viettel Post (phase 3, ADMIN):** đã kiểm tra – đây **là màn admin**, không phải phương thức thanh toán của khách. KPI Chờ đóng gói / Sẵn sàng tạo vận đơn / Đang giao / COD chờ nhận; bảng Đơn | Mã VTP | COD cần thu | Trạng thái | Đối soát (Chưa đối soát / Chờ chuyển tiền / Đã nhận COD) | Xem →. Chỉ tạo vận đơn khi đã đóng gói. COD cần thu lấy từ `calcOrderTotals`.

## 4. Logic tiền (bắt buộc)

Config (`config/shop-config.json`): `deposit.rate 0.5`, `deposit.rounding "ceilTo1000"`, `shipping.flatFee 20000` (placeholder, **chờ An chốt**), `payment.transferContentPattern "IN3D{orderCode}"`, `payment.depositExpiryMinutes 30`.

PriceSummary hiển thị đúng 3 dòng chính (+ dòng phí ship và tổng khách trả làm thông tin phụ):
1. **Tiền hàng** = Σ(đơn giá × SL) (sau giảm giá nếu có)
2. **Cọc 50% tiền hàng (trả ngay qua QR)** = `ceil(tiền hàng × rate / 1000) × 1000`
   → ngay dưới: `<DepositPolicyNote />` – slot 1–2 dòng chính sách hoàn cọc (nội dung Nhất gửi sau, để trong config/CMS)
3. **COD khi nhận** = tiền hàng − cọc + phí ship

Ví dụ:
- Giỏ mockup 187.000đ, ship config 20.000 → cọc **94.000** (93.500 làm tròn lên), COD 93.000 + 20.000 = **113.000đ**, tổng 207.000đ.
- Nếu ship 25.000 như mockup → cọc 94.000, COD **118.000đ** (mockup ghi 93.500/118.500 – sai quy tắc làm tròn, sửa).
- 148.000 + ship 20.000 → cọc 74.000, COD 94.000.

Server tính lại khi tạo đơn, không tin số client; định dạng `Intl.NumberFormat('vi-VN')` + "đ". Xác nhận cọc theo `confirmRule`: số tiền ≥ cọc và nội dung chứa mã đơn; idempotent theo `sepay.transactionId`.

## 5. SEO / Accessibility

- Thay toàn bộ emoji placeholder bằng ảnh thật **WebP/AVIF** (Cloudflare Images, `srcset`, width/height cố định); `loading="lazy"` dưới fold, ảnh hero/ảnh chính SP `fetchpriority="high"`; icon dùng bộ SVG thống nhất (lucide) thay ký tự ⌂ ▦ 🛒.
- `alt` mô tả ("Rồng khớp động in 3D nhựa PLA màu đỏ"); ảnh trang trí `alt=""`; icon-only button có `aria-label`.
- Focus: `focus-visible:ring-2 ring-ring ring-offset-2`, không bỏ outline.
- Contrast: chữ cam `#C2410C`; `#F4511E` chỉ cho nền nút/viền/icon; chữ trên badge success/warning dùng tông đậm (`#15803D`, `#B45309`); chữ trắng trên hero gradient phần cam phải kiểm tra (đặt chữ ở phần navy).
- Swatch màu có tên; tap target ≥44 (POS ≥48); đếm ngược `aria-live="polite"`.
- SEO: `meta()` mỗi route, slug không dấu, JSON-LD `Product` + `BreadcrumbList`, `lang="vi"`, SSR trên Workers; trang chính sách (giao hàng, đổi trả/hoàn cọc, bảo mật, điều khoản) có link ở footer.

## 6. Phase

- **Phase 1:** 01–15 + 18 (đơn giản) + 19; admin thêm/sửa sản phẩm + danh sách đơn/đổi trạng thái; luồng cọc QR (SePay webhook) + COD.
- **Phase 2:** 16–17 Đặt in theo yêu cầu (upload STL/3MF lên R2, admin báo giá, khách duyệt, rồi cọc).
- **Phase 3:** 20 Sản xuất, 21–22 POS, 23 Báo cáo, 24 Vận chuyển & đối soát COD Viettel Post (API VTP), cùng KPI/chart của 18.

## 7. Lỗi / điểm cần sửa trong bộ mockup mới

1. **Màn 11/12:** có lựa chọn "Thanh toán toàn bộ trước – Không thu COD" → xung đột luồng duy nhất, bỏ.
2. **Màn 11/12/13/14/24:** cọc 93.500đ / COD 118.500đ không làm tròn lên nghìn → 94.000 / 118.000 (ship 25k) hoặc 94.000 / 113.000 (ship 20k config). Ship 25.000 trong mockup ≠ placeholder 20.000 của config.
3. **Màn 13:** nội dung CK `3DS20261024001` → phải là `IN3D{mã đơn}`; không có đếm ngược 30 phút; không có nút "Đã chuyển khoản, kiểm tra ngay" → bổ sung.
4. **Mã đơn không thống nhất:** `3DS-20261024-001` (13/14) vs `3DS001` (18/24) vs `3DS-001` (19) → chốt 1 định dạng (đề xuất ngắn, chỉ chữ+số để nhét vào `IN3D{mã}`, ví dụ `IN3D` + `A7K2Q9`).
5. **Trạng thái không khớp enum:** tab màn 19 ("Chờ thanh toán", "Đã giao", "Hoàn tất") và dashboard ("Đã đặt cọc") → dùng 6 trạng thái chuẩn.
6. **Màn 05 filter "Mô hình anime"** → đổi "Mô hình nhân vật & fantasy".
7. **Concept boards (01_Concept_Boards):** có nhân vật bản quyền (Pikachu, Gundam, Baby Groot, mèo máy kiểu Doraemon, mô hình kiểu siêu xe/lâu đài phim) và lựa chọn "Ví điện tử (Momo, ZaloPay)", tổng giỏ concept 02 mobile đọc như 158.000đ trong khi 89.000 + 79.000 = 168.000đ (chữ nhỏ, không chắc). → Chỉ tham khảo phong cách, không dùng ảnh/chữ. 24 PNG chính dùng emoji placeholder, **không có nhân vật bản quyền**.
8. Dashboard 3DS002 = 158.000đ nhưng màn 19 3DS-002 = 159.000đ (dữ liệu giả, chỉ cần dữ liệu thật nhất quán).
9. README zip đề xuất Next.js + PostgreSQL và container 1320–1440 → giữ stack RR + Cloudflare; container 1320.
10. Chữ đọc được: toàn bộ 24 màn đọc được (đối chiếu `mockup_source.html`); riêng chữ trên concept boards nhiều chỗ không đọc chính xác.
