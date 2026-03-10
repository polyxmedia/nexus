# Architecture

## Project Structure

```
app/
  layout.tsx              # Root layout (providers, sidebar, banners)
  page.tsx                # Landing page (no sidebar)
  globals.css             # Tailwind v4 theme config
  (public)/               # Public pages (about, privacy, terms, etc.)
  dashboard/              # Widget-based dashboard (30+ widget types)
  chat/[sessionId]/       # AI analyst chat with tool execution
  warroom/                # Leaflet map with military/OSINT layers
  signals/[id]/           # Signal detection & convergence detail
  predictions/[id]/       # Prediction tracking with Brier scoring
  thesis/[id]/            # AI-generated intelligence briefings
  game-theory/            # Game theory scenarios & Nash equilibria
  trading/                # Multi-broker trading (IBKR, IG, T212, Coinbase)
  knowledge/              # Knowledge bank with semantic search
  news/                   # RSS + GDELT news aggregation
  calendar/               # Hebrew, Islamic, FOMC, OPEX events
  alerts/                 # Multi-channel alert management
  markets/                # Market data & instruments
  watchlists/             # Watchlist management
  graph/                  # Entity relationship knowledge graph
  timeline/               # Full event stream with cross-referencing
  narrative/              # Narrative analysis layer
  parallels/              # Historical parallel event identification
  bocpd/                  # Bayesian change point detection
  gex/                    # Gamma exposure index
  gpr/                    # Geopolitical risk index
  on-chain/               # Blockchain analytics
  congressional-trading/  # STOCK Act insider tracking
  prediction-markets/     # Polymarket/Kalshi integration
  short-interest/         # Short interest data
  shipping/               # Chokepoint alerts & dark fleet intel
  simulation/             # Monte Carlo engine
  leaderboard/            # Prediction accuracy rankings
  trade-lab/              # Trade enrichment & testing
  actors/                 # Geopolitical actor profiles
  settings/               # User settings, API keys, subscriptions
  admin/                  # Super admin (users, tiers, analytics, backtest)
  support/                # Support ticket system
  referrals/              # Referral tracking & commissions
  api/                    # 170+ API routes (see API-ROUTES.md)

components/
  layout/                 # Sidebar, PageContainer, PublicNav, PublicFooter
  chat/                   # ChatInput, MessageBlock, ToolResultRenderer
  chat/widgets/           # 50+ tool result widgets
  warroom/                # Map layers, panels, modals (20+ components)
  trading/                # Trade approval, equity curve, broker panels
  graph/                  # ReactFlow knowledge graph visualization
  dashboard/              # Widget renderer, news widget
  landing/                # Threat map preview, hero terminal
  predictions/            # Daily predictions display
  game-theory/            # Global scenario map
  signals/                # Signal lineage, trade recommendations
  ui/                     # Primitives (Button, Card, Badge, Input, etc.)

lib/
  db/
    schema.ts             # Drizzle schema (40+ tables)
    index.ts              # DB connection (auto-detect Neon vs local pg)
  auth/                   # NextAuth config, session helpers
  chat/                   # Tool definitions (59), system prompts
  signals/                # Signal engines (celestial, hebrew, islamic, geopolitical)
  predictions/            # Prediction generation, resolution, calibration
  regime/                 # 6-dimensional regime detection
  thesis/                 # Thesis generation engine
  game-theory/            # Nash equilibria, wartime thresholds, Bayesian N-player
  knowledge/              # Knowledge CRUD, embeddings, semantic search
  memory/                 # Persistent analyst memory per user
  market-data/            # Alpha Vantage, FRED, Yahoo, options, sentiment
  backtest/               # Feedback loops, walk-forward accuracy
  credits/                # AI credit metering & billing
  stripe/                 # Stripe client & webhook handling
  warroom/                # Map layers, ADS-B tracking
  vip-aircraft/           # VIP aircraft database (15,000+ aircraft)
  osint/                  # Entity extraction, GDELT feeds
  ach/                    # Analysis of Competing Hypotheses
  nowcast/                # Economic nowcasting (Kalman filtering)
  actors/                 # Actor behavioral profiles
  alerts/                 # Alert condition checking & notification
  risk/                   # Systemic risk scoring, contagion modeling
  graph/                  # Entity graph queries, relationship traversal
  narrative/              # Narrative momentum scoring
  bocpd/                  # Changepoint detection
  nlp/                    # Central bank parsing, SEC analysis
  attribution/            # Source reliability scoring (Admiralty rating)
  shipping/               # Vessel tracking, chokepoint monitoring
  on-chain/               # Exchange flows, whale monitoring
  prediction-markets/     # Kalshi/Polymarket integration
  congressional-trading/  # STOCK Act data
  prompts/                # Prompt registry with DB overrides
  encryption.ts           # AES encryption for sensitive settings
  rate-limit.ts           # Per-key rate limiting
```

## Key Architectural Patterns

### Lazy Database Initialization
Database uses a Proxy-based singleton that auto-detects the environment:
- Neon serverless (wss:// or neon.tech URLs) uses Neon HTTP driver
- Local PostgreSQL uses standard pg Pool driver

### Tool-Based AI Integration
All AI capabilities flow through loosely-coupled tool definitions. Claude has access to 59 tools but only invokes them when contextually relevant. Tools return structured data that maps to specialized widget renderers in the UI.

### Regime-Aware Analysis
Every system (predictions, thesis, game theory, portfolio) adjusts behavior based on the current regime state. Regime is classified across 6 dimensions and stored persistently. Regime shifts trigger strategy invalidation and prediction re-evaluation.

### Self-Calibrating Feedback Loops
Prediction accuracy (Brier scores) feeds back into confidence adjustment via damped half-gap correction. Per-category multipliers prevent systematic overconfidence. Walk-forward out-of-sample accuracy informs thesis generation credibility.

### Convergence-Based Signal Generation
Four signal layers scored via Bayesian fusion (not additive). Calendar/celestial events only provide actor-belief context with max 0.5 bonus and no convergence weight.

### Wartime Threshold System
When regime shifts to wartime, the game theory engine:
1. Invalidates diplomatic strategies that become non-viable
2. Activates escalation trajectories with probability estimates
3. Transitions scenario states (peacetime > escalating > wartime > de-escalating)
4. Marks affected predictions as post-event

### Persistent User Context
Chat memories (preferences, active theses, portfolio context, standing instructions) are saved per-user and injected into every new conversation. This enables the AI analyst to maintain continuity across sessions.

## Authentication Flow

1. NextAuth with credentials provider (username + password)
2. Passwords hashed with bcryptjs (12 rounds)
3. Rate limited: 10 attempts per 15 minutes per username
4. JWT sessions with 8-hour max age
5. Users stored in `settings` table as `user:{username}`
6. First user auto-promoted to admin
7. Admin impersonation support for user debugging

## Middleware

Protected routes require NextAuth session. Exceptions:
- `/api/predictions/feedback` (public)
- `/api/predictions/recent-resolved` (public)
- `/api/telegram/webhook` (public)
- `/api/v1/*` (Bearer token auth)
- Scheduler calls (CRON_SECRET header)

## Deployment

- **Hosting**: Vercel (region: iad1)
- **Database**: Neon PostgreSQL (production), Herd PostgreSQL (local)
- **Monitoring**: Sentry (server + edge), 100% trace sampling
- **Mobile**: Capacitor iOS app (com.nexus.intel)
- **Function Timeouts**: 60s for chat, analysis, prediction generation, thesis, calendar reading
