#!/bin/bash
# Safe migration runner for NEXUS
# Runs all SQL migrations in order against the target database.
# NEVER uses drizzle-kit push (protects pgvector columns).
#
# Usage:
#   ./scripts/migrate.sh              # runs against local DB
#   ./scripts/migrate.sh production   # runs against prod (DATABASE_URL from .env.local)

set -euo pipefail

MIGRATION_DIR="./drizzle"
TRACKING_TABLE="_migration_history"

if [ "${1:-}" = "production" ]; then
  # Load DATABASE_URL from .env.local for prod
  DB_URL=$(grep '^DATABASE_URL=' .env.local | head -1 | cut -d'=' -f2-)
  if [ -z "$DB_URL" ]; then
    echo "ERROR: DATABASE_URL not found in .env.local"
    exit 1
  fi
  echo "TARGET: production (Neon)"
  echo "WARNING: You are about to run migrations against PRODUCTION."
  read -p "Continue? (y/N) " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
  fi
else
  DB_URL="postgresql://andrefigueira@localhost:5432/nexus"
  echo "TARGET: local"
fi

# Create tracking table if it doesn't exist
psql "$DB_URL" -c "
CREATE TABLE IF NOT EXISTS $TRACKING_TABLE (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);" 2>/dev/null

# Run each migration file in order
APPLIED=0
SKIPPED=0

for migration in $(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
  filename=$(basename "$migration")

  # Check if already applied
  already=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM $TRACKING_TABLE WHERE filename = '$filename';" 2>/dev/null | tr -d ' ')

  if [ "$already" -gt 0 ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "APPLYING: $filename"
  if psql "$DB_URL" -f "$migration"; then
    psql "$DB_URL" -c "INSERT INTO $TRACKING_TABLE (filename) VALUES ('$filename');" 2>/dev/null
    APPLIED=$((APPLIED + 1))
    echo "  OK"
  else
    echo "  FAILED: $filename"
    echo "Fix the issue and re-run. Already-applied migrations will be skipped."
    exit 1
  fi
done

echo ""
echo "Done. Applied: $APPLIED, Skipped (already applied): $SKIPPED"
