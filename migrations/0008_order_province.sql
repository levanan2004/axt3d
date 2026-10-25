-- Structured province name (from the province picklist, resolved server-side) for notifications. Never parsed from free text.
ALTER TABLE orders ADD COLUMN province_name TEXT;
