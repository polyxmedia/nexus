# API Routes

All routes require NextAuth session unless noted otherwise. Located under `app/api/`.

## Authentication

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth handler |
| `/api/auth/register` | POST | User registration (first user becomes admin) |
| `/api/auth/forgot-password` | POST | Password reset request |
| `/api/auth/reset-password` | POST | Password reset confirmation |

## Chat System

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat/[sessionId]` | POST | Main chat with streaming, tool execution, credit debit, message compression |
| `/api/chat/sessions` | GET/POST/DELETE | Session CRUD (create, list, archive, delete) |
| `/api/chat/documents` | GET/POST | Document upload and management for chat context |
| `/api/chat/projects` | GET/POST | Chat project management |
| `/api/chat/transcribe` | POST | Audio transcription (voice mode) |
| `/api/chat/tts` | POST | Text-to-speech synthesis |

## Signals

| Route | Method | Description |
|-------|--------|-------------|
| `/api/signals` | GET/POST | List signals / Generate signals for a year |
| `/api/signals/[id]` | GET/PATCH | Signal detail / Update signal |
| `/api/signals/[id]/backtest` | POST | Backtest a signal |
| `/api/signals/[id]/lineage` | GET | Signal lineage/derivation history |

## Predictions

| Route | Method | Description |
|-------|--------|-------------|
| `/api/predictions` | GET/POST/PATCH | List / Create / Resolve predictions |
| `/api/predictions/[id]` | GET/PATCH | Prediction detail / Update |
| `/api/predictions/generate` | POST | Generate predictions from signals |
| `/api/predictions/resolve` | POST | Batch resolution |
| `/api/predictions/auto-resolve` | POST | Auto-resolve expired (scheduled) |
| `/api/predictions/fast-resolve` | POST | Quick resolution for market-linked predictions |
| `/api/predictions/calibration` | GET | Calibration curves and accuracy metrics |
| `/api/predictions/feedback` | GET | **Public** - Brier score, log-loss, calibration data |
| `/api/predictions/recent-resolved` | GET | **Public** - Recent resolved predictions |
| `/api/predictions/daily` | POST | Daily prediction generation (scheduled) |

## Thesis & Analysis

| Route | Method | Description |
|-------|--------|-------------|
| `/api/thesis` | GET/POST | List theses / Generate new thesis |
| `/api/thesis/[id]` | GET/DELETE | Thesis detail / Remove |
| `/api/thesis/suggestions` | GET | AI-generated thesis suggestions |
| `/api/thesis/branches` | GET/POST | Branch management for scenario testing |
| `/api/thesis/branches/activate` | POST | Activate thesis branch |

## Game Theory

| Route | Method | Description |
|-------|--------|-------------|
| `/api/game-theory` | GET/POST | List scenarios / Create scenario |
| `/api/game-theory/bayesian` | POST | Bayesian scenario analysis |
| `/api/game-theory/global` | GET | Global wartime threshold detection |

## Intelligence Warnings (IW)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/iw` | GET/POST | IW scenario CRUD |
| `/api/iw/[scenarioId]` | GET/PATCH/DELETE | Scenario detail / Update / Delete |
| `/api/iw/[scenarioId]/indicators` | GET | Scenario indicator tracking |
| `/api/iw/evaluate` | POST | Evaluate intelligence scenarios |

## War Room & Geopolitical

| Route | Method | Description |
|-------|--------|-------------|
| `/api/warroom` | GET | Status metrics (escalation, regime, signal count, volatility) |
| `/api/warroom/aircraft` | GET | Military aircraft from OpenSky (filtered by callsign) |
| `/api/warroom/aircraft/[icao24]` | GET | Specific aircraft detail |
| `/api/warroom/vip-aircraft` | GET | VIP aircraft tracking (heads of state, defense officials) |
| `/api/warroom/vessels` | GET | Shipping vessel tracking |
| `/api/warroom/osint` | GET | OSINT event feed from GDELT |
| `/api/warroom/satellites` | GET | Satellite tracking data |
| `/api/warroom/country/[code]` | GET | Country-specific geopolitical profile |

## Knowledge & Intelligence

| Route | Method | Description |
|-------|--------|-------------|
| `/api/knowledge` | GET | Knowledge bank items |
| `/api/knowledge/ingest` | POST | Ingest documents/sources |
| `/api/knowledge/embed` | POST | Generate embeddings via Voyage AI |
| `/api/knowledge/refresh` | POST | Refresh knowledge base (scheduled) |

## Calendar & Narrative

| Route | Method | Description |
|-------|--------|-------------|
| `/api/calendar/overlay` | GET | Calendar events with actor-belief context |
| `/api/calendar/actor-beliefs` | GET | How actors interpret calendar events |
| `/api/calendar/hebrew` | GET | Hebrew calendar events |
| `/api/calendar/market-snapshot` | GET | Market state on specific calendar dates |
| `/api/calendar/reading` | GET | Celestial/scriptural readings |

