# Việc phase 1

## Yêu cầu chung

- React Router SSR + TypeScript + Tailwind + shadcn/ui trên Cloudflare Workers, D1, R2.
- Mỗi việc một nhánh, gộp vào `main` qua pull request.
- README ghi cách chạy và deploy.
- Không viết cứng giá, phí ship, cọc. Đọc từ `config/shop-config.json`.
- Không đưa secret vào repo.
- Mobile trước, rồi desktop, theo `docs/spec_giao_dien.md`.

## Việc

1. Khung project deploy được lên Cloudflare. Schema D1 (sản phẩm, biến thể, đơn hàng, khách hàng) viết dạng file migration trong repo, kèm file seed dữ liệu mẫu.
2. Trang chủ, danh mục có lọc và sắp xếp, chi tiết sản phẩm có ảnh vuốt và chọn biến thể.
3. Giỏ hàng lưu khi tải lại trang.
4. Thanh toán: tên, số điện thoại, địa chỉ. Hiện 3 dòng: tiền hàng, cọc 50%, COD (50% còn lại + phí ship). Một luồng duy nhất (không có lựa chọn COD riêng). Trang QR chuyển khoản với nội dung `IN3D{mã đơn}`, đếm ngược 30 phút. Nút "Đã chuyển khoản" chỉ tải lại trạng thái.
5. Webhook SePay tự đánh dấu "đã cọc". Mỗi mã giao dịch chỉ ghi nhận một lần. Tiền đến sau khi đơn đã hủy thì vẫn ghi nhận và báo Admin hoàn tiền.
6. Cron Trigger tự hủy đơn quá hạn cọc 30 phút và trả lại tồn kho. Trừ tồn kho an toàn bằng câu lệnh có điều kiện để không bán vượt.
7. Theo dõi đơn bằng mã đơn và số điện thoại.
8. Admin qua Cloudflare Access: sửa sản phẩm, tải ảnh lên R2, xem đơn, đổi trạng thái, nhập mã vận đơn Viettel Post bằng tay.
9. SEO: SSR, URL thân thiện `/san-pham/ten-san-pham`, title / meta / Open Graph riêng mỗi trang, JSON-LD Product / BreadcrumbList / Organization, `sitemap.xml` tự cập nhật, `robots.txt`, canonical, ảnh WebP có alt và lazy load, Lighthouse mobile ≥ 90 Performance và SEO.
10. Chừa trang pháp lý (điều khoản, bảo mật, đổi trả, vận chuyển) và chân trang. Nội dung lấy từ `docs/content`.

## Kiểm tra bắt buộc

- Test cho tính cọc / COD.
- Webhook SePay gửi trùng chỉ ghi nhận một lần.
- Test trừ tồn kho.
- Build chạy bằng một lệnh.
- Tài khoản Cloudflare là của An. Freelancer chỉ deploy bản chạy thử.

## Chưa làm

Đặt in STL/3MF, POS, sản xuất, báo cáo lợi nhuận, API Viettel Post.

## Bàn giao

- Link repo.
- Link chạy thử.
- Danh sách việc xong và chưa xong.
