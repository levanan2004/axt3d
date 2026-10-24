# Chữ giao diện Admin và POS

Admin đăng nhập qua Cloudflare Access. Số tiền, tỉ lệ, phí lấy từ config/`calcOrderTotals`, không gõ tay vào chữ.

## 1. Khung chung
- Logo: `AXT 3D Admin`
- Menu: `Tổng quan` · `Đơn hàng` · `Đặt in` · `Sản phẩm` · `Sản xuất` · `Tồn kho` · `Vận chuyển & COD` · `Khách hàng` · `Báo cáo` · `Bán tại quầy (POS)` · `Cài đặt`
- Nút chung: `Lưu` · `Hủy` · `Xóa` · `Sửa` · `Xem →` · `Xuất CSV` · `Lọc` · `Xóa lọc` · `Tải thêm`
- Lưu xong: `Đã lưu.` · Lỗi lưu: `Chưa lưu được. Thử lại.` · Mất quyền: `Phiên đăng nhập hết hạn. Đăng nhập lại.`
- Rời trang khi chưa lưu: `Có thay đổi chưa lưu. Rời trang?` · `Rời trang` · `Ở lại`

## 2. Tổng quan (màn 18)
- `Tổng quan kinh doanh – {ngay}`
- KPI: `Chờ cọc` · `Đã cọc` · `Đang chuẩn bị` · `Đang giao` · `Yêu cầu chờ báo giá` · `COD chờ đối soát` · `Doanh thu đã ghi nhận (hôm nay)`
- Chú thích doanh thu: `Chỉ tính đơn Hoàn thành, đã trừ hoàn tiền.`
- Biểu đồ: `Doanh thu 7 ngày` · Bảng: `Đơn hàng gần đây`
- Cảnh báo: `{n} giao dịch cần hoàn tiền (tiền vào sau khi đơn đã hủy).` · `{n} đơn COD bị lệch đối soát.`
- Trống: `Chưa có đơn nào hôm nay.`

## 3. Đơn hàng (màn 19)
- Tiêu đề: `Quản lý đơn hàng`
- Tab: `Tất cả` · `Chờ cọc` · `Đã cọc` · `Đang chuẩn bị` · `Đã giao vận chuyển` · `Hoàn thành` · `Đã hủy`
- Tìm: `Tìm mã đơn, tên khách, số điện thoại`
- Cột: `Mã đơn` · `Khách` · `Kênh` (`Online` / `Đặt in` / `POS`) · `Giá trị` · `Đã cọc` · `COD` · `Trạng thái` · `Ngày tạo`
- Chi tiết: `Sản phẩm` · `Tiền hàng` · `Cọc` · `Thu khi nhận (COD)` · `Phí ship` · `Lịch sử thanh toán` · `Lịch sử trạng thái` · `Ghi chú nội bộ`
- Giao dịch SePay: `Mã GD {id} · {soTien} · {thoiGian} · Nội dung: {noiDung}`
- Đổi trạng thái: nút `Chuyển sang "{trangThai}"` · xác nhận `Chuyển đơn {maDon} sang "{trangThai}"? Khách sẽ thấy trạng thái mới.` · `Xác nhận` · `Hủy`
- Mã vận đơn: `Mã vận đơn Viettel Post` · `Lưu mã vận đơn` · lỗi `Nhập mã vận đơn trước khi chuyển sang "Đã giao vận chuyển".`
- Hủy đơn: `Hủy đơn` · lý do `Lý do hủy (khách sẽ thấy)` · xác nhận `Hủy đơn {maDon}? Tồn kho sẽ được trả lại.` · đơn đã cọc thêm dòng `Đơn đã nhận cọc {tienCoc}. Ghi lại hướng xử lý cọc theo chính sách trước khi hủy.`
- Tự hủy: nhật ký `Hệ thống tự hủy: quá {config.payment.depositExpiryMinutes} phút chưa nhận cọc. Đã trả {n} sản phẩm về kho.`
- **Tiền vào sau khi hủy:** badge `Cần hoàn tiền` · `Nhận {soTien} lúc {thoiGian} cho đơn đã hủy {maDon}. Liên hệ khách và hoàn tiền.` · nút `Đánh dấu đã hoàn tiền` · form `Số tiền hoàn` · `Ngày hoàn` · `Mã giao dịch hoàn` · xác nhận `Ghi nhận đã hoàn {soTien} cho khách?`
- Cọc thiếu: `Nhận {soTien}, thiếu so với cọc {tienCoc}. Đơn vẫn ở "Chờ cọc". Liên hệ khách.`
- Giao dịch trùng: `Giao dịch {id} đã được ghi nhận trước đó. Bỏ qua.`
- Trống: `Chưa có đơn nào.` · lọc không ra: `Không có đơn khớp bộ lọc.`
- Không đổi được trạng thái lùi: `Không thể chuyển ngược từ "{a}" về "{b}".`

