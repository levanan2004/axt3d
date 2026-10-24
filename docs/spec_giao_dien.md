# 3DStore – Spec giao diện (v1)

Stack: React Router + TypeScript + Tailwind + shadcn/ui, deploy Cloudflare. **Mobile-first**. Màu lấy mẫu từ mockup bằng PIL.
"3DStore" chỉ là tên tạm → logo là component `<Logo />` thay được (tên + icon đọc từ config).

## 1. Design tokens

| Token | Hex | Dùng cho |
|---|---|---|
| primary | `#F06D19` (mẫu từ mockup) | nút, nền badge, icon active |
| primary-hover | `#D9580F` | hover/pressed |
| primary-text | `#C2410C` | **chữ cam trên nền trắng** (giá, link) – 5.18:1 đạt AA |
| primary-light | `#FFF1E8` | nền nhạt: chip chọn, banner, hàng được chọn |
| text | `#132130` (mẫu từ mockup) | chữ chính (16.3:1) |
| muted | `#6B7280` | chữ phụ, đã bán, placeholder |
| border | `#E5E7EB` | viền card/input |
| bg | `#F8F9FA` (mẫu) | nền trang; card `#FFFFFF` |
| success | `#16A34A` | đã cọc, hoàn thành |
| warning | `#D97706` | chờ cọc, đếm ngược |
| danger | `#DC2626` | đã hủy, lỗi, xóa |

**Tương phản:** `#F06D19` trên trắng = **3.04:1 → KHÔNG đạt AA** cho chữ thường. Chỉ dùng làm nền nút với chữ trắng cỡ ≥ 16px đậm (đạt mức large text 3:1) hoặc icon. Giá/link chữ cam dùng `#C2410C`. Nút primary chữ trắng: nên dùng chữ bold 16px; nếu muốn chắc chắn AA mọi cỡ thì nền nút `#C2410C`.

- **Font:** Be Vietnam Pro (Google Fonts, subset `vietnamese,latin`, weight 400/500/600/700, `font-display: swap`).
- **Type scale (mobile → PC):** xs 12/16 · sm 14/20 · base 16/24 · lg 18/28 · xl 20/28 · 2xl 24/32 · 3xl 30/36 (tiêu đề hero PC 36–40/44). Giá trong card: base/700; giá ở chi tiết SP: 2xl→3xl/700.
- **Radius:** sm 6 · md 8 (input, nút) · lg 12 (card) · xl 16 (sheet, banner) · full (badge, avatar).
- **Spacing:** thang 4px Tailwind; padding trang 16 (mobile) / 24 (PC); gap grid 12 mobile / 16–20 PC.
- **Shadow:** card `0 1px 2px rgb(16 24 40/.06)`; hover card `0 4px 12px rgb(16 24 40/.08)`; sticky bar `0 -2px 8px rgb(16 24 40/.08)`.
- **Breakpoints:** mobile `<768` · tablet `md: 768–1023` · desktop `lg: ≥1024`; container max **1320px**.

### tailwind.config (theme.extend)
```ts
theme: {
  container: { center: true, padding: { DEFAULT: "1rem", lg: "1.5rem" }, screens: { "2xl": "1320px" } },
  extend: {
    fontFamily: { sans: ['"Be Vietnam Pro"', "system-ui", "sans-serif"] },
    colors: {
      brand: { DEFAULT: "#F06D19", hover: "#D9580F", text: "#C2410C", light: "#FFF1E8" },
      ink: "#132130", muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
      success: "#16A34A", warning: "#D97706", danger: "#DC2626",
      border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))",
      background: "hsl(var(--background))", foreground: "hsl(var(--foreground))",
      primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
      secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
      destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
      card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
    },
    borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 4px)", sm: "calc(var(--radius) - 6px)", xl: "16px" },
    boxShadow: { card: "0 1px 2px rgb(16 24 40 / .06)", "card-hover": "0 4px 12px rgb(16 24 40 / .08)", bar: "0 -2px 8px rgb(16 24 40 / .08)" },
  },
}
```

