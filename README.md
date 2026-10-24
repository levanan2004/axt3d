# axt3d

Web shop bán sản phẩm in 3D. React Router (SSR), TypeScript, Tailwind CSS, shadcn/ui, Cloudflare Workers, D1 và R2.

## Tài liệu

- [Việc phase 1](docs/TASKS.md)
- [Spec giao diện](docs/spec_giao_dien.md)
- [Cấu hình tiền](config/shop-config.json) — giá, cọc, ship, báo giá in theo file, POS, đối soát COD, báo cáo
- [Nhận diện cửa hàng](config/site-info.json) — token `{TEN_SHOP}` chỉ hiện giá trị khi được điền ở đây
- [Nội dung trang](docs/content/README.md)

## Chạy trên máy

Yêu cầu Node 22+.

```bash
npm install
node scripts/local-env.mjs
npm run setup
npm run build
npm run preview
```

`npm run setup` áp migration D1 local và nạp sản phẩm mẫu vào `.wrangler/state`. `npm run preview` chạy `wrangler dev` tại http://127.0.0.1:4173 và dùng cùng thư mục dữ liệu đó.

Admin local: mở http://127.0.0.1:4173/admin/local-auth (chỉ loopback, cookie từ `.dev.vars`).

Webhook SePay local, khi `bank.accountNumber` trong config còn trống, gửi `accountNumber` là `LOCAL` và header `Authorization: Apikey <SEPAY_WEBHOOK_KEY>` (key nằm trong `.dev.vars`, không commit).

```bash
npm run typecheck
npm test
npm run build
```

## Deploy

Không có secret trong repo. Điền `SEPAY_WEBHOOK_KEY` bằng `wrangler secret put` trên tài khoản Cloudflare của An. `scripts/deploy-staging.mjs` chỉ in các bước. Thêm `--confirm-deploy` khi An muốn deploy bản staging. Agent không chạy deploy.

## Pháp lý và robots

Trang: `/dieu-khoan`, `/chinh-sach-bao-mat`, `/doi-tra-hoan-tien`, `/van-chuyen`. Bản production của `robots.txt` chặn `/admin`, `/pos` và `/api/`.
