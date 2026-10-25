-- Chatbot: RAG index, per-day question counters, monthly spend. No chat text is stored.
CREATE TABLE chat_chunks (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, url TEXT, body TEXT NOT NULL,
 terms TEXT NOT NULL, ref TEXT, updated_at INTEGER NOT NULL
);
-- subject = 'v:' + SHA-256(salt:day:ip) for one visitor, or 'shop' for the whole shop. Rows older than chatbot.usageRetentionDays are purged by the cron.
CREATE TABLE chat_usage (day TEXT NOT NULL, subject TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day, subject));
CREATE TABLE chat_spend (
 month TEXT PRIMARY KEY, requests INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0,
 output_tokens INTEGER NOT NULL DEFAULT 0, cost_vnd REAL NOT NULL DEFAULT 0, alerted_at INTEGER
);
CREATE TABLE chat_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
