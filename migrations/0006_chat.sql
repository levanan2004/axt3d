-- Chatbot (renumbered from 0005 after merging feat/10, whose 0005_vtp_order is already on staging; IF NOT EXISTS keeps local DBs that ran the old 0005_chat working):
-- Chatbot: RAG index, per-day question counters, monthly spend. No chat text is stored.
CREATE TABLE IF NOT EXISTS chat_chunks (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, url TEXT, body TEXT NOT NULL,
 terms TEXT NOT NULL, ref TEXT, updated_at INTEGER NOT NULL
);
-- subject = 'v:' + SHA-256(salt:day:ip) for one visitor, or 'shop' for the whole shop. Rows older than chatbot.usageRetentionDays are purged by the cron.
CREATE TABLE IF NOT EXISTS chat_usage (day TEXT NOT NULL, subject TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day, subject));
CREATE TABLE IF NOT EXISTS chat_spend (
 month TEXT PRIMARY KEY, requests INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0,
 output_tokens INTEGER NOT NULL DEFAULT 0, cost_vnd REAL NOT NULL DEFAULT 0, alerted_at INTEGER
);
CREATE TABLE IF NOT EXISTS chat_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
