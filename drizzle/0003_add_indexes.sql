-- Subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions (stripe_customer_id);

-- Credit system
CREATE INDEX IF NOT EXISTS idx_credit_balances_user_id ON credit_balances (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger (user_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages (session_id);

-- Trading
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades (user_id);

-- Predictions
CREATE INDEX IF NOT EXISTS idx_predictions_deadline ON predictions (deadline);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions (status);

-- Alerts
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history (alert_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events (path);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at);
