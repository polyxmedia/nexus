-- Track tweet IDs on predictions for quote-tweet resolutions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS tweet_id TEXT;

-- General twitter post log for admin visibility
CREATE TABLE IF NOT EXISTS twitter_posts (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT NOT NULL,
  tweet_type TEXT NOT NULL, -- prediction | resolution | analyst | reply
  content TEXT NOT NULL,
  prediction_id INTEGER REFERENCES predictions(id),
  quote_tweet_id TEXT, -- if this was a quote tweet, the original tweet ID
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_twitter_posts_type ON twitter_posts(tweet_type);
CREATE INDEX IF NOT EXISTS idx_twitter_posts_created ON twitter_posts(created_at DESC);