### shadcn CSS variables (globals.css)
```css
:root {
  --background: 210 17% 98%;      /* #F8F9FA */
  --foreground: 211 43% 13%;      /* #132130 */
  --card: 0 0% 100%;  --card-foreground: 211 43% 13%;
  --popover: 0 0% 100%; --popover-foreground: 211 43% 13%;
  --primary: 23 88% 52%;          /* #F06D19 */
  --primary-foreground: 0 0% 100%;
  --secondary: 23 100% 95%;       /* #FFF1E8 */
  --secondary-foreground: 17 88% 40%; /* #C2410C */
  --muted: 220 14% 96%;  --muted-foreground: 220 9% 46%;
  --accent: 23 100% 95%; --accent-foreground: 17 88% 40%;
  --destructive: 0 72% 51%; --destructive-foreground: 0 0% 100%;
  --border: 220 13% 91%; --input: 220 13% 91%;
  --ring: 17 88% 40%;
  --radius: 0.75rem;
}
```

## 2. Component dùng chung

- **Header PC (≥1024):** sticky top, cao 64, nền trắng, viền dưới. Trái `<Logo />`; giữa ô tìm kiếm (flex-1, max 560, nút kính lúp cam bên phải); phải icon Tài khoản, Giỏ hàng (badge số lượng đỏ/cam). Dòng 2: menu danh mục ("Danh mục" + các mục: Mô hình 3D, Phụ kiện, Quà tặng, Đồ trang trí, Phim/Anime*, Đồ chơi…). *Đổi tên mục "Phim/Anime" — đề xuất "Nhân vật & Fantasy".
- **Header mobile:** cao 56: logo + icon tìm kiếm/giỏ; trang con: nút back + tiêu đề + icon giỏ.
- **Bottom nav mobile (<768):** fixed bottom, cao 56 + `env(safe-area-inset-bottom)`, 5 tab: **Trang chủ · Danh mục · Yêu thích · Giỏ hàng · Tài khoản** (icon + nhãn 11–12px; active = brand). Ẩn trên trang có sticky action bar (chi tiết SP, giỏ, thanh toán) để tránh 2 thanh chồng nhau.
- **Product card:** ảnh **1:1** `object-cover` bo lg; tên **2 dòng** `line-clamp-2` (sm/500); giá `text-brand-text font-bold`; dòng phụ: ★ rating + "Đã bán N" (xs muted). Badge góc ảnh (Mới / -x%). Cả card là 1 link; nút yêu thích là button riêng có `aria-label`.
- **Button:** primary = nền brand, chữ trắng bold; secondary = viền brand, chữ `brand-text`, nền trắng (hover `brand-light`); ghost; destructive. Cao **44 mobile / 40 PC** (`h-11 lg:h-10`), radius md. Disabled: opacity 50%, loading: spinner + giữ chiều rộng.
- **Badge:** pill radius full, xs/600: brand-light/brand-text (mặc định), success, warning, danger, neutral (muted).
- **Quantity stepper:** [−] số [+], mỗi nút 36×36 (mobile 40×40), min 1, max = tồn kho; input số `inputmode="numeric"`; `aria-label` "Giảm/Tăng số lượng".
- **Order status stepper:** các trạng thái **Chờ cọc → Đã cọc → Đang chuẩn bị → Đã giao vận chuyển → Hoàn thành**; **Đã hủy** là trạng thái kết thúc riêng (hiển thị badge danger, stepper xám, dừng ở bước bị hủy). PC: dọc kèm thời gian (màn 12) hoặc ngang (màn 9 checkout steps); mobile: dọc. Done = success, hiện tại = brand, chưa tới = border. Enum dùng chung FE/BE: `cho_coc | da_coc | dang_chuan_bi | da_giao_van_chuyen | hoan_thanh | da_huy`.
- **PriceSummary:** component duy nhất tính tiền (xem mục 4), dùng ở giỏ, thanh toán, QR, đơn hàng.

## 3. Spec từng màn

