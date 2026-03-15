# NEXUS Intelligence Platform

## Project Overview
Integrated geopolitical-market intelligence platform. Four primary signal layers (GEO, MKT, OSI, systemic risk) + narrative overlay (calendar/celestial as actor-belief context, max 0.5 bonus, no convergence weight). AI-driven thesis generation, regime-aware prediction tracking with Brier scoring, game theory scenarios, and trading integration.

## Tech Stack
- **Framework**: Next.js 15.1 + Turbopack, React 19, TypeScript 5.7
- **Styling**: Tailwind CSS v4 (config in `globals.css` via `@theme`), Radix UI
- **Database**: PostgreSQL (local via Herd, prod via Neon) + Drizzle ORM
- **Auth**: next-auth 4.x with credentials provider. Users stored in `settings` table as `user:{username}`
- **Payments**: Stripe (subscriptions). Tiers in `subscription_tiers` table
- **AI**: Anthropic Claude (analysis, chat, predictions), Voyage AI (embeddings)
- **Maps**: Leaflet + react-leaflet, CARTO dark tiles
- **Fonts**: IBM Plex Mono + IBM Plex Sans

## Critical Rules

### Database
- Schema uses `pgTable` from `drizzle-orm/pg-core`. NEVER use sqliteTable.
- The `knowledge` table has a `vector(1024)` embedding column managed outside Drizzle (pgvector). Do NOT use `drizzle-kit push` as it will try to drop this column. Create new tables via raw SQL instead.
- Connection: local Postgres via Herd (`postgresql://andrefigueira@localhost:5432/nexus`), Neon for production.

### Dev Server
- Always clear `.next` before dev start. The `dev` script handles this: `rm -rf .next && next dev --turbopack`
- If ISE after code changes, it's stale turbopack cache. Restart dev server.

### Design System
- Dark theme default (+ dim, soft, light modes). Navy palette: navy-950 (#000000) through navy-100 (#e0e0e0)
- Signal colors: signal-1 (#4a5568) through signal-5 (#8b5c5c) - muted palette
- Accents: accent-cyan (#06b6d4), accent-amber (#f59e0b), accent-emerald (#10b981), accent-rose (#f43f5e)
- No emojis in UI
- Font mono labels (`text-[10px] font-mono uppercase tracking-wider`)
- Components are `"use client"` when using hooks/interactivity

### Code Patterns
- API routes return graceful fallbacks (empty arrays, null) on failure
- Modals use Radix Dialog
- Polling hooks use useRef for interval cleanup
- Sidebar hidden on: `/`, `/landing`, `/research/*`, `/register`, `/login`
- Public pages use `PublicNav` + `PublicFooter` layout components
- Settings stored as key-value pairs in `settings` table

## Project Structure

```
app/
  page.tsx              # Landing page (no sidebar)
  dashboard/            # Widget-based dashboard
  chat/[sessionId]/     # AI analyst chat
  warroom/              # Leaflet map with OSINT/aircraft layers
  signals/[id]/         # Signal detection & detail
  predictions/          # Prediction tracking with accuracy scoring
  trading/              # Trading 212 + Coinbase integration
  news/                 # RSS + GDELT news feed
  admin/                # Super admin (tier management, users)
  settings/             # User settings (subscription, AI, API keys, trading)
  research/             # Public research pages (methodology, signal theory, etc)
  register/             # Registration page
  login/                # Login page
  api/
    admin/tiers/        # Subscription tier CRUD (admin only)
    admin/users/        # User management (admin only)
    stripe/             # checkout, portal, webhook
    subscription/       # Current user subscription
    settings/           # Settings CRUD + prompts
    chat/               # Chat API with 59 tool definitions
    signals/            # Signal engine
    predictions/        # Prediction engine
    warroom/            # War room data (aircraft, OSINT)
    news/               # News feed aggregation

components/
  layout/
    sidebar.tsx         # Fixed left sidebar (w-48)
    page-container.tsx  # Standard page wrapper with ml-48
    public-nav.tsx      # Public navigation header
    public-footer.tsx   # Public fat footer
  chat/                 # Chat components, tool result renderers
  warroom/              # Map layers, panels, modals
  landing/              # Landing page components (threat-map-preview)

lib/
  db/
    schema.ts           # Drizzle schema (40 tables)
    index.ts            # DB connection (Neon or local pg)
  auth/auth.ts          # NextAuth config
  stripe/index.ts       # Stripe client
  chat/
    tools.ts            # 59 chat tool definitions
    prompt.ts           # System prompts
  signals/              # Signal detection engines
  predictions/          # Prediction engine
  knowledge/            # Knowledge bank + embeddings
```

## Key APIs & Services
- **Alpha Vantage**: Market data (auto-detects crypto vs stock symbols)
- **FRED**: Federal Reserve economic data
- **Trading 212**: Stock trading (demo/live modes)
- **Coinbase**: Crypto trading
- **OpenSky Network**: Aircraft tracking (20s polling)
- **GDELT**: OSINT event feeds (5min polling)
- **ACLED**: Conflict data

## Subscription System
- 3 tiers: Analyst, Operator, Institution. Prices stored in `subscription_tiers` table (check DB for current values).
- Stripe Checkout for payment, Stripe Portal for billing management
- Webhook handles: checkout.session.completed, subscription.updated/deleted, invoice.payment_failed
- Admin role required for `/admin` and tier management APIs
- First user auto-created as admin on first login

## Environment Variables (.env.local)
```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
ALPHA_VANTAGE_API_KEY=...
TRADING212_API_KEY=...
TRADING212_SECRET=...
FRED_API_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Detailed Documentation

Full platform documentation lives in `.context/`:

- [`.context/OVERVIEW.md`](.context/OVERVIEW.md) - Platform summary, capabilities, tech stack, subscription tiers, design system
- [`.context/ARCHITECTURE.md`](.context/ARCHITECTURE.md) - Project structure, architectural patterns, auth flow, middleware, deployment
- [`.context/DATABASE.md`](.context/DATABASE.md) - All 40 tables, connection details, credit system
- [`.context/API-ROUTES.md`](.context/API-ROUTES.md) - Every API endpoint organized by domain
- [`.context/SYSTEMS.md`](.context/SYSTEMS.md) - Core engines: signals, predictions, regime detection, game theory, thesis, knowledge, chat, backtest, war room, alerts
- [`.context/COMPONENTS.md`](.context/COMPONENTS.md) - All ~140+ components across layout, chat widgets, war room, trading, graph, dashboard, and UI primitives
- [`.context/CONFIGURATION.md`](.context/CONFIGURATION.md) - Config files, scripts, env vars, Tailwind theme, Vercel, Sentry, Capacitor
- [`.context/METHODOLOGY.md`](.context/METHODOLOGY.md) - Full analytical methodology from research pages and whitepaper: signal theory, prediction calibration, game theory framework, actor-belief profiles, calendar correlations, documented limitations

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **nexus** (5778 symbols, 14388 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/nexus/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/nexus/context` | Codebase overview, check index freshness |
| `gitnexus://repo/nexus/clusters` | All functional areas |
| `gitnexus://repo/nexus/processes` | All execution flows |
| `gitnexus://repo/nexus/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## CLI

- Re-index: `npx gitnexus analyze`
- Check freshness: `npx gitnexus status`
- Generate docs: `npx gitnexus wiki`

<!-- gitnexus:end -->
