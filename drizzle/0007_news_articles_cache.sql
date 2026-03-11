-- News articles cache table for fast page loads
-- Background job fetches from RSS/GDELT/NewsData and stores here
CREATE TABLE IF NOT EXISTS news_articles (
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
);

-- Index for fast category filtering and recency sorting
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles (category);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_fetched_at ON news_articles (fetched_at DESC);
