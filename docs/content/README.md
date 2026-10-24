# Nội dung trang

Các file Markdown trong thư mục này là nguồn chữ cho trang, meta SEO, mô tả sản phẩm mẫu và nhãn admin/POS.

File đính kèm của chủ shop chưa có trong workspace lúc dựng nhánh này. Khi thêm file, dùng frontmatter:

```md
---
id: home
title: Tiêu đề trang
description: Mô tả meta
---
```

`id` đã nối vào code: `home`, `danh-muc`, `lien-he`, `labels`, `mo-ta-san-pham`, `dieu-khoan`, `chinh-sach-bao-mat`, `doi-tra-hoan-tien`, `van-chuyen`, `dat-in`, `pos`, `san-xuat`, `bao-cao`, `doi-soat`.

- `{config.shipping.flatFee}` và `{config.deposit.rate}` được thay bằng số trong `config/shop-config.json`.
- `{TEN_SHOP}` và token IN HOA khác giữ nguyên trên trang, trừ khi có giá trị trong `config/site-info.json` → `placeholders`. Không điền danh tính giả.

Nhãn admin/POS nằm trong file `id: labels`, mỗi dòng `admin.orders: ...`.

Mô tả sản phẩm mẫu nằm trong file `id: mo-ta-san-pham`, mỗi mục bắt đầu bằng `## slug`.

Slug pháp lý: `/dieu-khoan`, `/chinh-sach-bao-mat`, `/doi-tra-hoan-tien`, `/van-chuyen`. Đường cũ `/chinh-sach/...` chuyển hướng 301.