1. **Trang chủ PC:** header; hàng trên: sidebar danh mục (240px) | banner hero ("Sáng tạo cùng in 3D", CTA primary) | cột 3 ô dịch vụ (Đặt in 3D theo yêu cầu, Giao hàng toàn quốc, Thanh toán an toàn). Section "Gợi ý cho bạn" + link "Xem tất cả": grid **5 cột** (lg), 4 cột (md).
2. **Trang chủ mobile:** header 56; banner full-width radius xl; hàng icon danh mục cuộn ngang (5 icon); "Gợi ý cho bạn" grid **2 cột**, gap 12; bottom nav.
3. **Danh mục PC:** breadcrumb; sidebar filter 260px (Danh mục checkbox + số lượng, Lọc theo giá, Màu sắc swatch, Vật liệu PLA/PETG/ABS); tiêu đề "Mô hình 3D (N sản phẩm)" + Sắp xếp (select); grid **4 cột** (≥1280 có thể 5); phân trang/“Xem thêm”.
4. **Danh mục mobile:** header back + tiêu đề + số SP; ô tìm kiếm; thanh chip sticky dưới header (Bộ lọc → mở Sheet bottom, Phổ biến, Giá, Mới nhất); grid **2 cột**; bottom nav.
5. **Chi tiết SP PC:** 2 cột: gallery (thumbnail dọc 64px + ảnh chính 1:1) | thông tin: tên 2xl, rating/đã bán, giá 3xl brand-text, chọn màu (swatch tròn 32, có viền khi chọn + tên màu), số lượng, 2 nút **Thêm vào giỏ (secondary)** + **Mua ngay (primary)**; dải cam kết (in theo yêu cầu, giao toàn quốc, đổi trả 7 ngày). Dưới: Tabs (Mô tả, Thông số, Đánh giá, Hỏi đáp).
6. **Chi tiết SP mobile:** ảnh carousel full-width 1:1 + chấm chỉ số; info xếp dọc; tabs dạng accordion. **Sticky bottom bar** (fixed, shadow bar, safe-area): [Thêm vào giỏ] [Mua ngay] mỗi nút flex-1, cao 44. Ẩn bottom nav.
7. **Giỏ hàng PC:** 2 cột 8/4: bảng item (checkbox, ảnh 64, tên + phân loại, đơn giá, stepper, thành tiền, xóa) + "Chọn tất cả"; cột phải sticky top 80: Tóm tắt đơn (PriceSummary) + nút "Thanh toán", ô mã giảm giá.
8. **Giỏ hàng mobile:** list item dạng card (ảnh 72, tên, giá, stepper, xóa); **sticky bottom bar**: checkbox tất cả | Tổng cộng (**tính từ item, ví dụ 148.000đ**) | nút "Thanh toán (n)".
9. **Thanh toán PC:** stepper ngang (Giỏ hàng → Thanh toán → Hoàn tất); 2 cột 8/4: Địa chỉ nhận hàng (card, nút Thay đổi), Vận chuyển (đơn vị + phí từ config), **Phương thức thanh toán: chỉ 1 luồng** – "Cọc 50% qua chuyển khoản QR, phần còn lại COD" (hiển thị dạng thông tin, không phải radio nhiều lựa chọn; **bỏ "Viettel Post COD"**). Cột phải sticky: PriceSummary 3 dòng + slot chính sách hoàn cọc + nút "Đặt hàng & thanh toán cọc".
10. **Thanh toán mobile:** các section xếp dọc như PC; **sticky bottom bar**: "Cọc ngay: 74.000đ" (lớn) + dòng nhỏ "COD khi nhận: …" + nút "Đặt hàng".
11. **Thanh toán QR PC:** 2 cột: trái card QR (VietQR, ~240px), số tiền cọc lớn, ngân hàng/STK/chủ TK (nút copy), **nội dung CK `IN3D{mã đơn}`** (nút copy), **đếm ngược 30:00** (warning; hết giờ → đơn chuyển "Đã hủy"/hết hạn, hiện nút đặt lại); nút **"Đã chuyển khoản, kiểm tra ngay"** chỉ gọi refresh trạng thái đơn (không tự đánh dấu đã cọc), có loading + thông báo "Chưa nhận được, thử lại sau ít phút". Phải: Thông tin đơn + PriceSummary. Mobile: xếp dọc, QR trên cùng, thêm nút "Lưu ảnh QR".
12. **Theo dõi đơn PC:** tiêu đề "Đơn hàng #mã" + badge trạng thái; 2 cột: Order status stepper dọc (có thời gian, mã vận đơn khi "Đã giao vận chuyển") | thông tin đơn (item, PriceSummary, đã cọc/còn COD, địa chỉ). Mobile: 1 cột.
13. **Admin dashboard PC (phase sau cho phần biểu đồ):** sidebar tối `#132130` 240px; KPI cards 4 cột (doanh thu, đơn, khách, …); chart doanh thu 7 ngày; bảng đơn gần đây.
14. **POS tablet (phase sau):** 2 cột 8/4: grid SP 4 cột (tablet) với ô tìm/quét mã | panel đơn hiện tại: item + stepper, Tổng tiền, chọn Tiền mặt/Chuyển khoản, nút "Thanh toán" lớn (h-12). Tap target ≥ 48.

