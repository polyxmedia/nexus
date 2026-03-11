-- Add publish support and execution logs to backtest_runs
ALTER TABLE backtest_runs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;
ALTER TABLE backtest_runs ADD COLUMN IF NOT EXISTS publish_slug TEXT;
ALTER TABLE backtest_runs ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS idx_backtest_runs_publish_slug ON backtest_runs(publish_slug) WHERE publish_slug IS NOT NULL;
