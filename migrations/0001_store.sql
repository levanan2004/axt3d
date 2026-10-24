PRAGMA foreign_keys = ON;
CREATE TABLE products (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', image TEXT NOT NULL,
 images TEXT NOT NULL DEFAULT '[]', badge TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX products_category ON products(category, active);
CREATE TABLE variants (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), sku TEXT NOT NULL UNIQUE,
 color TEXT NOT NULL, color_hex TEXT NOT NULL, material TEXT NOT NULL, size TEXT NOT NULL DEFAULT 'Tiêu chuẩn',
 price INTEGER NOT NULL CHECK(price >= 1000), stock INTEGER NOT NULL CHECK(stock >= 0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1))
);
CREATE INDEX variants_product ON variants(product_id, active);
CREATE TABLE customers (id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, name TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE orders (
 id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, customer_id TEXT NOT NULL REFERENCES customers(id),
 customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'cho_coc' CHECK(status IN('cho_coc','da_coc','dang_chuan_bi','da_giao_van_chuyen','hoan_thanh','da_huy')),
 items_subtotal INTEGER NOT NULL CHECK(items_subtotal >= 0), shipping_fee INTEGER NOT NULL CHECK(shipping_fee >= 0),
 deposit_amount INTEGER NOT NULL CHECK(deposit_amount >= 0 AND deposit_amount <= items_subtotal), cod_amount INTEGER NOT NULL CHECK(cod_amount >= 0),
 received_amount INTEGER NOT NULL DEFAULT 0, credited_amount INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 tracking_code TEXT, access_hash TEXT NOT NULL, checkout_key TEXT NOT NULL UNIQUE,
 refund_required INTEGER NOT NULL DEFAULT 0 CHECK(refund_required IN(0,1)),
 CHECK(deposit_amount + cod_amount = items_subtotal + shipping_fee)
);
CREATE INDEX orders_expiry ON orders(status, expires_at);
CREATE INDEX orders_created ON orders(created_at DESC);
CREATE TABLE order_items (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), variant_id TEXT NOT NULL REFERENCES variants(id),
 product_name TEXT NOT NULL, variant_name TEXT NOT NULL, image TEXT NOT NULL,
 unit_price INTEGER NOT NULL CHECK(unit_price >= 0), quantity INTEGER NOT NULL CHECK(quantity > 0), UNIQUE(order_id, variant_id)
);
CREATE TABLE order_events (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id), status TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX order_events_order ON order_events(order_id, id);
CREATE TABLE payments (
 transaction_id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id), amount INTEGER NOT NULL CHECK(amount > 0),
 direction TEXT NOT NULL CHECK(direction IN('in','out')), content TEXT NOT NULL, account_number TEXT NOT NULL,
 received_at INTEGER NOT NULL, disposition TEXT NOT NULL DEFAULT 'unmatched'
);
CREATE INDEX payments_order ON payments(order_id);
CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);

-- The trigger and parent D1 batch are one transaction. A single failed line rolls back the entire order.
CREATE TRIGGER reserve_inventory BEFORE INSERT ON order_items BEGIN
 UPDATE variants SET stock = stock - NEW.quantity
 WHERE id = NEW.variant_id AND active = 1 AND stock >= NEW.quantity
 AND price = NEW.unit_price AND EXISTS (SELECT 1 FROM products p WHERE p.id = variants.product_id AND p.active = 1);
 SELECT CASE WHEN changes() != 1 THEN RAISE(ABORT, 'STOCK_OR_PRICE_CHANGED') END;
END;
CREATE TRIGGER order_created AFTER INSERT ON orders BEGIN
 INSERT INTO order_events(order_id,status,created_at) VALUES(NEW.id,NEW.status,NEW.created_at);
END;
CREATE TRIGGER validate_status BEFORE UPDATE OF status ON orders WHEN OLD.status != NEW.status BEGIN
 SELECT CASE WHEN NOT (
 (OLD.status='cho_coc' AND NEW.status IN('da_coc','da_huy')) OR
 (OLD.status='da_coc' AND NEW.status IN('dang_chuan_bi','da_huy')) OR
 (OLD.status='dang_chuan_bi' AND NEW.status IN('da_giao_van_chuyen','da_huy')) OR
 (OLD.status='da_giao_van_chuyen' AND NEW.status='hoan_thanh')
 ) THEN RAISE(ABORT, 'INVALID_ORDER_TRANSITION') END;
 SELECT CASE WHEN NEW.status='da_coc' AND NEW.credited_amount < NEW.deposit_amount THEN RAISE(ABORT,'DEPOSIT_NOT_RECEIVED') END;
 SELECT CASE WHEN NEW.status='da_giao_van_chuyen' AND length(trim(COALESCE(NEW.tracking_code,'')))=0 THEN RAISE(ABORT,'TRACKING_REQUIRED') END;
END;
CREATE TRIGGER order_status_changed AFTER UPDATE OF status ON orders WHEN OLD.status != NEW.status BEGIN
 INSERT INTO order_events(order_id,status,created_at) VALUES(NEW.id,NEW.status,NEW.updated_at);
END;
CREATE TRIGGER release_inventory AFTER UPDATE OF status ON orders WHEN NEW.status='da_huy' AND OLD.status!='da_huy' BEGIN
 UPDATE variants SET stock=stock+COALESCE((SELECT quantity FROM order_items WHERE order_id=NEW.id AND variant_id=variants.id),0)
 WHERE id IN(SELECT variant_id FROM order_items WHERE order_id=NEW.id);
 UPDATE orders SET refund_required=CASE WHEN received_amount>0 THEN 1 ELSE 0 END WHERE id=NEW.id;
 UPDATE payments SET disposition='refund_required' WHERE order_id=NEW.id AND direction='in';
END;
-- UNIQUE transaction_id + this trigger make receipt, status and stock handling atomic under retries/races.
CREATE TRIGGER apply_payment AFTER INSERT ON payments WHEN NEW.direction='in' AND NEW.order_id IS NOT NULL BEGIN
 UPDATE orders SET status='da_huy',updated_at=NEW.received_at WHERE id=NEW.order_id AND status='cho_coc' AND expires_at<=NEW.received_at;
 UPDATE payments SET disposition=CASE WHEN (SELECT status FROM orders WHERE id=NEW.order_id)='da_huy' THEN 'refund_required' ELSE 'accepted' END WHERE transaction_id=NEW.transaction_id;
 UPDATE orders SET received_amount=received_amount+NEW.amount,
 credited_amount=credited_amount+CASE WHEN status!='da_huy' THEN NEW.amount ELSE 0 END,
 refund_required=CASE WHEN status='da_huy' OR received_amount+NEW.amount>items_subtotal+shipping_fee THEN 1 ELSE refund_required END,
 updated_at=NEW.received_at WHERE id=NEW.order_id;
 UPDATE orders SET status='da_coc' WHERE id=NEW.order_id AND status='cho_coc' AND credited_amount>=deposit_amount;
END;
