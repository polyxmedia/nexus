# Nexus Intelligence Platform - Common Tasks

.PHONY: dev build start lint clean db-generate db-migrate db-seed \
        ingest ingest-all ingest-deterministic ingest-advanced ingest-final \
        ingest-epstein ingest-deep-geo ingest-structural \
        refresh-knowledge status-knowledge \
        typecheck

# ─── Development ───────────────────────────────────────────────

## Start dev server (clears .next cache first)
dev:
	npm run dev

## Production build
build:
	npm run build

## Start production server
start:
	npm run start

## Run linter
lint:
	npm run lint

## TypeScript type check (no emit)
typecheck:
	npx tsc --noEmit

## Clear .next cache manually
clean:
	rm -rf .next

# ─── Database ──────────────────────────────────────────────────
# WARNING: Do NOT use db-push. The knowledge table has a pgvector
# embedding column managed outside Drizzle. db-push will drop it.

## Generate Drizzle migrations
db-generate:
	npm run db:generate

## Run Drizzle migrations
db-migrate:
	npm run db:migrate

## Seed signal data
db-seed:
	npm run db:seed

# ─── Knowledge Ingestion ──────────────────────────────────────

BASE_URL ?= http://localhost:3000

## Ingest all knowledge packs
ingest-all:
	curl -s -X POST "$(BASE_URL)/api/knowledge/ingest?pack=all" | jq .

## Ingest deterministic pack
ingest-deterministic:
	curl -s -X POST "$(BASE_URL)/api/knowledge/ingest?pack=deterministic" | jq .

## Ingest advanced pack
ingest-advanced:
	curl -s -X POST "$(BASE_URL)/api/knowledge/ingest?pack=advanced" | jq .

## Ingest final pack
ingest-final:
	curl -s -X POST "$(BASE_URL)/api/knowledge/ingest?pack=final" | jq .

## Ingest Epstein network pack
ingest-epstein:
	curl -s -X POST "$(BASE_URL)/api/knowledge/ingest?pack=epstein" | jq .

## Ingest deep geopolitical pack
ingest-deep-geo:
	curl -s -X POST "$(BASE_URL)/api/knowledge/ingest?pack=deep-geo" | jq .

## Ingest structural reference pack
ingest-structural:
	curl -s -X POST "$(BASE_URL)/api/knowledge/ingest?pack=structural" | jq .

## Shorthand: ingest all packs
ingest: ingest-all

## Trigger live knowledge refresh (GDELT)
refresh-knowledge:
	curl -s -X POST "$(BASE_URL)/api/knowledge/refresh" | jq .

## Check live knowledge status
status-knowledge:
	curl -s "$(BASE_URL)/api/knowledge/refresh" | jq .

# ─── Quick Checks ─────────────────────────────────────────────

## Full pre-commit check: typecheck + lint
check: typecheck lint

## Dev restart: clean cache and start fresh
restart: clean dev
