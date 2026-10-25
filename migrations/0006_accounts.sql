-- Customer accounts (optional; checkout stays guest-capable).
-- orders.customer_id is the existing phone-keyed guest record (NOT NULL), so accounts link through a new nullable orders.account_id.
CREATE TABLE accounts (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,              -- lower-cased, trimmed
 name TEXT NOT NULL,
 avatar_url TEXT,
 password_hash TEXT,                      -- versioned: pbkdf2_sha256$<iterations>$<salt b64url>$<hash b64url>; NULL = Google-only
 email_verified INTEGER NOT NULL DEFAULT 0 CHECK(email_verified IN(0,1)),
 google_sub TEXT UNIQUE,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE account_sessions (
 token_hash TEXT PRIMARY KEY,             -- SHA-256 of the random cookie token
 account_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX account_sessions_account ON account_sessions(account_id);
CREATE TABLE account_tokens (
 token_hash TEXT PRIMARY KEY,             -- SHA-256 of the emailed token; the raw token is never stored
 account_id TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN('verify_email','reset_password','create_password')),
 expires_at INTEGER NOT NULL,
 used_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX account_tokens_account ON account_tokens(account_id, purpose);
CREATE TABLE account_addresses (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL,
 name TEXT NOT NULL,
 phone TEXT NOT NULL,
 street TEXT NOT NULL,
 province_id INTEGER NOT NULL,
 province_name TEXT NOT NULL,
 ward_id INTEGER NOT NULL,
 ward_name TEXT NOT NULL,
 is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN(0,1)),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX account_addresses_account ON account_addresses(account_id);
-- Login lockouts and per-IP / per-email limits. Keys are SHA-256 hashes, never raw emails or IPs.
CREATE TABLE auth_limits (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 window_ends INTEGER NOT NULL,
 locked_until INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE orders ADD COLUMN account_id TEXT;
CREATE INDEX orders_account ON orders(account_id, created_at DESC);
