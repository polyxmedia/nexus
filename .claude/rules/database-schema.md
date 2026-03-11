---
paths:
  - "lib/db/schema.ts"
  - "lib/db/index.ts"
  - "lib/db/ensure-tables.ts"
---

# Database & Schema Rules

@DATABASE.md

## CRITICAL

- Schema uses `pgTable` from `drizzle-orm/pg-core`. NEVER use sqliteTable.
- **DO NOT run `drizzle-kit push`**. The `knowledge` table has a pgvector `embedding` column (vector(1024)) managed outside Drizzle. Push will try to drop it.
- Create new tables via raw SQL instead (use `lib/db/ensure-tables.ts` or inline in API routes).

## Connection

- Local: `postgresql://andrefigueira@localhost:5432/nexus` (Herd)
- Production: Neon serverless PostgreSQL
- Auto-detected in `lib/db/index.ts`

## Schema Conventions

- All tables use `pgTable` with snake_case column names
- IDs: `serial("id").primaryKey()` for internal, `uuid("uuid").notNull().defaultRandom().unique()` for external references
- Dates stored as ISO strings via `text("created_at").$defaultFn(() => new Date().toISOString())`
- JSON fields stored as `text()` and parsed in application code
- Foreign keys: `.references(() => parentTable.id)`
- Status fields: `text("status").notNull().default("value")`
- Confidence/scores: `doublePrecision()` for 0-1 ranges

## Adding a New Table

1. Define in `lib/db/schema.ts` using `pgTable`
2. Create via raw SQL in `lib/db/ensure-tables.ts` or a setup script
3. Update `.context/DATABASE.md` with the new table
4. NEVER use drizzle-kit push/migrate
