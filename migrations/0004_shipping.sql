-- Viettel Post shipping: packed weight per product and the address ids/fee source per order.
ALTER TABLE products ADD COLUMN packed_weight_gram INTEGER;
ALTER TABLE orders ADD COLUMN province_id INTEGER;
ALTER TABLE orders ADD COLUMN ward_id INTEGER;
ALTER TABLE orders ADD COLUMN shipping_weight_gram INTEGER;
ALTER TABLE orders ADD COLUMN shipping_service TEXT;
ALTER TABLE orders ADD COLUMN shipping_fee_fallback INTEGER NOT NULL DEFAULT 0;