## 4. Đặt in – báo giá
- Tiêu đề: `Yêu cầu đặt in`
- Tab: `Chờ báo giá` · `Đã báo giá` · `Đã cọc` · `Đang in` · `Hoàn thành` · `Đã hủy`
- Chi tiết: `File` (nút `Tải file`) · `Chất liệu` · `Màu` · `Số lượng` · `Hoàn thiện`
- Form báo giá: `Khối lượng thực tế (g)` · `Giờ in thực tế` · `Hoàn thiện` · `Giá cuối` · `Thời gian in dự kiến` · `Ghi chú cho khách`
- Gợi ý: `Giá theo công thức config: {giaCongThuc}. Bạn có thể sửa giá cuối.`
- Nút: `Gửi báo giá` · xác nhận `Gửi báo giá {giaCuoi} cho khách? Báo giá có hiệu lực {config.customPrint.quoteValidHours} giờ.`
- Từ chối in: `Từ chối yêu cầu` · lý do: `File lỗi không sửa được` · `Vượt khổ máy` · `Hàng không nhận in (vũ khí, giả mạo…)` · `Nghi vi phạm bản quyền` · `Khác`
- Bắt đầu in: `Bắt đầu in` · xác nhận `Bắt đầu in yêu cầu {maYeuCau}? Từ lúc này tiền cọc của khách không còn hoàn lại.`
- Hết hạn: `Báo giá đã hết hạn, khách chưa duyệt.`
- Xóa file theo hạn: `File sẽ tự xóa vào {ngayXoa} ({SO_NGAY_GIU_FILE} ngày sau khi đơn đóng).` · `File đã xóa theo chính sách lưu trữ.`
- Trống: `Không có yêu cầu nào chờ báo giá.`

## 5. Sản xuất (màn 20)
- Tiêu đề: `Hàng đợi in 3D` · nút `＋ Tạo phiếu sản xuất`
- KPI: `Chờ in` · `Đang in` · `Chờ kiểm tra` · `In lỗi` · `Xong hôm nay`
- Cột: `Mã phiếu` · `Đơn` · `Sản phẩm / vật liệu` · `Thời gian ước tính` · `Máy in` · `Trạng thái` · `Thao tác`
- Trạng thái phiếu: `Chờ in` · `Đang in` · `Chờ kiểm tra` · `In lỗi – cần in lại` · `Đã đóng gói` · `Sẵn sàng giao`
- Thao tác: `Bắt đầu in` · `In xong` · `Đạt kiểm tra` · `Không đạt – in lại` · `Đóng gói xong`
- Quy trình: `Đã nhận cọc → Chờ in → Đang in → Kiểm tra → Đóng gói → Sẵn sàng giao → Tạo vận đơn`
- Gán máy: `Chọn máy in` · lỗi `Máy {tenMay} đang bận đến {gio}.`
- In lỗi: `Ghi lý do in lỗi` · `Khối lượng nhựa hao (g)` (để tính chi phí)
- Thông báo: `Tất cả phiếu của đơn {maDon} đã đóng gói. Đơn sẵn sàng tạo vận đơn.`
- Trống: `Hàng đợi trống. Không có gì cần in.`

## 6. Tồn kho / Sản phẩm
- `＋ Thêm sản phẩm` · `Tên` · `Slug` · `Danh mục` · `Mô tả ngắn` · `Mô tả dài` · `Giá bán` · `Giá vốn` · `Tồn kho` · `Thời gian in dự kiến` · `Cho phép bán khi hết hàng (in theo đơn)` · `Hiển thị` / `Ẩn`
- Ảnh: `Tải ảnh lên` · `Kéo để sắp xếp` · `Đặt làm ảnh chính` · `Mô tả ảnh (alt)`
- Lỗi: `Slug đã tồn tại.` · `Giá phải lớn hơn 0.` · `Thiếu ảnh chính.` · `Tên có thể chứa nhân vật có bản quyền. Kiểm tra lại trước khi đăng.` (cảnh báo mềm)
- Tồn thấp: `Sắp hết: còn {n}.`
- Xóa: `Xóa sản phẩm này? Đơn cũ vẫn giữ thông tin.`

