# Chữ giao diện phía khách

Biến: `{tienHang}`, `{tienCoc}`, `{tienCOD}`, `{phiShip}`, `{maDon}`, `{n}`... đều tính bằng `calcOrderTotals` và định dạng `vi-VN` + "đ". Số từ config viết dạng `{config.…}`.

## 1. Chung
- Tìm kiếm placeholder: PC `Tìm mô hình, phụ kiện, quà tặng in 3D...` · Mobile `Tìm mô hình, phụ kiện, quà tặng...`
- Nút tìm: `Tìm kiếm` · Bottom nav: `Trang chủ` · `Danh mục` · `Đặt in` · `Giỏ hàng` · `Tài khoản`
- Thêm vào giỏ: `＋ Thêm vào giỏ hàng` · `Mua ngay`
- Toast đã thêm: `Đã thêm {tenSanPham} vào giỏ.` · nút `Xem giỏ`
- Tồn kho: `Còn hàng` · `Còn {n} sản phẩm` · `Hết hàng` · `In theo đơn – in xong trong khoảng {thoiGianIn}`
- Biến thể: `Màu sắc` · `Kích thước` · `Chất liệu` · `Số lượng`
- Chưa chọn biến thể: `Vui lòng chọn {tenThuocTinh}.`
- Dải cam kết trang SP: `In tại xưởng · Giao Viettel Post toàn quốc · Cọc 50% · COD phần còn lại`
- Ô nhập chữ (móc khóa tên): nhãn `Chữ cần in`, gợi ý `Tối đa {maxKyTu} ký tự. Kiểm tra kỹ chính tả, in xong không sửa được.`
- Bộ lọc: `Bộ lọc` · `Áp dụng` · `Xóa lọc` · `Khoảng giá` · `Vật liệu` · Sắp xếp `Phổ biến` · `Mới nhất` · `Giá thấp → cao` · `Giá cao → thấp`
- Đếm: `{n} sản phẩm`

## 2. Giỏ hàng
- Tiêu đề: `Giỏ hàng ({n} sản phẩm)`
- Dòng biến thể: `Màu: {mau} · Kích thước: {kichThuoc}`
- Nút xóa (aria): `Xóa {tenSanPham} khỏi giỏ`
- Xác nhận xóa: `Bỏ sản phẩm này khỏi giỏ?` · `Bỏ` · `Giữ lại`
- Tóm tắt: `Tóm tắt đơn hàng` · `Tạm tính ({n} sản phẩm)` · `Phí vận chuyển: Hiện ở bước thanh toán` · `Tổng tiền hàng`
- Ghi chú: `Bạn sẽ cọc 50% tiền hàng qua QR. Phần còn lại và phí ship trả khi nhận hàng.`
- Nút: `Tiến hành thanh toán` · Mobile sticky: `Chọn tất cả` · `Tổng: {tienHang}` · `Thanh toán ({n})`
- Số lượng vượt tồn: `Chỉ còn {n} sản phẩm. Đã chỉnh số lượng.`
- Giá thay đổi: `Giá của {tenSanPham} vừa cập nhật. Tổng tiền đã tính lại.`
- Hết hàng trong giỏ: `{tenSanPham} vừa hết hàng. Bỏ khỏi giỏ để tiếp tục.`
- **Giỏ trống:** `Giỏ hàng đang trống.` / `Xem các mẫu in 3D và chọn món bạn thích.` · nút `Xem sản phẩm`

## 3. Thanh toán
- Stepper: `1 Giỏ hàng` — `2 Thanh toán` — `3 Hoàn tất`
- Địa chỉ: `Địa chỉ nhận hàng` · `Họ và tên` · `Số điện thoại` · `Tỉnh/Thành phố` · `Phường/Xã` · `Địa chỉ cụ thể (số nhà, đường)` · `Ghi chú cho shop (không bắt buộc)` · `Thay đổi`
- Vận chuyển: `Đơn vị vận chuyển` · `Viettel Post – Giao toàn quốc, thu COD phần còn lại` · `Phí: {phiShip}`
- Thanh toán (1 dòng cố định, không radio): `Cọc 50% tiền hàng qua chuyển khoản QR. Phần còn lại và phí ship trả khi nhận hàng (COD).`
- **Ba dòng tiền:**
  - `Tiền hàng` … `{tienHang}`
  - `Cọc 50% chuyển ngay` … `{tienCoc}` (dòng nhỏ: `Đã làm tròn lên hàng nghìn`)
  - `Thu khi nhận hàng (COD)` … `{tienCOD}` (dòng nhỏ: `Gồm phần tiền hàng còn lại + phí ship {phiShip}`)
  - Phụ: `Tổng bạn trả` … `{tongCong}`