## 4. Sửa bắt buộc (logic tiền)

- **Lỗi mockup màn 8:** tổng hiển thị 748.000đ nhưng 89.000 + 59.000 = **148.000đ**. Tổng **luôn tính** từ item (`Σ đơn giá × số lượng` của item được chọn), không hard-code ở UI.
- Mọi giá/phí đọc từ config `config/shop-config.json` (nguồn `/workspace/web-in-3d/shop-config.json`): phí ship placeholder **20.000đ**, tỉ lệ cọc 0.5, thời hạn cọc 30 phút, prefix nội dung CK `IN3D`, thông tin ngân hàng, tên shop/logo.
- **PriceSummary hiển thị 3 dòng:**
  1. **Tiền hàng** = Σ item
  2. **Cọc 50% tiền hàng (trả ngay qua QR)** = `ceil(tiền hàng × 0.5 / 1000) × 1000` (làm tròn **lên** hàng nghìn)
     → ngay dưới: slot ghi chú ngắn chính sách hoàn cọc (`<DepositPolicyNote />`, nội dung Nhất gửi sau; để text trong config/CMS).
  3. **COD khi nhận** = tiền hàng − cọc + phí ship
- Ví dụ (ship 20.000 theo config): hàng 148.000 → cọc 74.000, COD 74.000 + 20.000 = **94.000đ**. (Với ship 30.000: COD 104.000đ.) Ví dụ làm tròn: hàng 149.000 → cọc 75.000, COD 74.000 + ship.
- Tính tiền ở 1 hàm thuần dùng chung FE/BE (`calcOrderTotals`); server tính lại khi tạo đơn, không tin số từ client. Định dạng `Intl.NumberFormat('vi-VN')` + "đ".

## 5. SEO / Accessibility

- `alt` mô tả mọi ảnh SP ("Mô hình rồng khớp động in 3D màu đỏ"); ảnh trang trí `alt=""`.
- Ảnh **WebP** (AVIF nếu được) qua Cloudflare Images/`srcset`, khai báo `width/height` hoặc aspect-ratio để tránh CLS; `loading="lazy"` cho ảnh dưới fold, ảnh hero/ảnh chính SP `fetchpriority="high"`.
- Focus rõ: `focus-visible:ring-2 ring-ring ring-offset-2` cho mọi phần tử tương tác; không bỏ outline.
- Contrast AA: chữ cam dùng `#C2410C` (5.18:1); `#F06D19` (3.04:1) chỉ cho nền nút/icon. Muted `#6B7280` trên trắng 4.8:1 OK.
- Tap target ≥ 44px; swatch màu có tên (aria-label + text), không chỉ dựa vào màu; đếm ngược có `aria-live="polite"` (cập nhật mỗi phút, không mỗi giây).
- SEO: mỗi route có `meta()` title/description; URL slug tiếng Việt không dấu (`/san-pham/rong-khop-dong`); JSON-LD `Product` (giá, rating) trên chi tiết SP; breadcrumb `BreadcrumbList`; `lang="vi"`; SSR qua React Router trên Workers.

## 6. Phase

- **Phase 1:** màn 1–12 (mobile + PC), luồng cọc QR + COD, theo dõi đơn; **Admin tối giản**: thêm/sửa sản phẩm (ảnh, giá, màu, tồn kho) + danh sách đơn & đổi trạng thái (theo enum mục 2), xác nhận đã cọc.
- **Sau:** Admin dashboard (KPI, biểu đồ – màn 13), POS tablet (màn 14), mã giảm giá, yêu thích đồng bộ tài khoản, đánh giá/hỏi đáp.

## 7. Ghi chú nội dung mockup cần thay

- Ảnh/tên SP mẫu dùng nhân vật có bản quyền (**Pikachu, Bulbasaur, Goku, "Mô hình Pokémon"**) → thay bằng thiết kế gốc (vd. "Rồng khớp động", "Mèo phi hành gia", "Khủng long chibi", "Chậu cây hình mây").
- Danh mục "Phim/Anime" → đổi tên (đề xuất "Nhân vật & Fantasy").
- Bỏ lựa chọn "Viettel Post COD" riêng ở màn 9/10.
- "3DStore" là tên tạm: không hard-code trong text/ảnh, lấy từ config.

## 8. Phase 2 — Đặt in theo file (màn 16 và 17)

