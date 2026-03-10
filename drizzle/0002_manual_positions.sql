CREATE TABLE IF NOT EXISTS manual_positions (
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
);

CREATE INDEX idx_manual_positions_user_id ON manual_positions (user_id);
CREATE INDEX idx_manual_positions_user_open ON manual_positions (user_id, closed_at);