- DepositPolicyNote: `Sau khi đặt, bạn có {config.payment.depositExpiryMinutes} phút để chuyển cọc. Hủy đơn đã cọc: xem chính sách đổi trả và hoàn tiền.`
- Đồng ý: `Tôi đã đọc và đồng ý với Điều khoản sử dụng và Chính sách đổi trả.`
- Nút: `Đặt hàng & thanh toán cọc` · Mobile sticky: `Cọc ngay: {tienCoc}` / `COD khi nhận: {tienCOD}` / `Đặt hàng`
- Lỗi form: `Vui lòng nhập họ tên.` · `Số điện thoại chưa đúng. Nhập 10 số, bắt đầu bằng 0.` · `Vui lòng chọn tỉnh/thành và phường/xã.` · `Vui lòng nhập địa chỉ cụ thể.` · `Bạn cần đồng ý điều khoản để đặt hàng.`
- Lỗi tạo đơn: `Chưa tạo được đơn. Vui lòng thử lại sau ít phút.`
- Hết hàng lúc đặt: `Có sản phẩm vừa hết hàng: {danhSach}. Giỏ hàng đã được cập nhật.`

## 4. Trang QR cọc
- Tiêu đề: `Chuyển khoản cọc đơn hàng`
- `Mã đơn: {maDon}`
- `Số tiền cọc` … `{tienCoc}` (nút `Sao chép`)
- `Ngân hàng` · `Số tài khoản` · `Chủ tài khoản` (mỗi dòng có nút `Sao chép`)
- `Nội dung chuyển khoản` … `{TIEN_TO_CK}{maDon}` (nút `Sao chép`)
- Lưu ý: `Giữ đúng số tiền và nội dung chuyển khoản để hệ thống tự xác nhận.`
- Nút mobile: `Lưu ảnh QR`
- Toast sao chép: `Đã sao chép.`
- **Đếm ngược:** `Đơn được giữ thêm {mm:ss}` · aria-live mỗi phút: `Còn {m} phút để chuyển cọc.` · còn dưới 5 phút: `Sắp hết thời gian giữ đơn.`
- Xác nhận tự động: `Hệ thống xác nhận tự động khi nhận được tiền. Thường chỉ mất vài phút.`
- Nút: `Đã chuyển khoản, kiểm tra ngay`
- Ghi chú dưới nút: `Nút này chỉ tải lại trạng thái đơn. Đơn chỉ chuyển sang "Đã cọc" khi hệ thống nhận được tiền.`
- Sau khi bấm, chưa thấy tiền: `Chưa nhận được tiền cọc. Nếu bạn vừa chuyển, chờ thêm 1–2 phút rồi kiểm tra lại.`
- Đã nhận: `Đã nhận cọc {tienCoc}. Cảm ơn bạn!` / `Phần còn lại {tienCOD} trả khi nhận hàng.` · nút `Theo dõi đơn hàng`
- Thiếu tiền: `Shop đã nhận {soTienNhan}, chưa đủ tiền cọc {tienCoc}. Vui lòng liên hệ {SDT} để được hỗ trợ.`
- **Hết hạn / tự hủy:** `Đơn {maDon} đã tự hủy vì chưa nhận được cọc trong {config.payment.depositExpiryMinutes} phút. Sản phẩm đã được trả lại kho.` / `Nếu bạn đã chuyển tiền, shop sẽ hoàn lại. Liên hệ {SDT} hoặc {EMAIL} kèm ảnh giao dịch.` · nút `Đặt lại đơn này`

## 5. Hoàn tất
- `Đặt hàng thành công` · `Mã đơn của bạn: {maDon}` · `Lưu mã đơn và số điện thoại để tra cứu.` · `Theo dõi đơn hàng` · `Tiếp tục mua sắm`