## Markets & Trading Data

| Route | Method | Description |
|-------|--------|-------------|
| `/api/market-data` | GET | Market quotes and OHLCV data |
| `/api/markets/chart` | GET | Candlestick chart data |
| `/api/macro` | GET | Macro indicators from FRED |
| `/api/options` | GET | Options flow and Greeks |
| `/api/gex` | GET | Gamma exposure index |
| `/api/gpr` | GET | Geopolitical risk index |
| `/api/bocpd` | GET | Bayesian change point detection |
| `/api/regime` | GET | Market regime classification |
| `/api/regime/correlations` | GET | Correlation analysis by regime |

## Broker Integrations

### Trading 212
| Route | Method | Description |
|-------|--------|-------------|
| `/api/trading212/account` | GET | Account info |
| `/api/trading212/portfolio` | GET | Positions and P&L |
| `/api/trading212/orders` | GET/POST | Orders |
| `/api/trading212/instruments` | GET | Available instruments |
| `/api/trading212/history` | GET | Transaction history |

### Coinbase
| Route | Method | Description |
|-------|--------|-------------|
| `/api/coinbase/accounts` | GET | Accounts |
| `/api/coinbase/products` | GET | Trading pairs |
| `/api/coinbase/orders` | GET/POST | Orders |
| `/api/coinbase/oauth/*` | GET | OAuth flow (route, callback, status) |

### IBKR
| Route | Method | Description |
|-------|--------|-------------|
| `/api/ibkr/account` | GET | Account balances |
| `/api/ibkr/portfolio` | GET | Positions |
| `/api/ibkr/orders` | GET/POST | Orders |
| `/api/ibkr/search` | GET | Instrument search |
| `/api/ibkr/status` | GET | Connection status |

### IG Markets
| Route | Method | Description |
|-------|--------|-------------|
| `/api/ig/account` | GET | Account info |
| `/api/ig/portfolio` | GET | Positions |
| `/api/ig/orders` | GET/POST | Orders |
| `/api/ig/search` | GET | Instrument search |
| `/api/ig/connect` | POST | Connect account |
| `/api/ig/oauth/*` | GET | OAuth flow |

## Portfolio & Risk

| Route | Method | Description |
|-------|--------|-------------|
| `/api/portfolio/snapshots` | GET | Portfolio value over time |
| `/api/portfolio/risk` | GET | VaR, Sharpe, drawdown analysis |
| `/api/portfolio/manual` | GET/POST | Manual position tracking |

## Alerts & Notifications

| Route | Method | Description |
|-------|--------|-------------|
| `/api/alerts` | GET/POST | List / Create alerts |
| `/api/alerts/check` | POST | Check alert conditions (scheduled) |
| `/api/alerts/stream` | GET | SSE streaming alert updates |
| `/api/alerts/suggestions` | GET | AI alert suggestions |
| `/api/alerts/context-scan` | POST | Contextual alert scanning |

## News & OSINT

| Route | Method | Description |
|-------|--------|-------------|
| `/api/news` | GET | RSS + GDELT news feed |
| `/api/news/digest` | POST | AI news digest generation |
| `/api/osint/extract` | POST | OSINT data extraction and parsing |

## Advanced Analytics

| Route | Method | Description |
|-------|--------|-------------|
| `/api/contagion` | GET | Systemic contagion risk |
| `/api/contagion/[asset]` | GET | Asset-specific contagion |
| `/api/graph` | GET/POST | Knowledge graph CRUD |
| `/api/graph/traverse` | GET | Relationship traversal |
| `/api/graph/auto-link` | POST | Automatic entity linking |
| `/api/attribution` | GET | Signal attribution to sources |
| `/api/attribution/signal/[signalId]` | GET | Source attribution for specific signal |
| `/api/timeline` | GET | Full event timeline |
| `/api/timeline/parallels` | GET | Historical parallel events |
| `/api/parallels` | GET | Parallel pattern detection |
| `/api/simulation` | POST | Monte Carlo simulations |
| `/api/prediction-markets` | GET | Polymarket/Kalshi data |
| `/api/prediction-markets/divergence` | GET | Market divergence detection |
| `/api/prediction-markets/portfolio` | GET | Prediction market positions |
| `/api/prediction-markets/order` | POST | Place prediction market orders |
| `/api/congressional-trading` | GET | STOCK Act insider trades |
| `/api/congressional-trading/analyze` | POST | Pattern analysis |
| `/api/congressional-trading/conflict` | GET | Conflict-of-interest detection |
| `/api/shipping` | GET | Chokepoint alerts |
| `/api/shipping/watchlist` | GET/POST | Shipping watchlist |
| `/api/shipping/chokepoint-alerts` | GET | Chokepoint-specific alerts |
| `/api/esoteric` | GET | Celestial/esoteric signal layer |
| `/api/nowcast` | GET | Economic nowcasting |
| `/api/on-chain` | GET | On-chain blockchain analytics |
| `/api/short-interest` | GET | Short interest data |
| `/api/narrative` | GET | Narrative analysis |
| `/api/collection-gaps` | GET | Intelligence collection gaps |
| `/api/ai-progression` | GET | AI model progression tracking |
| `/api/longevity` | GET | Longevity modeling |
| `/api/leaderboard` | GET | Prediction accuracy leaderboard |
| `/api/nexus-bridge` | * | External API bridge |
| `/api/sources` | GET | News source list |
| `/api/sources/[domain]` | GET | Source credibility metrics |
| `/api/actors` | GET/POST | Actor profile CRUD |
| `/api/actors/update` | POST | Update actor relationships |
| `/api/analysts` | GET | Analyst profiles |
| `/api/comments` | POST | Add comments to items |
| `/api/watchlists` | GET/POST | Watchlist management |

