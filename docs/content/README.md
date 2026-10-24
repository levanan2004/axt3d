# Nội dung web in 3D (copy, SEO, pháp lý)

Thư mục này chứa toàn bộ chữ tiếng Việt cho web: trang khách, đặt in theo yêu cầu, admin, POS, SEO và các trang pháp lý. Teammate chép vào repo tại `docs/content/`.

## 1. An cần điền trước khi lên web

Tìm và thay toàn bộ các chuỗi sau (tìm theo dấu `{`):

| Placeholder | Điền gì | Dùng ở |
|---|---|---|
| `{TEN_SHOP}` | Tên shop hiển thị | mọi file |
| `{TEN_MIEN}` | Tên miền, không có `https://`, ví dụ `vidu.vn` | seo.md, pháp lý |
| `{CHU_SHOP}` | Tên chủ thể: họ tên cá nhân hoặc tên hộ kinh doanh | footer, pháp lý |
| `{LOAI_CHU_THE}` | "Cá nhân kinh doanh" hoặc "Hộ kinh doanh" | footer, pháp lý |
| `{SO_DKKD}` | Số giấy chứng nhận đăng ký hộ kinh doanh (nếu có) hoặc mã số thuế cá nhân | footer, pháp lý |
| `{NGAY_CAP_DKKD}` / `{NOI_CAP_DKKD}` | Ngày cấp, nơi cấp số trên | footer, pháp lý |
| `{DIA_CHI}` | Địa chỉ liên hệ/kinh doanh | footer, pháp lý, JSON-LD |
| `{SDT}` | Số điện thoại/Zalo hỗ trợ | footer, pháp lý, JSON-LD |
| `{EMAIL}` | Email hỗ trợ | footer, pháp lý |
| `{SO_NGAY_GIU_FILE}` | Số ngày giữ file STL/3MF sau khi đơn xong rồi xóa | bao_mat.md, dieu_khoan.md, dat-in |
| `{SO_NGAY_DOI_TRA}` | Số ngày nhận yêu cầu đổi trả kể từ khi nhận hàng | doi_tra_hoan_tien.md, FAQ |
| `{SO_NGAY_HOAN_TIEN}` | Số ngày làm việc để shop hoàn tiền sau khi xác nhận | doi_tra_hoan_tien.md |
| `{NGAY_HIEU_LUC}` | Ngày các chính sách có hiệu lực (dd/mm/yyyy) | 4 trang pháp lý |
| `{LINK_DA_THONG_BAO_BCT}` | Link xác nhận "Đã thông báo Bộ Công Thương" (có sau khi khai trên online.gov.vn) | footer |

Các con số tiền và thời gian **không** điền tay. Chúng lấy từ `config/shop-config.json`. Trong file nội dung, chỗ cần số được viết dạng `{config.duong.dan}`, ví dụ `{config.payment.depositExpiryMinutes}` (30 phút), `{config.customPrint.quoteValidHours}`. Coder thay bằng giá trị đọc từ config lúc render. Các chuỗi động khác: `{maDon}`, `{tienCoc}`, `{tienCOD}`, `{tenSanPham}`... là biến từ dữ liệu đơn/sản phẩm.

Việc An còn phải chốt (đang tạm trong config): phí ship (cố định hay theo bảng Viettel Post, có miễn ship không), phí thu hộ COD theo hợp đồng Viettel Post, giá nhựa/giá máy của dịch vụ đặt in.

## 2. Danh sách file và cách dùng

| File | Nội dung | Coder dùng thế nào |
|---|---|---|
| `seo.md` | Title, meta, H1, OG cho từng route; JSON-LD Organization/Product/BreadcrumbList; robots.txt; quy tắc sitemap; từ khóa; mẫu alt ảnh | Đưa vào hàm `meta()` của từng route, component JSON-LD, file `public/robots.txt`, route `sitemap.xml` |
| `trang_chu_danh_muc.md` | Hero, tiêu đề section, huy hiệu tin cậy, giới thiệu 6 danh mục, footer, FAQ + FAQPage JSON-LD | Trang chủ, đầu trang danh mục, component Footer |
| `mo_ta_san_pham_mau.md` | 6 mô tả sản phẩm mẫu + mẫu trống | Dữ liệu seed D1 và hướng dẫn An nhập sản phẩm |
| `chu_giao_dien.md` | Chữ giao diện phía khách: giỏ, thanh toán, QR, theo dõi đơn, trạng thái, đặt in, lỗi | Gom vào file chuỗi (ví dụ `app/i18n/vi.ts`) |
| `chu_admin_pos.md` | Chữ giao diện admin: đơn, báo giá đặt in, sản xuất, báo cáo, đối soát COD (màn 24), POS | Gom vào file chuỗi admin |
| `dieu_khoan.md` | Điều khoản sử dụng và mua bán, gồm dịch vụ đặt in | Route `/dieu-khoan` |
| `bao_mat.md` | Chính sách bảo mật theo Nghị định 13/2023/NĐ-CP | Route `/chinh-sach-bao-mat` |
| `doi_tra_hoan_tien.md` | Đổi trả, hoàn cọc, dung sai in 3D, video mở hộp | Route `/doi-tra-hoan-tien` |
| `van_chuyen.md` | Giao hàng Viettel Post, COD, đồng kiểm | Route `/van-chuyen` |

Gợi ý slug pháp lý ở trên. Nếu repo đã có slug khác, sửa trong `seo.md` cho khớp.

## 3. Quy tắc khi sửa nội dung
- Không viết số tiền, phí, % hay số phút vào chữ. Luôn lấy từ config.
- Không thêm đánh giá giả, số khách giả, "bán chạy nhất", "rẻ nhất".
- Không dùng tên hay hình nhân vật có bản quyền. Danh mục là "Nhân vật & Fantasy".
- Trạng thái đơn chỉ dùng 6 nhãn trong `chu_giao_dien.md`.
