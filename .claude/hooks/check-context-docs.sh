#!/bin/bash
# Hook: Check if .context/ docs need updating after source file changes
# Runs on Stop event to detect when significant changes may have made docs stale

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# Get files changed in the current uncommitted work
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached 2>/dev/null)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

STALE_DOCS=""

# Check if schema or DB files changed -> DATABASE.md
if echo "$CHANGED_FILES" | grep -qE "lib/db/schema\.ts|lib/db/index\.ts|lib/db/ensure-tables\.ts"; then
    STALE_DOCS="$STALE_DOCS\n- .context/DATABASE.md (schema or DB connection changed)"
fi

# Check if API routes changed -> API-ROUTES.md
if echo "$CHANGED_FILES" | grep -qE "app/api/"; then
    STALE_DOCS="$STALE_DOCS\n- .context/API-ROUTES.md (API routes changed)"
fi

# Check if components changed -> COMPONENTS.md
if echo "$CHANGED_FILES" | grep -qE "components/"; then
    STALE_DOCS="$STALE_DOCS\n- .context/COMPONENTS.md (components changed)"
fi

# Check if signal/prediction/regime engines changed -> SYSTEMS.md
if echo "$CHANGED_FILES" | grep -qE "lib/signals/|lib/predictions/|lib/regime/|lib/game-theory/|lib/thesis/|lib/knowledge/|lib/chat/tools\.ts"; then
    STALE_DOCS="$STALE_DOCS\n- .context/SYSTEMS.md (core engine files changed)"
fi

# Check if layout/middleware/config changed -> ARCHITECTURE.md
if echo "$CHANGED_FILES" | grep -qE "middleware\.ts|app/layout\.tsx|next\.config"; then
    STALE_DOCS="$STALE_DOCS\n- .context/ARCHITECTURE.md (layout, middleware, or config changed)"
fi

# Check if config files changed -> CONFIGURATION.md
if echo "$CHANGED_FILES" | grep -qE "package\.json|tsconfig|tailwind|vercel\.json|capacitor|sentry"; then
    STALE_DOCS="$STALE_DOCS\n- .context/CONFIGURATION.md (config files changed)"
fi

# Check if methodology/research pages changed -> METHODOLOGY.md
if echo "$CHANGED_FILES" | grep -qE "app/research/|lib/predictions/calibration|lib/signals/.*theory"; then
    STALE_DOCS="$STALE_DOCS\n- .context/METHODOLOGY.md (methodology or research pages changed)"
fi

if [ -n "$STALE_DOCS" ]; then
    echo "Context docs may need updating:"
    echo -e "$STALE_DOCS"
fi

exit 0
