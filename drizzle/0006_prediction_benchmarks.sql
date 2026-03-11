-- External Prediction Benchmarks
-- Stores questions from prediction markets (Metaculus, Polymarket, Manifold)
-- and NEXUS predictions against them for head-to-head accuracy comparison.

CREATE TABLE IF NOT EXISTS prediction_benchmarks (
  id SERIAL PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- External source
  source TEXT NOT NULL,               -- metaculus | polymarket | manifold
  external_id TEXT NOT NULL,          -- ID on the source platform
  external_url TEXT,                  -- Link to the question on source

  -- Question details
  question TEXT NOT NULL,             -- The prediction question text
  category TEXT NOT NULL,             -- geopolitical | market | technology | science | politics
  resolution_date TEXT,               -- When the question resolves (ISO date)

  -- Crowd consensus
  crowd_probability DOUBLE PRECISION, -- Current crowd/market probability (0-1)
  crowd_probability_at_prediction DOUBLE PRECISION, -- Crowd prob when NEXUS made its prediction

  -- NEXUS prediction
  nexus_probability DOUBLE PRECISION, -- NEXUS predicted probability (0-1)
  nexus_reasoning TEXT,               -- Brief reasoning for NEXUS prediction
  nexus_predicted_at TEXT,            -- When NEXUS made its prediction (ISO datetime)

  -- Resolution
  resolved INTEGER NOT NULL DEFAULT 0,  -- 0 = unresolved, 1 = resolved
  outcome INTEGER,                     -- 1 = yes, 0 = no, null = unresolved
  resolved_at TEXT,                   -- When resolved (ISO datetime)

  -- Scoring
  nexus_brier DOUBLE PRECISION,       -- NEXUS Brier: (nexus_probability - outcome)^2
  crowd_brier DOUBLE PRECISION,       -- Crowd Brier: (crowd_probability_at_prediction - outcome)^2

  -- Metadata
  last_synced_at TEXT,                -- Last time we synced crowd probability
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Index for finding unresolved benchmarks to sync
CREATE INDEX IF NOT EXISTS idx_benchmarks_unresolved ON prediction_benchmarks (resolved, source) WHERE resolved = 0;
-- Index for scoring queries
CREATE INDEX IF NOT EXISTS idx_benchmarks_resolved ON prediction_benchmarks (resolved, source) WHERE resolved = 1;
-- Prevent duplicate external questions
CREATE UNIQUE INDEX IF NOT EXISTS idx_benchmarks_source_external ON prediction_benchmarks (source, external_id);
