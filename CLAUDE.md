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
- Dark theme only. Navy palette: navy-950 (#000) through navy-100 (#d4d4d4)
- Signal colors: signal-1 (blue) through signal-5 (red)
- Accents: accent-cyan, accent-amber, accent-emerald, accent-rose
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
    chat/               # Chat API with 20+ tool definitions
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
    schema.ts           # Drizzle schema (23 tables)
    index.ts            # DB connection (Neon or local pg)
  auth/auth.ts          # NextAuth config
  stripe/index.ts       # Stripe client
  chat/
    tools.ts            # 20+ chat tool definitions
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
