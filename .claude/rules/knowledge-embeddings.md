---
paths:
  - "lib/knowledge/**/*.ts"
  - "app/api/knowledge/**/*.ts"
  - "app/knowledge/**/*.tsx"
---

# Knowledge Bank Rules

@SYSTEMS.md @DATABASE.md

## CRITICAL

The `knowledge` table has a pgvector `embedding` column (vector(1024)) managed OUTSIDE Drizzle.
- Do NOT modify this table via Drizzle push/migrate
- Embeddings generated via Voyage AI (1024-dim)
- Semantic search uses pgvector cosine similarity

## Knowledge Categories

Valid categories: `thesis`, `model`, `event`, `actor`, `market`, `geopolitical`, `technical`

## Status Lifecycle

`active` -> `archived` or `superseded`

## Embedding Pattern

1. Content goes into `knowledge` table text fields
2. Voyage AI generates 1024-dim embedding
3. Embedding stored in pgvector column via raw SQL
4. Search uses cosine similarity: `1 - (embedding <=> query_embedding)`

## Chat Integration

The `search_knowledge` chat tool performs semantic search against the knowledge bank.
Results include relevance score and are injected into chat context.
