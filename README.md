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

Admin local: mở http://127.0.0.1:4173/admin/local-auth (hoặc http://127.0.0.1:5173/admin/local-auth khi chạy `npm run dev`), bấm **Vào trang quản trị**. Chỉ chạy trên loopback và cần `APP_ENV=local` + `LOCAL_ADMIN_TOKEN` trong `.dev.vars` (gitignored, ghi đè `APP_ENV=staging` của `wrangler.jsonc`). `node scripts/local-env.mjs` tự thêm các dòng còn thiếu mà không đổi khoá đã có.

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

## Tài khoản khách hàng (feat/11)

Không bắt buộc: khách vẫn mua hàng không cần đăng nhập. Migration `0007_accounts.sql` (local: `npm run db:migrate`).

| Biến | Loại | Ghi chú |
|---|---|---|
| `SITE_URL` | var | Gốc cho link email và Google redirect (`{SITE_URL}/auth/google/callback`). |
| `GOOGLE_CLIENT_ID` | var | Để trống = ẩn nút Google, `/auth/google*` trả 404. |
| `GOOGLE_CLIENT_SECRET` | secret | Bắt buộc khi bật Google; cũng dùng để ký cookie state/nonce. |
| `EMAIL_MODE` | var | `log` (mặc định) hoặc `cloudflare`. |
| `EMAIL_FROM` | var | Ví dụ `no-reply@<domain>` (cần cho `cloudflare`). |
| `DEV_EMAIL_LOG` | var | `1` chỉ trên staging để log link email. Local (`APP_ENV=local`) luôn log; production không bao giờ log. |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET` | var / secret | Trống: bỏ qua ở local/staging; production thiếu khoá thì chặn (fail closed). |
| `EMAIL` | binding `send_email` | Chỉ thêm sau khi domain đã xác minh với Cloudflare Email Sending. |

Mật khẩu: PBKDF2-SHA256 100000 vòng (giới hạn của Workers), salt riêng, chuỗi có phiên bản. Token email và phiên đăng nhập chỉ lưu SHA-256.

## Thông báo đơn hàng qua Telegram (feat/12)

Bot Telegram chỉ **gửi** tin (Bot API `sendMessage`, không webhook) vào nhóm/chat của shop khi:

| Sự kiện | Điểm móc trong code |
|---|---|
| 🆕 Đơn mới | `createOrder` (checkout) và `respondQuote` (khách chấp nhận báo giá) |
| 💰 Đã nhận cọc | Webhook SePay → `recordPayment` báo đơn chuyển `cho_coc → da_coc` |
| ❌ Đơn huỷ / ⌛ hết hạn | Admin huỷ đơn; tiền về sau hạn cọc; `expireOrdersAndNotify` (cron + các trang gọi expire) sau 30 phút chưa cọc |
| 🚚 Đã tạo vận đơn | `createVtpShipment` tạo đơn Viettel Post thành công (chỉ lần đầu) |
| ✅ Khách đã nhận | Webhook Viettel Post status 501 → `hoan_thanh` |

Nội dung: mã đơn, danh sách sản phẩm × số lượng, tiền hàng, phí ship, tiền cọc, COD còn thu (đều lấy từ số tiền **đã lưu trên đơn**), tên gọi ngắn + tỉnh/thành, trạng thái, link `SITE_URL/admin/don-hang/<mã>`. **Không** gửi số điện thoại, địa chỉ chi tiết, email. Dùng `parse_mode: HTML` và escape toàn bộ dữ liệu.

Cấu hình:

```sh
npx wrangler secret put TELEGRAM_BOT_TOKEN   # token từ @BotFather
npx wrangler secret put TELEGRAM_CHAT_ID     # hoặc đặt var TELEGRAM_CHAT_ID trong wrangler.jsonc
```

Chạy local: thêm hai biến vào `.dev.vars`. Thiếu một trong hai biến thì không gửi gì (im lặng). Việc gửi chạy trong `ctx.waitUntil`; lỗi Telegram chỉ ghi log ngắn (không có token/URL), không làm hỏng luồng đặt hàng.
Code: `app/lib/telegram.ts` (định dạng + gửi), `app/lib/notify.server.ts` (đọc đơn từ D1 + móc sự kiện). Test: `tests/telegram.test.ts`.
