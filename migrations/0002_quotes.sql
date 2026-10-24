PRAGMA foreign_keys = OFF;
DROP TRIGGER IF EXISTS release_inventory;
CREATE TABLE order_items_v2 (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id),
 variant_id TEXT REFERENCES variants(id),
 product_name TEXT NOT NULL,
 variant_name TEXT NOT NULL,
 image TEXT NOT NULL,
 unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
 quantity INTEGER NOT NULL CHECK(quantity > 0)
);
INSERT INTO order_items_v2(id,order_id,variant_id,product_name,variant_name,image,unit_price,quantity)
 SELECT id,order_id,variant_id,product_name,variant_name,image,unit_price,quantity FROM order_items;
DROP TABLE order_items;
ALTER TABLE order_items_v2 RENAME TO order_items;
CREATE UNIQUE INDEX order_items_variant ON order_items(order_id, variant_id) WHERE variant_id IS NOT NULL;
CREATE TRIGGER reserve_inventory BEFORE INSERT ON order_items WHEN NEW.variant_id IS NOT NULL BEGIN
 UPDATE variants SET stock = stock - NEW.quantity
 WHERE id = NEW.variant_id AND active = 1 AND stock >= NEW.quantity
 AND price = NEW.unit_price AND EXISTS (SELECT 1 FROM products p WHERE p.id = variants.product_id AND p.active = 1);
 SELECT CASE WHEN changes() != 1 THEN RAISE(ABORT, 'STOCK_OR_PRICE_CHANGED') END;
END;
ALTER TABLE orders ADD COLUMN channel TEXT NOT NULL DEFAULT 'web';
ALTER TABLE orders ADD COLUMN quote_id TEXT;
CREATE TABLE quotes (
 id TEXT PRIMARY KEY,
 code TEXT NOT NULL UNIQUE,
 access_hash TEXT NOT NULL,
 project_name TEXT NOT NULL,
 customer_name TEXT NOT NULL,
 phone TEXT NOT NULL,
 email TEXT NOT NULL DEFAULT '',
 note TEXT NOT NULL DEFAULT '',
 material_id TEXT NOT NULL,
 color_name TEXT NOT NULL,
 post_process TEXT NOT NULL,
 quantity INTEGER NOT NULL,
 grams REAL,
 hours REAL,
 computed_amount INTEGER,
 quoted_amount INTEGER,
 override_reason TEXT NOT NULL DEFAULT '',
 lead_note TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL,
 order_id TEXT,
 expires_at INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX quotes_status ON quotes(status, created_at DESC);
CREATE TABLE quote_files (
 id TEXT PRIMARY KEY,
 quote_id TEXT NOT NULL REFERENCES quotes(id),
 r2_key TEXT NOT NULL,
 filename TEXT NOT NULL,
 bytes INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE quote_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 quote_id TEXT NOT NULL REFERENCES quotes(id),
 actor TEXT NOT NULL,
 action TEXT NOT NULL,
 detail TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TRIGGER release_inventory AFTER UPDATE OF status ON orders WHEN NEW.status='da_huy' AND OLD.status!='da_huy' BEGIN
 UPDATE variants SET stock=stock+COALESCE((SELECT quantity FROM order_items WHERE order_id=NEW.id AND variant_id=variants.id),0)
 WHERE id IN(SELECT variant_id FROM order_items WHERE order_id=NEW.id);
 UPDATE orders SET refund_required=CASE WHEN received_amount>0 THEN 1 ELSE 0 END WHERE id=NEW.id;
 UPDATE payments SET disposition='refund_required' WHERE order_id=NEW.id AND direction='in';
END;
PRAGMA foreign_keys = ON;
