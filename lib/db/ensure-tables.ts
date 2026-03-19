/**
 * Ensure all tables exist in the database.
 * Uses CREATE TABLE/INDEX IF NOT EXISTS so it's fully idempotent.
 * Called once on server startup via instrumentation.ts.
 *
 * SQL is embedded here (not read from drizzle/ files) because
 * Vercel serverless doesn't include non-imported files in the bundle.
 *
 * Each entry is a single SQL statement. Neon's serverless driver
 * doesn't support multi-statement queries in one call.
 */

const STATEMENTS: string[] = [
  // 0001: analyst_memory
  `CREATE TABLE IF NOT EXISTS analyst_memory (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'preference',
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    last_used TEXT,
    use_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    updated_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_analyst_memory_user ON analyst_memory(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_analyst_memory_category ON analyst_memory(user_id, category)`,
  `ALTER TABLE chat_projects ADD COLUMN IF NOT EXISTS user_id TEXT`,
  `ALTER TABLE chat_projects ADD COLUMN IF NOT EXISTS instructions TEXT`,
  `ALTER TABLE chat_projects ADD COLUMN IF NOT EXISTS context TEXT`,
  `ALTER TABLE chat_projects ADD COLUMN IF NOT EXISTS updated_at TEXT`,
  `CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id INTEGER REFERENCES chat_sessions(id),
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    extracted_text TEXT,
    knowledge_id INTEGER REFERENCES knowledge(id),
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_session ON documents(session_id)`,

  // 0002: manual_positions
  `CREATE TABLE IF NOT EXISTS manual_positions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    direction TEXT NOT NULL DEFAULT 'long',
    quantity DOUBLE PRECISION NOT NULL,
    avg_cost DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    close_price DOUBLE PRECISION,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_manual_positions_user_id ON manual_positions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_manual_positions_user_open ON manual_positions (user_id, closed_at)`,

  // 0003: indexes on existing tables
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions (stripe_customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_credit_balances_user_id ON credit_balances (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages (session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_predictions_deadline ON predictions (deadline)`,
  `CREATE INDEX IF NOT EXISTS idx_predictions_outcome ON predictions (outcome)`,
  `CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history (alert_id)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events (path)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at)`,

  // 0004: audit_logs
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id serial PRIMARY KEY,
    user_id text NOT NULL,
    action text NOT NULL,
    target text,
    metadata jsonb,
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at)`,

  // 0005: backtest publish columns
  `ALTER TABLE backtest_runs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false`,
  `ALTER TABLE backtest_runs ADD COLUMN IF NOT EXISTS publish_slug TEXT`,
  `ALTER TABLE backtest_runs ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb`,

  // 0006: prediction_benchmarks
  `CREATE TABLE IF NOT EXISTS prediction_benchmarks (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    external_url TEXT,
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    resolution_date TEXT,
    crowd_probability DOUBLE PRECISION,
    crowd_probability_at_prediction DOUBLE PRECISION,
    nexus_probability DOUBLE PRECISION,
    nexus_reasoning TEXT,
    nexus_predicted_at TEXT,
    resolved INTEGER NOT NULL DEFAULT 0,
    outcome INTEGER,
    resolved_at TEXT,
    nexus_brier DOUBLE PRECISION,
    crowd_brier DOUBLE PRECISION,
    last_synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_benchmarks_unresolved ON prediction_benchmarks (resolved, source) WHERE resolved = false`,
  `CREATE INDEX IF NOT EXISTS idx_benchmarks_resolved ON prediction_benchmarks (resolved, source) WHERE resolved = true`,

  // 0007: news_articles
  `CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    bias TEXT,
    published_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT NOW()::TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles (category)`,
  `CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles (published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_news_articles_fetched_at ON news_articles (fetched_at DESC)`,

  // 0008: twitter_replies
  `CREATE TABLE IF NOT EXISTS twitter_replies (
    id SERIAL PRIMARY KEY,
    tweet_id TEXT NOT NULL UNIQUE,
    author_username TEXT NOT NULL,
    original_text TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    reply_tweet_id TEXT,
    query TEXT,
    created_at TEXT NOT NULL DEFAULT NOW()::TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_twitter_replies_tweet_id ON twitter_replies (tweet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_twitter_replies_author ON twitter_replies (author_username)`,
  `CREATE INDEX IF NOT EXISTS idx_twitter_replies_created_at ON twitter_replies (created_at DESC)`,

  // 0009: data_cache
  `CREATE TABLE IF NOT EXISTS data_cache (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT NOW()::TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_data_cache_key ON data_cache (key)`,

  // 0010: blog_posts
  `CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL,
    prediction_id INTEGER REFERENCES predictions(id),
    status TEXT NOT NULL DEFAULT 'draft',
    author TEXT NOT NULL DEFAULT 'NEXUS Research Desk',
    reading_time INTEGER,
    tags TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT NOW()::TEXT,
    updated_at TEXT NOT NULL DEFAULT NOW()::TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts (slug)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts (published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts (category)`,
  // Graph performance indexes (GraphRAG, entity traversal)
  `CREATE INDEX IF NOT EXISTS idx_entities_source ON entities (source_type, source_id)`,
  `CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (type)`,
  `CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships (from_entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships (to_entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships (type)`,
  // Signal query indexes (filtered by status/date constantly)
  `CREATE INDEX IF NOT EXISTS idx_signals_status ON signals (status)`,
  `CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_signals_date ON signals (date DESC)`,
  // Knowledge query indexes
  `CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge (status)`,
  `CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge (source)`,
  `CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge (category)`,
];

export async function ensureTables() {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  // In production, tables already exist. Running 30+ DDL statements on every
  // Vercel cold start hammers Neon and causes cascading 500s.
  // Set ENSURE_TABLES=1 to force-run (e.g. after adding new migrations).
  if (process.env.NODE_ENV === "production" && process.env.ENSURE_TABLES !== "1") {
    return;
  }

  let runSql: (sql: string) => Promise<void>;
  let cleanup: (() => Promise<void>) | null = null;

  if (url.includes("neon.tech") || url.includes("vercel-storage")) {
    const { neon } = require("@neondatabase/serverless");
    const sql = neon(url);
    runSql = async (query: string) => { await sql(query); };
  } else {
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: url, max: 2 });
    runSql = async (query: string) => { await pool.query(query); };
    cleanup = async () => { try { await pool.end(); } catch {} };
  }

  let ok = 0;
  let skipped = 0;
  for (const stmt of STATEMENTS) {
    try {
      await runSql(stmt);
      ok++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "already exists" and "duplicate" are expected on re-runs
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        skipped++;
      } else {
        console.error(`[ensure-tables] Failed:`, msg, stmt.slice(0, 80));
        skipped++;
      }
    }
  }

  if (cleanup) await cleanup();
  console.log(`[ensure-tables] ${ok} applied, ${skipped} skipped (${STATEMENTS.length} total)`);
}
