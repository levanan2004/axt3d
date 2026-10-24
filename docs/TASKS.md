## 1. Yêu cầu chung
- Công nghệ: React Router (chế độ SSR) + TypeScript + Tailwind + shadcn/ui, chạy trên Cloudflare Workers, dữ liệu ở D1, ảnh ở R2.
- Làm bản điện thoại trước, rồi đến máy tính. Giao diện theo spec ở `docs/spec_giao_dien.md` (dựa trên 14 màn mẫu).
- Không viết cứng giá, phí ship hay tiền cọc vào code. Tất cả đọc từ `config/shop-config.json`.
- Không đưa secret hay key vào repo, chỉ để trong biến môi trường của Cloudflare.
- Mỗi việc làm trên một nhánh riêng, gộp vào `main` qua pull request. README ghi cách chạy và cách deploy.
- Tài khoản Cloudflare là của An. Bạn deploy lên bản chạy thử, An giữ bản chính thức.
- Schema D1 viết thành các file migration để trong repo, kèm một file dữ liệu mẫu để chạy thử ở máy.
- Có test cho: cách tính cọc và COD, webhook SePay (gửi trùng một giao dịch chỉ được ghi nhận một lần), trừ tồn kho. Build chạy được bằng một lệnh.

## 2. Các việc cần làm
1. Dựng khung project, deploy được lên Cloudflare, viết schema D1 cho sản phẩm, biến thể, đơn hàng và khách hàng.
2. Trang chủ, trang danh mục có lọc và sắp xếp, trang chi tiết sản phẩm có ảnh vuốt và chọn biến thể.
3. Giỏ hàng, lưu lại khi tải lại trang. Tổng tiền luôn tính từ sản phẩm trong giỏ.
4. Thanh toán: chỉ có một luồng. Khách nhập tên, số điện thoại, địa chỉ, rồi màn hiện 3 dòng: tiền hàng, cọc 50% trả ngay qua QR, và COD (phần còn lại cộng phí ship). Sau đó hiện trang QR chuyển khoản, nội dung `IN3D{mã đơn}`, có đếm ngược 30 phút.
5. Webhook SePay tự đánh dấu đơn "đã cọc". Mỗi mã giao dịch chỉ được ghi nhận một lần. Nút "Đã chuyển khoản" chỉ tải lại trạng thái đơn, không tự xác nhận.
6. Quá 30 phút chưa cọc: một tác vụ hẹn giờ của Cloudflare tự hủy đơn và trả lại tồn kho. Nếu tiền vào sau khi đơn đã hủy, vẫn ghi nhận giao dịch và báo Admin để hoàn tiền.
7. Trừ tồn kho an toàn bằng một lệnh có điều kiện trong D1, để hai người không mua được cùng một món cuối.
8. Trang theo dõi đơn, tra bằng mã đơn và số điện thoại.
9. Admin, đăng nhập qua Cloudflare Access: thêm và sửa sản phẩm, tải ảnh lên R2, xem đơn, đổi trạng thái đơn, nhập mã vận đơn Viettel Post bằng tay. Trạng thái đơn: chờ cọc, đã cọc, đang chuẩn bị, đã giao vận chuyển, hoàn thành, đã hủy.
10. SEO:
    - Trang render sẵn trên server, URL thân thiện (ví dụ `/san-pham/ten-san-pham`).
    - Mỗi trang có title, meta description, Open Graph riêng.
    - Có dữ liệu cấu trúc Product, BreadcrumbList và Organization.
    - Có `sitemap.xml` tự cập nhật, `robots.txt` và thẻ canonical.
    - Ảnh dùng WebP, có thuộc tính alt và tải trễ.
    - Điểm Lighthouse trên điện thoại từ 90 trở lên ở cả Performance và SEO.
11. Chừa sẵn các trang pháp lý (điều khoản, bảo mật, đổi trả, vận chuyển) và chân trang. Nội dung nhóm sẽ gửi sau. Tên shop và logo lấy từ config, thay được.

## 3. Chưa làm ở giai đoạn này
Đặt in theo file STL/3MF, xem trước mô hình 3D, POS, quản lý sản xuất, báo cáo lợi nhuận, nối API Viettel Post.

Không dùng ảnh hay tên nhân vật có bản quyền (Pikachu, Pokémon, Goku...) làm dữ liệu mẫu. Danh mục "Phim/Anime" đổi thành "Nhân vật & Fantasy".