## 7. Vận chuyển & đối soát COD Viettel Post (màn 24)
- Tiêu đề: `Vận chuyển & đối soát COD`
- KPI: `Chờ đóng gói` · `Sẵn sàng tạo vận đơn` · `Đang giao` · `COD chờ nhận` · `Lệch đối soát`
- Cột: `Đơn` · `Mã VTP` · `COD cần thu` · `Phí thu hộ` · `Phí ship` · `Tiền dự kiến nhận` · `Tiền thực nhận` · `Trạng thái giao` · `Đối soát`
- Trạng thái đối soát: `Chưa đối soát` · `Chờ chuyển tiền` · `Đã nhận COD` · `Lệch – cần kiểm tra` · `Đã xử lý lệch`
- Công thức hiển thị: `Dự kiến nhận = COD − phí thu hộ − phí ship (theo config).`
- Thiếu cấu hình: `Chưa có phí thu hộ trong config. Không tính được tiền dự kiến.`
- Tạo vận đơn: `Tạo vận đơn` · lỗi `Chỉ tạo vận đơn khi đơn đã đóng gói.`
- Nhập bảng kê: `Nhập bảng đối soát Viettel Post (CSV/Excel)` · `Đã đọc {n} dòng: {khop} khớp, {lech} lệch, {khongThay} không tìm thấy đơn.`
- **Lệch:** `Đơn {maDon} lệch {chenhLech}: dự kiến {duKien}, thực nhận {thucNhan}. Hệ thống không tự sửa. Kiểm tra với Viettel Post rồi ghi hướng xử lý.`
- Xử lý lệch: `Ghi chú xử lý` · `Đánh dấu đã xử lý` · xác nhận `Đánh dấu đã xử lý? Số liệu gốc vẫn được giữ.`
- Giao thất bại / hoàn hàng: `Viettel Post báo hoàn hàng. Nhận lại hàng và cập nhật tồn kho.` · `Cập nhật tồn kho`
- Trống: `Không có đơn chờ đối soát.`

## 8. Báo cáo (màn 23)
- Tiêu đề: `Báo cáo` · khoảng thời gian `Hôm nay` · `7 ngày` · `30 ngày` · `Tháng này` · `Tùy chọn` (giờ Việt Nam)
- Chú thích bắt buộc: `Doanh thu chỉ tính đơn ở trạng thái Hoàn thành, trừ các khoản đã hoàn tiền. Tiền cọc và COD là hai phần của cùng một đơn, không cộng hai lần.`
- KPI: `Doanh thu` · `Hoàn tiền` · `Lợi nhuận ước tính` · `Số đơn hoàn thành` · `Giá trị đơn trung bình`
- Theo nguồn: `Website` · `Đặt in` · `Tại quầy (POS)`
- Chi phí: `Nhựa` · `Máy` · `Điện` · `Hoàn thiện` · `Phí thu hộ COD` · `Phí ship đã trả` · `Hoàn tiền`
- Ghi chú lợi nhuận: `Lợi nhuận là ước tính theo đơn giá trong config và giá vốn nhập trong Admin.`
- Tiền đang treo (không phải doanh thu): `Cọc đã nhận của đơn chưa hoàn thành` · `COD chờ đối soát`
- Trống: `Chưa có đơn hoàn thành trong khoảng này.`
- Xuất: `Xuất báo cáo CSV`

## 9. POS – bán tại quầy (màn 21 tablet, 22 mobile)
- Header: `AXT 3D POS · {tenNhanVien} · {quay}`
- Tìm: `Tìm sản phẩm hoặc quét mã SKU`
- Giỏ: `Giỏ tại quầy ({n})` · `Xóa giỏ` · xác nhận `Xóa toàn bộ giỏ?`
- Tổng: `Tổng tiền {tong}` (POS không cọc, không phí ship)
- Thanh toán: `Tiền mặt` · `Chuyển khoản QR`
- Tiền mặt: `Khách đưa` · `Tiền thối: {tienThoi}` · lỗi `Số tiền khách đưa nhỏ hơn tổng.`
- QR: `Nội dung chuyển khoản: POS{maDon}` · `Đang chờ tiền vào…` · `Đã nhận {soTien}.` · nút `Kiểm tra lại` (chỉ tải trạng thái) · `Chuyển sang tiền mặt`
- Nút chính: `Hoàn tất thanh toán`
- Xác nhận tiền mặt: `Đã nhận đủ {tong} tiền mặt?` · `Đã nhận` · `Quay lại`
- Thành công: `Đã thanh toán đơn {maDon}. Đơn chuyển sang Hoàn thành.` · `In hóa đơn` · `Đơn mới`
- Hết hàng: `{tenSanPham} đã hết trong kho.`
- Không thấy SKU: `Không tìm thấy mã {sku}.`
- QR chưa tới: `Chưa thấy tiền vào. Nhờ khách kiểm tra nội dung POS{maDon} rồi bấm Kiểm tra lại.`
- Hủy đơn POS: `Hủy đơn đang bán?` · tồn kho trả lại
- Mất mạng: `Mất kết nối. Chưa lưu được đơn, không nhận tiền đến khi có mạng.`
- Mobile: sticky `{n} món · {tong}` · `Thanh toán`
- Trống: `Chưa có sản phẩm trong giỏ. Chạm vào sản phẩm để thêm.`
