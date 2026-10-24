import config from "../../config/shop-config.json";
export const shopConfig = config;
export const categories = [
  { slug: "mo-hinh-3d", name: "Mô hình 3D", icon: "box" },
  { slug: "phu-kien", name: "Phụ kiện", icon: "smartphone" },
  { slug: "qua-tang", name: "Quà tặng", icon: "gift" },
  { slug: "do-trang-tri", name: "Đồ trang trí", icon: "flower" },
  { slug: "nhan-vat-fantasy", name: "Nhân vật & Fantasy", icon: "sparkles" },
  { slug: "do-gia-dung", name: "Đồ gia dụng", icon: "home" },
] as const;
export type OrderStatus = "cho_coc" | "da_coc" | "dang_chuan_bi" | "da_giao_van_chuyen" | "hoan_thanh" | "da_huy";
export const statusLabels: Record<OrderStatus, string> = { cho_coc: "Chờ cọc", da_coc: "Đã cọc", dang_chuan_bi: "Đang chuẩn bị", da_giao_van_chuyen: "Đã giao vận chuyển", hoan_thanh: "Hoàn thành", da_huy: "Đã hủy" };
export const statusFlow: OrderStatus[] = shopConfig.orderStatuses.filter(s => s !== "da_huy") as OrderStatus[];
