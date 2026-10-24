# axt3d

Web shop bán sản phẩm in 3D.

## Công nghệ

React Router (SSR), TypeScript, Tailwind CSS, shadcn/ui, chạy trên Cloudflare Workers, với D1 và R2.

## Tài liệu

- [Danh sách việc phase 1](docs/TASKS.md)
- [Spec giao diện](docs/spec_giao_dien.md)
- [Mockup gốc 14 màn](docs/giao_dien_14_man.png) — mockup nguồn của spec giao diện.
- [Cấu hình cửa hàng](config/shop-config.json) — giá, cọc 50%, phí vận chuyển và quy tắc SePay. Code đọc các số tiền từ file này.

## Quy trình

- Mỗi việc một nhánh riêng.
- Chỉ gộp vào `main` qua pull request.
- Không đưa secret vào repo. Secret chỉ đặt ở biến môi trường trên Cloudflare.

Cách chạy local và cách deploy sẽ được ghi tại README này khi khung project được dựng (việc 1 trong `docs/TASKS.md`).
