-- Track tweets we've replied to so we never respond twice
CREATE TABLE IF NOT EXISTS twitter_replies (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT NOT NULL UNIQUE,
  author_username TEXT NOT NULL,
  original_text TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  reply_tweet_id TEXT,
  query TEXT,
  created_at TEXT NOT NULL DEFAULT NOW()::TEXT
);

CREATE INDEX IF NOT EXISTS idx_twitter_replies_tweet_id ON twitter_replies (tweet_id);
CREATE INDEX IF NOT EXISTS idx_twitter_replies_author ON twitter_replies (author_username);
CREATE INDEX IF NOT EXISTS idx_twitter_replies_created_at ON twitter_replies (created_at DESC);