## ACH (Analysis of Competing Hypotheses)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ach` | GET/POST | Analysis items |
| `/api/ach/[analysisId]/hypotheses` | GET | Hypotheses for analysis |
| `/api/ach/[analysisId]/evidence` | GET | Evidence collection |
| `/api/ach/[analysisId]/ratings` | GET | Confidence ratings |
| `/api/ach/[analysisId]/evaluate` | POST | Evaluate hypothesis |
| `/api/ach/[analysisId]/ai-assist` | POST | AI assistance |

## Settings & Subscription

| Route | Method | Description |
|-------|--------|-------------|
| `/api/settings` | GET/POST | User settings CRUD |
| `/api/settings/api-keys` | GET/POST | API key management |
| `/api/settings/prompts` | GET/POST | Custom prompt management |
| `/api/subscription` | GET | Current subscription info |
| `/api/subscription/tiers` | GET | Available tiers |
| `/api/credits` | GET | Credit balance |
| `/api/credits/ledger` | GET | Credit usage history |
| `/api/credits/topup` | POST | Purchase credits |

## Stripe Payments

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/portal` | POST | Create billing portal session |
| `/api/stripe/webhook` | POST | Webhook handler (checkout.session.completed, subscription.updated/deleted, invoice.payment_failed) |

## Admin (requires admin role)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/users` | GET/POST/PATCH | User management |
| `/api/admin/users/[username]/stats` | GET | User usage stats |
| `/api/admin/tiers` | GET/POST/PATCH | Tier management |
| `/api/admin/tiers/seed` | POST | Seed default tiers |
| `/api/admin/tiers/stripe-sync` | POST | Sync tiers with Stripe |
| `/api/admin/analytics` | GET | Platform analytics |
| `/api/admin/growth` | GET | Growth metrics |
| `/api/admin/emails` | POST | Bulk email campaigns |
| `/api/admin/base-rates` | GET/POST | Calibration base rates |
| `/api/admin/support` | GET | Support tickets |
| `/api/admin/impersonate` | POST | Impersonate user |
| `/api/admin/backtest` | GET/POST | Backtest management |
| `/api/admin/backtest/[id]` | GET | Specific backtest detail |

## Public API v1 (Bearer Token Auth)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/signals` | GET | Public signals API |
| `/api/v1/predictions` | GET | Public predictions API |
| `/api/v1/theses` | GET | Public theses API |
| `/api/v1/market/quote` | GET | Market quotes |
| `/api/v1/news` | GET | News feed |

## Miscellaneous

| Route | Method | Description |
|-------|--------|-------------|
| `/api/telegram/webhook` | POST | **Public** - Telegram bot webhook |
| `/api/telegram/test` | POST | Test Telegram connection |
| `/api/agents/cycle` | POST | AI agent scheduling cycle |
| `/api/scheduler` | GET/POST | Scheduler management |
| `/api/scheduler/monitor` | GET | Scheduler health |
| `/api/profile` | GET | User profile |
| `/api/analysis` | GET | Analysis items |
| `/api/analytics/track` | POST | Event tracking |
| `/api/dashboard/widgets` | GET | User dashboard widgets |
| `/api/dashboard/operator` | GET | Operator dashboard data |
| `/api/dashboard/daily-report` | GET | Daily intelligence report |
| `/api/support/tickets` | GET/POST | Support tickets |
| `/api/support/tickets/[id]` | GET/PATCH | Ticket detail / Update |
| `/api/support/tickets/[id]/messages` | POST | Add message to ticket |
| `/api/admin/support/messages` | POST | Admin support message |
| `/api/referrals` | GET/POST | Referral management |
| `/api/referrals/click` | POST | Track referral click |
| `/api/referrals/connect` | POST | Link referrer to account |
| `/api/referrals/admin` | GET | Referral admin data |
| `/api/nlp/analyze` | POST | NLP text analysis |
| `/api/reports/narrative` | POST | Narrative report generation |
| `/api/risk/systemic` | GET | Systemic risk assessment |
| `/api/trade-lab/enrich` | POST | Trade idea enrichment |
| `/r/[code]` | GET | Referral redirect short URL |
