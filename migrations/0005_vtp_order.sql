-- Viettel Post order creation: VTP order number per order, a send lock for idempotency, and webhook dedupe.
ALTER TABLE orders ADD COLUMN vtp_order_number TEXT;
ALTER TABLE orders ADD COLUMN vtp_state TEXT;
ALTER TABLE orders ADD COLUMN vtp_error TEXT;
ALTER TABLE orders ADD COLUMN vtp_locked_at INTEGER;
CREATE UNIQUE INDEX orders_vtp_order_number ON orders(vtp_order_number) WHERE vtp_order_number IS NOT NULL;
CREATE TABLE vtp_webhook_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_number TEXT NOT NULL,
 status INTEGER NOT NULL,
 status_name TEXT NOT NULL DEFAULT '',
 received_at INTEGER NOT NULL,
 UNIQUE(order_number, status)
);
-- Same rules as 0003, plus da_coc -> da_giao_van_chuyen when the VTP order is created straight from "Đã cọc".
DROP TRIGGER IF EXISTS validate_status;
CREATE TRIGGER validate_status BEFORE UPDATE OF status ON orders WHEN OLD.status != NEW.status BEGIN
 SELECT CASE WHEN NOT (
 (OLD.status='cho_coc' AND NEW.status IN('da_coc','da_huy')) OR
 (OLD.status='da_coc' AND NEW.status IN('dang_chuan_bi','da_huy','da_giao_van_chuyen')) OR
 (OLD.status='da_coc' AND NEW.status='hoan_thanh' AND NEW.channel='pos') OR
 (OLD.status='dang_chuan_bi' AND NEW.status IN('da_giao_van_chuyen','da_huy')) OR
 (OLD.status='da_giao_van_chuyen' AND NEW.status='hoan_thanh')
 ) THEN RAISE(ABORT, 'INVALID_ORDER_TRANSITION') END;
 SELECT CASE WHEN NEW.status='da_coc' AND NEW.credited_amount < NEW.deposit_amount THEN RAISE(ABORT,'DEPOSIT_NOT_RECEIVED') END;
 SELECT CASE WHEN NEW.status='da_giao_van_chuyen' AND length(trim(COALESCE(NEW.tracking_code,'')))=0 THEN RAISE(ABORT,'TRACKING_REQUIRED') END;
END;