## 6. Theo dõi đơn
- Tiêu đề: `Theo dõi đơn hàng` · `Mã đơn` · `Số điện thoại đặt hàng` · nút `Tra cứu`
- Không thấy: `Không tìm thấy đơn. Kiểm tra lại mã đơn và số điện thoại.`
- Tra quá nhiều lần: `Bạn tra cứu quá nhiều lần. Thử lại sau ít phút.`
- Đầu trang: `Đơn hàng #{maDon}` + badge
- Khối vận chuyển: `Thông tin vận chuyển` · `Viettel Post` · `Mã vận đơn: {maVanDon}` (chưa có: `Sẽ cập nhật khi giao cho vận chuyển`) · `Tiền thu khi nhận: {tienCOD}` · `Xem trên Viettel Post`
- Khối sản phẩm: `Sản phẩm`
- Mốc phụ: `Đã đặt hàng` · `Đã nhận cọc 50%` · `Đang in 3D` · `Đóng gói và tạo vận đơn` · `Viettel Post đang vận chuyển` · `Giao thành công`

## 7. Sáu trạng thái đơn (nhãn + mô tả)
| enum | Nhãn | Mô tả cho khách |
|---|---|---|
| `cho_coc` | Chờ cọc | Đơn đang chờ bạn chuyển cọc. |
| `da_coc` | Đã cọc | Shop đã nhận cọc và sẽ chuẩn bị hàng. |
| `dang_chuan_bi` | Đang chuẩn bị | Shop đang in, kiểm tra và đóng gói. |
| `da_giao_van_chuyen` | Đã giao vận chuyển | Hàng đã giao cho Viettel Post. |
| `hoan_thanh` | Hoàn thành | Bạn đã nhận hàng. Cảm ơn bạn! |
| `da_huy` | Đã hủy | Đơn đã hủy. {lyDoHuy} |

Lý do hủy: `Quá hạn chuyển cọc.` · `Bạn yêu cầu hủy.` · `Shop hủy: {ghiChu}.`

## 8. Đặt in theo yêu cầu (`/dat-in`)
**Đầu trang**
- H1: `In 3D theo yêu cầu`
- Phụ: `Gửi file ({config.customPrint.upload.allowedExt}), chọn nhựa và màu. Shop kiểm tra file và gửi báo giá, bạn đồng ý rồi mới cọc.`

**Quy trình (4 bước)**
1. `Tải file và chọn thông số` – `Gửi file cùng thông tin yêu cầu: nhựa, màu, số lượng, hoàn thiện.`
2. `Shop kiểm tra và báo giá` – `Shop xem file, tính giá theo khối lượng và giờ in thực tế, báo giá cùng thời gian in. Báo giá có hiệu lực {config.customPrint.quoteValidHours} giờ.`
3. `Bạn duyệt và cọc 50%` – `Cọc qua QR như đơn thường, nội dung {TIEN_TO_CK}{maDon}.`
4. `In và giao hàng` – `In xong, shop giao qua Viettel Post. Phần còn lại và phí ship trả khi nhận.`

**Bước 1 – Thông tin yêu cầu**
- `Tên sản phẩm/dự án` · `Mô tả (công dụng, yêu cầu đặc biệt)` · `Họ và tên` · `Số điện thoại` · `Email (không bắt buộc)`

**Bước 2 – File và thông số**
- Dropzone: `Kéo thả file ({config.customPrint.upload.allowedExt}) vào đây` · `hoặc Chọn file` · `Tối đa {config.customPrint.upload.maxFiles} file, mỗi file {config.customPrint.upload.maxFileMB} MB.`
- `Chất liệu` (PLA · PETG · TPU · Resin) – gợi ý ngắn: PLA `Dễ in, nhiều màu, dùng trong nhà` · PETG `Bền, chịu nhiệt tốt hơn PLA` · TPU `Dẻo, đàn hồi` · Resin `Chi tiết mịn, hợp mô hình nhỏ`
- `Màu sắc` · `Số lượng` · `Hoàn thiện`: `Không xử lý` · `Xử lý cơ bản (gỡ support, chà nhám)` · `Sơn màu`
- Đang tải: `Đang tải file…` · Xong: `{tenFile} · đã tải lên`

