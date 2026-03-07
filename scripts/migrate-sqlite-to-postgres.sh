#!/bin/bash
# Migrate data from SQLite to Postgres
# Usage: ./scripts/migrate-sqlite-to-postgres.sh

SQLITE_DB="/Users/andrefigueira/Code/nexus/data/nexus.db"
PG_URL="postgresql://andrefigueira@localhost:5432/nexus"

if [ ! -f "$SQLITE_DB" ]; then
  echo "SQLite database not found at $SQLITE_DB"
  exit 1
fi

# Tables in dependency order (parents before children)
TABLES=(
  "signals"
  "analyses"
  "predictions"
  "trades"
  "portfolio_snapshots"
  "settings"
  "theses"
  "market_snapshots"
  "chat_projects"
  "chat_sessions"
  "chat_messages"
  "game_theory_scenarios"
  "entities"
  "relationships"
  "timeline_events"
  "alerts"
  "alert_history"
  "dashboard_widgets"
  "knowledge"
  "watchlists"
  "watchlist_items"
)

echo "Starting SQLite -> Postgres migration..."

for table in "${TABLES[@]}"; do
  count=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM $table" 2>/dev/null)
  if [ "$count" = "0" ] || [ -z "$count" ]; then
    echo "  ⏭ $table: empty, skipping"
    continue
  fi

  echo "  → Migrating $table ($count rows)..."

  # Get column names from SQLite
  cols=$(sqlite3 "$SQLITE_DB" "PRAGMA table_info($table);" | cut -d'|' -f2 | tr '\n' ',' | sed 's/,$//')

  # Export as CSV from SQLite, import into Postgres
  # Use a temp file to handle the data
  tmpfile=$(mktemp /tmp/nexus_migrate_XXXX.csv)

  sqlite3 -header -csv "$SQLITE_DB" "SELECT * FROM $table;" > "$tmpfile"

  # Clear existing data in Postgres table
  psql "$PG_URL" -c "DELETE FROM $table;" 2>/dev/null

  # Import CSV into Postgres
  psql "$PG_URL" -c "\COPY $table($cols) FROM '$tmpfile' WITH (FORMAT csv, HEADER true, NULL '')" 2>&1

  # Reset serial sequence to max id + 1
  psql "$PG_URL" -c "SELECT setval(pg_get_serial_sequence('$table', 'id'), COALESCE((SELECT MAX(id) FROM $table), 0) + 1, false);" 2>/dev/null

  rm -f "$tmpfile"
done

echo ""
echo "Migration complete! Verifying row counts..."
echo ""

for table in "${TABLES[@]}"; do
  sqlite_count=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM $table" 2>/dev/null)
  pg_count=$(psql -t "$PG_URL" -c "SELECT COUNT(*) FROM $table" 2>/dev/null | tr -d ' ')
  if [ "$sqlite_count" = "$pg_count" ]; then
    echo "  ✓ $table: $pg_count rows (match)"
  else
    echo "  ✗ $table: SQLite=$sqlite_count, Postgres=$pg_count (MISMATCH)"
  fi
done
