DROP TRIGGER IF EXISTS validate_status;
CREATE TRIGGER validate_status BEFORE UPDATE OF status ON orders WHEN OLD.status != NEW.status BEGIN
 SELECT CASE WHEN NOT (
 (OLD.status='cho_coc' AND NEW.status IN('da_coc','da_huy')) OR
 (OLD.status='da_coc' AND NEW.status IN('dang_chuan_bi','da_huy')) OR
 (OLD.status='da_coc' AND NEW.status='hoan_thanh' AND NEW.channel='pos') OR
 (OLD.status='dang_chuan_bi' AND NEW.status IN('da_giao_van_chuyen','da_huy')) OR
 (OLD.status='da_giao_van_chuyen' AND NEW.status='hoan_thanh')
 ) THEN RAISE(ABORT, 'INVALID_ORDER_TRANSITION') END;
 SELECT CASE WHEN NEW.status='da_coc' AND NEW.credited_amount < NEW.deposit_amount THEN RAISE(ABORT,'DEPOSIT_NOT_RECEIVED') END;
 SELECT CASE WHEN NEW.status='da_giao_van_chuyen' AND length(trim(COALESCE(NEW.tracking_code,'')))=0 THEN RAISE(ABORT,'TRACKING_REQUIRED') END;
END;
DROP TRIGGER IF EXISTS apply_payment;
CREATE TRIGGER apply_payment AFTER INSERT ON payments WHEN NEW.direction='in' AND NEW.order_id IS NOT NULL BEGIN
 UPDATE orders SET status='da_huy',updated_at=NEW.received_at WHERE id=NEW.order_id AND status='cho_coc' AND expires_at<=NEW.received_at;
 UPDATE payments SET disposition=CASE WHEN (SELECT status FROM orders WHERE id=NEW.order_id)='da_huy' THEN 'refund_required' ELSE 'accepted' END WHERE transaction_id=NEW.transaction_id;
 UPDATE orders SET received_amount=received_amount+NEW.amount,
 credited_amount=credited_amount+CASE WHEN status!='da_huy' THEN NEW.amount ELSE 0 END,
 refund_required=CASE WHEN status='da_huy' OR received_amount+NEW.amount>items_subtotal+shipping_fee THEN 1 ELSE refund_required END,
 updated_at=NEW.received_at WHERE id=NEW.order_id;
 UPDATE orders SET status='da_coc' WHERE id=NEW.order_id AND status='cho_coc' AND credited_amount>=deposit_amount;
 UPDATE orders SET status='hoan_thanh' WHERE id=NEW.order_id AND channel='pos' AND status='da_coc' AND credited_amount>=items_subtotal+shipping_fee;
END;
ALTER TABLE variants ADD COLUMN cost_price INTEGER;
CREATE TABLE production_jobs (
 id TEXT PRIMARY KEY,
 order_code TEXT NOT NULL,
 title TEXT NOT NULL,
 material TEXT NOT NULL DEFAULT '',
 estimate_hours REAL,
 printer TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE cod_reconciliations (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 collected_amount INTEGER,
 state TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 updated_at INTEGER NOT NULL
);