Nguồn tiền: mọi số và công thức đọc từ `config/shop-config.json` → `customPrint`. Không viết cứng giá vật liệu, phí hoàn thiện, phí thiết kế, hệ số gấp, hay cách làm tròn. Các khóa `customPrint.upload.maxFileMB`, `customPrint.upload.maxFiles`, `customPrint.upload.allowedExt`, `customPrint.colors`, `customPrint.maxQty` chủ shop sẽ chốt sau. Khi khóa vắng hoặc `null`, code dùng mặc định kỹ thuật được ghi rõ `DEFAULT_PENDING_OWNER` (không coi đó là giá bán).

Container trang **1320px**. Chữ cam trên nền trắng dùng `#C2410C`. Font Be Vietnam Pro. Icon dùng lucide. Ảnh sản phẩm chưa có thì dùng placeholder, không dùng nhân vật có bản quyền. Màn có thanh hành động dính đáy thì ẩn bottom nav.

### Màn 16 — Form yêu cầu (mobile trước, rồi PC)

- Route `/dat-in-3d`.
- Khách nhập họ tên, số điện thoại, ghi chú.
- Tải một hoặc nhiều file **STL/3MF** lên R2. Kiểm tra phía server (không tin extension của trình duyệt):
  - đuôi file thuộc `allowedExt` (mặc định kỹ thuật `stl`, `3mf` nếu config null);
  - dung lượng từng file ≤ `maxFileMB`, số file ≤ `maxFiles`;
  - nội dung: STL ASCII phải có `solid` và `endsolid`/`facet`; STL nhị phân phải có kích thước `84 + số mặt * 50`; 3MF phải là ZIP (`PK`).
- Chọn vật liệu, màu (swatch có tên), số lượng (1…`maxQty`), hoàn thiện, tùy chọn thiết kế giúp, tùy chọn làm gấp.
- Cột tóm tắt hiện **ước tính** tính bằng `customPrint.formula` (cùng hàm với admin). Ghi rõ đây là ước tính, cửa hàng sẽ chốt.
- Thanh dưới dính (mobile): nút gửi yêu cầu. Ẩn bottom nav.

### Màn 17 — Báo giá đã gửi

- Route `/bao-gia/:code`, chỉ người giữ cookie yêu cầu (hoặc tra bằng mã + số điện thoại) xem được.
- Khi chưa gửi giá: trạng thái đang chờ cửa hàng.
- Khi đã gửi: hiện số tiền đã chốt, nút chấp nhận. Chấp nhận tạo đơn `cho_coc` và chuyển sang luồng QR/cọc hiện có (`IN3D{mã đơn}`, cọc theo `calcOrderTotals` trên tiền hàng đã chốt). Đơn in theo yêu cầu không trừ tồn kho catalog.

### Sáu trạng thái báo giá

Đọc từ `customPrint.quoteStatuses`:

1. `moi_yeu_cau` — khách vừa gửi
2. `dang_bao_gia` — admin đang tính
3. `da_gui` — đã gửi giá cho khách
4. `da_chap_nhan` — khách chấp nhận, đã tạo đơn `cho_coc`
5. `tu_choi` — khách từ chối
6. `het_han` — quá hạn trong `customPrint.quoteExpiryHours` mà chưa chấp nhận

### Admin báo giá

- Danh sách và màn chi tiết trong khu quản trị (Cloudflare Access, hoặc local auth khi chạy máy).
- Giá gợi ý = đánh giá `customPrint.formula` với biến lấy từ vật liệu, hoàn thiện, số lượng, cờ thiết kế và cờ gấp trong config.
- Admin được sửa giá. Nếu giá khác kết quả công thức thì bắt buộc có lý do. Mỗi lần lưu ghi log (ai, giá công thức, giá chốt, lý do, thời điểm).
- Chỉ trạng thái `da_gui` mới cho khách chấp nhận.

### Phase 3 (không thuộc màn 16/17)

POS (`/pos`), sản xuất, báo cáo, đối soát COD và Viettel Post làm sau, đọc `pos`, `codReconciliation`, `reports`, `shipping.carrier`. `carrierCodFeeRate: null` thì đối soát gắn cờ đúng chuỗi `needs fee config`, không tính phí bằng 0. Viettel Post chỉ bật khi `shipping.carrier.apiEnabled` và không có credential trong repo; mặc định nhập mã vận đơn tay.