**Bước 3 – Xác nhận và gửi**
- Ghi chú: `Web không tính giá tự động. Shop kiểm tra file rồi gửi báo giá, báo giá có hiệu lực {config.customPrint.quoteValidHours} giờ. Đơn tối thiểu {config.customPrint.minOrder}.`
- **Cam kết quyền sử dụng file (checkbox bắt buộc):** `Tôi cam kết có quyền sử dụng file này để in (tự thiết kế, đã mua hoặc được cấp phép), và file không vi phạm quyền sở hữu trí tuệ của người khác. Tôi chịu trách nhiệm nếu có tranh chấp.`
- **Hàng không nhận in (checkbox bắt buộc):** `Tôi xác nhận file không phải vũ khí hay bộ phận vũ khí, đồ giả mạo (giấy tờ, con dấu, tiền, hàng nhái thương hiệu), vật phẩm trái pháp luật hay thuần phong mỹ tục.` · link `Xem danh sách hàng không nhận in`
- Đồng ý: `Tôi đồng ý với Điều khoản đặt in. Tiền cọc không hoàn lại khi shop đã bắt đầu in.`
- Nút: `Gửi yêu cầu báo giá`
- Gửi xong: `Đã gửi yêu cầu {maYeuCau}. Shop sẽ báo giá qua số điện thoại/email bạn để lại. Bạn cũng xem được ở trang Theo dõi đơn.`

**Trạng thái yêu cầu đặt in (khách thấy)**
| Nhãn | Mô tả |
|---|---|
| Chờ báo giá | Shop đang kiểm tra file của bạn. |
| Đã báo giá | Có báo giá chính thức. Duyệt trước {hanBaoGia} để giữ giá. |
| Đã cọc | Shop đã nhận cọc, file vào hàng chờ in. |
| Đang in | Máy đang in. Từ lúc này tiền cọc không hoàn lại. |
| Hoàn thành | Đã in xong và giao tới bạn. |
| Đã hủy | Yêu cầu đã hủy. {lyDoHuy} |
Sau khi cọc, phần giao hàng dùng tiếp các trạng thái đơn ở mục 7 (Đang chuẩn bị → Đã giao vận chuyển → Hoàn thành).

**Màn báo giá cho khách**
- `Báo giá cho yêu cầu {maYeuCau}` · `Giá cuối: {giaCuoi}` · `Thời gian in dự kiến: {thoiGianIn}` · `Ghi chú của shop: {ghiChu}` · `Báo giá có hiệu lực đến {hanBaoGia}`
- Ba dòng tiền như checkout: `Tiền hàng` / `Cọc 50% chuyển ngay` / `Thu khi nhận hàng (COD)`
- Nút: `Đồng ý và cọc` · `Từ chối báo giá` · Xác nhận từ chối: `Từ chối báo giá này? Yêu cầu sẽ đóng lại.`
- Hết hạn: `Báo giá đã hết hạn. Bấm "Yêu cầu báo giá lại" để shop xem lại giá.`

**Lỗi upload**
- `Chỉ nhận file {config.customPrint.upload.allowedExt}.` · `File lớn hơn {config.customPrint.upload.maxFileMB} MB.` · `Tối đa {config.customPrint.upload.maxFiles} file mỗi yêu cầu.` · `File bị lỗi hoặc không đọc được. Thử xuất lại file từ phần mềm thiết kế.` · `Mô hình lớn hơn khổ in của máy. Shop sẽ liên hệ để chia phần hoặc thu nhỏ.` · `Tải lên bị gián đoạn. Thử lại.` · `Bạn cần đánh dấu hai cam kết trước khi gửi.`

## 9. Trạng thái trống và lỗi chung
- Danh mục trống: `Danh mục này chưa có sản phẩm. Xem các danh mục khác nhé.`
- Tìm không thấy: `Không có kết quả cho "{tuKhoa}". Thử từ khác ngắn hơn, hoặc gửi file để in theo yêu cầu.`
- Lọc không ra: `Không có sản phẩm khớp bộ lọc.` · `Xóa lọc`
- Chưa có đơn: `Bạn chưa có đơn hàng nào.`
- Chưa có yêu cầu đặt in: `Bạn chưa gửi yêu cầu in nào.` · `Gửi file in 3D`
- 404: `Không tìm thấy trang.` / `Trang có thể đã đổi địa chỉ.` · `Về trang chủ`
- 500: `Có lỗi xảy ra phía shop. Vui lòng thử lại sau ít phút.`
- Mất mạng: `Mất kết nối. Kiểm tra mạng rồi thử lại.`
- Sản phẩm ngừng bán: `Sản phẩm này đã ngừng bán.`
