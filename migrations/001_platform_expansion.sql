-- NEXUS Platform Expansion: 19 new tables
-- Run with: psql postgresql://andrefigueira@localhost:5432/nexus -f migrations/001_platform_expansion.sql

BEGIN;

-- ── Feature 1: Automated Execution Layer ──

CREATE TABLE IF NOT EXISTS execution_rules (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  conditions TEXT NOT NULL,         -- JSON: {minConvergence, regime, signalLayers, tickers, minConfidence}
  sizing_strategy TEXT NOT NULL DEFAULT 'tier',  -- kelly | fixed | tier
  sizing_params TEXT,               -- JSON: {fixedAmount, kellyFraction, maxPositionPct}
  bracket_config TEXT,              -- JSON: {stopPct, takeProfitPct, trailingStop}
  broker TEXT NOT NULL DEFAULT 't212', -- t212 | coinbase | alpaca
  max_daily_orders INTEGER NOT NULL DEFAULT 5,
  max_position_pct DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  orders_today INTEGER NOT NULL DEFAULT 0,
  last_reset_date TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS execution_log (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER REFERENCES execution_rules(id),
  user_id TEXT NOT NULL,
  signal_id INTEGER,
  prediction_id INTEGER,
  trade_id INTEGER,
  action TEXT NOT NULL,              -- triggered | executed | blocked | killed | error
  details TEXT,                      -- JSON: full context
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS kill_switch (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  activated_at TEXT,
  activated_by TEXT
);

-- ── Feature 2: NLP Sentiment Analysis ──

CREATE TABLE IF NOT EXISTS sentiment_analyses (
  id SERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,         -- news | central_bank | earnings | speech
  source_url TEXT,
  source_title TEXT,
  raw_text TEXT,
  sentiment_score DOUBLE PRECISION,  -- -1 to 1
  confidence DOUBLE PRECISION,       -- 0 to 1
  tone_breakdown TEXT,               -- JSON: {hawkish, dovish, uncertainty, urgency, optimism}
  entities_mentioned TEXT,           -- JSON array
  key_claims TEXT,                   -- JSON array
  market_implications TEXT,          -- JSON: {bonds, equities, dollar, gold, crypto}
  model_used TEXT,
  tokens_used INTEGER,
  credits_used INTEGER,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE INDEX IF NOT EXISTS idx_sentiment_source_type ON sentiment_analyses(source_type);
CREATE INDEX IF NOT EXISTS idx_sentiment_created_at ON sentiment_analyses(created_at);

-- ── Feature 3: Order Book / Microstructure ──

CREATE TABLE IF NOT EXISTS orderbook_snapshots (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'coinbase',
  bids TEXT,                         -- JSON array of [price, size] pairs
  asks TEXT,                         -- JSON array of [price, size] pairs
  spread_bps DOUBLE PRECISION,
  imbalance_ratio DOUBLE PRECISION,  -- bid_volume / (bid_volume + ask_volume)
  depth_5_bid DOUBLE PRECISION,      -- total bid volume at top 5 levels
  depth_5_ask DOUBLE PRECISION,      -- total ask volume at top 5 levels
  mid_price DOUBLE PRECISION,
  snapshot_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE INDEX IF NOT EXISTS idx_orderbook_symbol ON orderbook_snapshots(symbol);

CREATE TABLE IF NOT EXISTS flow_imbalance_alerts (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  imbalance_ratio DOUBLE PRECISION NOT NULL,
  direction TEXT NOT NULL,           -- buy_pressure | sell_pressure
  magnitude DOUBLE PRECISION NOT NULL,
  snapshot_id INTEGER REFERENCES orderbook_snapshots(id),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

-- ── Feature 4: Supply Chain Network Graph ──

CREATE TABLE IF NOT EXISTS supply_chain_edges (
  id SERIAL PRIMARY KEY,
  from_entity TEXT NOT NULL,         -- ticker or entity name
  to_entity TEXT NOT NULL,           -- ticker or entity name
  relationship_type TEXT NOT NULL,   -- supplier | customer | competitor | input | logistics | regulatory
  strength DOUBLE PRECISION NOT NULL DEFAULT 0.5,  -- 0-1
  lag_days INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',  -- manual | sec_filing | news | ai_inferred
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  evidence TEXT,
  valid_from TEXT,
  valid_until TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_supply_chain_from ON supply_chain_edges(from_entity);
CREATE INDEX IF NOT EXISTS idx_supply_chain_to ON supply_chain_edges(to_entity);

CREATE TABLE IF NOT EXISTS supply_chain_snapshots (
  id SERIAL PRIMARY KEY,
  root_entity TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 3,
  snapshot TEXT NOT NULL,             -- JSON: full subgraph
  exposure_summary TEXT,             -- JSON: risk breakdown
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

-- ── Feature 5: Satellite Imagery ──

CREATE TABLE IF NOT EXISTS satellite_imagery (
  id SERIAL PRIMARY KEY,
  region_name TEXT NOT NULL,
  bbox TEXT NOT NULL,                -- JSON: {north, south, east, west}
  imagery_type TEXT NOT NULL,        -- nightlights | ndvi | sar | visual
  source TEXT NOT NULL DEFAULT 'sentinel2',  -- sentinel2 | sentinel1 | viirs
  tile_url TEXT,
  thumbnail_url TEXT,
  acquisition_date TEXT,
  cloud_cover_pct DOUBLE PRECISION,
  metadata TEXT,                     -- JSON: extra satellite metadata
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS imagery_analyses (
  id SERIAL PRIMARY KEY,
  imagery_id INTEGER REFERENCES satellite_imagery(id),
  analysis_type TEXT NOT NULL,       -- change_detection | activity_level | burn_area
  result TEXT NOT NULL,              -- JSON: analysis output
  confidence DOUBLE PRECISION,
  ai_summary TEXT,
  compared_to_id INTEGER REFERENCES satellite_imagery(id),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

-- ── Feature 6: Learned Signals (ML) ──

CREATE TABLE IF NOT EXISTS ml_models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  model_type TEXT NOT NULL,          -- gradient_boost | logistic | ensemble | lstm
  target TEXT NOT NULL,              -- direction | magnitude | regime | confidence
  features_used TEXT NOT NULL,       -- JSON array of feature names
  hyperparams TEXT,                  -- JSON
  artifact TEXT,                     -- JSON: serialized model weights/tree
  training_date TEXT,
  training_window TEXT,              -- e.g. "2024-01-01:2025-12-31"
  sample_count INTEGER,
  metrics TEXT,                      -- JSON: {accuracy, precision, recall, auc, featureImportance}
  status TEXT NOT NULL DEFAULT 'training',  -- training | active | retired
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS ml_predictions (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES ml_models(id),
  prediction_date TEXT NOT NULL,
  target_symbol TEXT,
  predicted_value DOUBLE PRECISION,
  predicted_class TEXT,
  confidence DOUBLE PRECISION,
  features_snapshot TEXT,            -- JSON: input features at prediction time
  actual_value DOUBLE PRECISION,
  actual_class TEXT,
  correct INTEGER,                   -- 0 | 1 | null (unresolved)
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS feature_store (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  symbol TEXT,
  feature_name TEXT NOT NULL,
  feature_value DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE INDEX IF NOT EXISTS idx_feature_store_date ON feature_store(date);
CREATE INDEX IF NOT EXISTS idx_feature_store_name ON feature_store(feature_name);

-- ── Feature 7: Multi-Brokerage Aggregation ──

CREATE TABLE IF NOT EXISTS broker_connections (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  broker TEXT NOT NULL,              -- t212 | coinbase | alpaca
  status TEXT NOT NULL DEFAULT 'connected',  -- connected | disconnected | error
  last_sync_at TEXT,
  metadata TEXT,                     -- JSON
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_conn_user_broker ON broker_connections(user_id, broker);

CREATE TABLE IF NOT EXISTS unified_positions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  broker TEXT NOT NULL,
  symbol TEXT NOT NULL,
  normalized_symbol TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_cost DOUBLE PRECISION,
  current_price DOUBLE PRECISION,
  market_value DOUBLE PRECISION,
  unrealized_pnl DOUBLE PRECISION,
  unrealized_pnl_pct DOUBLE PRECISION,
  currency TEXT NOT NULL DEFAULT 'USD',
  asset_class TEXT NOT NULL DEFAULT 'equity',  -- equity | crypto | option | etf
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_unified_pos_user ON unified_positions(user_id);

CREATE TABLE IF NOT EXISTS unified_portfolio (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  total_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_cash DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_invested DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_pnl_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  by_broker TEXT,                    -- JSON: {t212: {value, pnl}, coinbase: ...}
  by_asset_class TEXT,               -- JSON: {equity: {value, pct}, crypto: ...}
  by_sector TEXT,                    -- JSON
  snapshot_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

-- ── Feature 9: Tiered API Rate Limiting ──

CREATE TABLE IF NOT EXISTS rate_limit_config (
  id SERIAL PRIMARY KEY,
  tier TEXT NOT NULL,                -- free | observer | operator | institution
  route_pattern TEXT NOT NULL,       -- e.g. "/api/chat" or "*" for default
  requests_per_window INTEGER NOT NULL DEFAULT 60,
  window_ms INTEGER NOT NULL DEFAULT 60000,
  burst_limit INTEGER,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_tier_route ON rate_limit_config(tier, route_pattern);

-- Insert default rate limits
INSERT INTO rate_limit_config (tier, route_pattern, requests_per_window, window_ms) VALUES
  ('free', '*', 30, 60000),
  ('observer', '*', 120, 60000),
  ('operator', '*', 300, 60000),
  ('institution', '*', 1000, 60000),
  ('free', '/api/chat', 5, 60000),
  ('observer', '/api/chat', 30, 60000),
  ('operator', '/api/chat', 100, 60000),
  ('institution', '/api/chat', -1, 60000),
  ('free', '/api/execution/*', 0, 60000),
  ('observer', '/api/execution/*', 0, 60000),
  ('operator', '/api/execution/*', 30, 60000),
  ('institution', '/api/execution/*', 100, 60000)
ON CONFLICT DO NOTHING;

-- ── Feature 10: Distributed Backtesting ──

CREATE TABLE IF NOT EXISTS backtest_workers (
  id SERIAL PRIMARY KEY,
  worker_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'idle',  -- idle | busy | dead
  current_run_id TEXT,
  current_chunk INTEGER,
  last_heartbeat TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS backtest_chunks (
  id SERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  date_start TEXT,
  date_end TEXT,
  instruments TEXT,                   -- JSON array
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | complete | failed
  worker_id TEXT,
  predictions TEXT,                   -- JSON: chunk results
  metrics TEXT,                       -- JSON: chunk-level metrics
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_backtest_chunks_run ON backtest_chunks(run_id);
CREATE INDEX IF NOT EXISTS idx_backtest_chunks_status ON backtest_chunks(status);

COMMIT;
