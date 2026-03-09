-- Migration: Memory, Enhanced Projects, Documents
-- Run manually: psql -d nexus -f drizzle/0001_memory_projects_documents.sql

-- ── Analyst Memory ──
-- Persistent per-user memories the AI recalls across sessions
CREATE TABLE IF NOT EXISTS analyst_memory (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'preference',  -- preference | thesis | portfolio | context | instruction
  key TEXT NOT NULL,                              -- short label (e.g. "risk_tolerance", "long_energy")
  value TEXT NOT NULL,                            -- the memory content
  last_used TEXT,                                 -- ISO timestamp of last retrieval
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_analyst_memory_user ON analyst_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_analyst_memory_category ON analyst_memory(user_id, category);

-- ── Enhanced Projects ──
-- Add user scoping, custom instructions, and context to chat_projects
ALTER TABLE chat_projects ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE chat_projects ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE chat_projects ADD COLUMN IF NOT EXISTS context TEXT;          -- JSON: pinned knowledge IDs, symbols, etc.
ALTER TABLE chat_projects ADD COLUMN IF NOT EXISTS updated_at TEXT;

-- ── Documents ──
-- Track uploaded files and their knowledge bank links
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id INTEGER REFERENCES chat_sessions(id),
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,                          -- bytes
  extracted_text TEXT,                             -- full text content extracted from file
  knowledge_id INTEGER REFERENCES knowledge(id),  -- link to knowledge bank entry if saved
  metadata TEXT,                                   -- JSON: extra info (page count, etc.)
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_session ON documents(session_id);
