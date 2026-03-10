# Database Schema

## Connection

- **Local**: PostgreSQL via Herd (`postgresql://andrefigueira@localhost:5432/nexus`)
- **Production**: Neon serverless PostgreSQL
- **ORM**: Drizzle (`pgTable` from `drizzle-orm/pg-core`)
- **Schema file**: `lib/db/schema.ts`

**CRITICAL**: Do NOT run `drizzle-kit push`. The `knowledge` table has a pgvector `embedding` column (vector(1024)) managed outside Drizzle. Push will try to drop it. Create new tables via raw SQL.

## Tables (40 in Drizzle schema)

### Signals & Analysis

| Table | Purpose |
|-------|---------|
| `signals` | Convergence events across signal layers. Fields: intensity (1-5), category, date, endDate, layers (JSON), status |
| `analyses` | ML-generated analysis per signal. Fields: confidence, market impact, trade recommendations, red team assessments |
| `predictions` | Tracked predictions with regime-aware scoring. Fields: claim, confidence, deadline, outcome (confirmed/denied/partial/expired), score (0-1), regimeAtCreation, direction, priceTarget, referenceSymbol, directionCorrect, levelCorrect, preEvent, regimeInvalidated |

### Market & Trading

| Table | Purpose |
|-------|---------|
| `trades` | Trading 212 orders with status, filled price, dedupe hash |
| `portfolioSnapshots` | Historical portfolio state (value, cash, invested, P&L) |
| `manualPositions` | User-tracked positions (long/short, avg cost, open/closed dates) |
| `marketSnapshots` | Cached technical snapshots (RSI, MACD, Bollinger, ATR, SMAs) |

### Chat System

| Table | Purpose |
|-------|---------|
| `chatSessions` | Conversation threads with uuid, userId, projectId, tags |
| `chatMessages` | Per-message storage with role, content, tool uses/results (JSON) |
| `chatProjects` | User chat projects with instructions and pinned knowledge context |

### Game Theory & Geopolitics

| Table | Purpose |
|-------|---------|
| `gameTheoryScenarios` | Scenario analysis (2-player, payoff matrices, Nash equilibria) |
| `scenarioStates` | Wartime branch state tracking (peacetime > escalating > wartime > de-escalating). Stores triggered thresholds, invalidated strategies, escalation trajectories |

### Knowledge & Intelligence

| Table | Purpose |
|-------|---------|
| `knowledge` | Institutional knowledge bank. Categories: thesis, model, event, actor, market, geopolitical, technical. Has pgvector `embedding` column (1024-dim, external to Drizzle). Status: active/archived/superseded |
| `watchlists` | User watchlists for tracking symbols/actors |
| `watchlistItems` | Individual items within watchlists |
| `theses` | Daily intelligence briefings with executive summary, market regime, volatility outlook, convergence density, trading actions, red team challenge |
| `entities` | Graph nodes (types: actor, aircraft, vessel, signal, prediction, trade, thesis, sector, ticker, event, location) |
| `relationships` | Graph edges (types: affects, triggers, belongs_to, correlated_with, trades, opposes, allies, monitors, predicts, located_in) |
| `timelineEvents` | Event stream (signal fired, prediction resolved, trade filled, thesis generated) |

### Alerts & Monitoring

| Table | Purpose |
|-------|---------|
| `alerts` | Watch conditions (types: price_threshold, vix_level, geofence, signal_intensity, prediction_due, osint_keyword, custom) |
| `alertHistory` | Alert trigger log with severity and dismissed flag |
| `dashboardWidgets` | User dashboard widget layout configuration |

### Subscriptions & Billing

| Table | Purpose |
|-------|---------|
| `subscriptionTiers` | 3 tiers (Analyst, Operator, Institution) with Stripe IDs, features, limits JSON, price in cents |
| `subscriptions` | User subscriptions with Stripe customer/subscription IDs, status, period dates |
| `creditLedger` | AI usage tracking per transaction (model, tokens, credits) |
| `creditBalances` | Current credit balance per user with monthly grant tracking |

### Referrals & Commissions

| Table | Purpose |
|-------|---------|
| `referralCodes` | Referrer tracking with commission rate (default 20%), Stripe Connect ID |
| `referrals` | User referrals with status (signed_up, subscribed, churned) |
| `commissions` | Commission ledger with approval workflow |

### System & Support

| Table | Purpose |
|-------|---------|
| `settings` | Key-value config store. Users stored as `user:{username}` with password hash, role, email, lastLogin |
| `supportTickets` | Support tickets (open > in_progress > resolved > closed) |
| `supportMessages` | Threaded messages on support tickets |
| `passwordResets` | Password reset tokens with expiry |
| `analyticsEvents` | Pageview tracking (path, referrer, device, browser, OS, location) |
| `apiKeys` | API key management with scopes, lastUsedAt, revokedAt |
| `documents` | Uploaded document tracking with mime type, extracted text |
| `dailyReports` | Generated daily intelligence reports per user |
| `analyst_memory` | Persistent user preferences, theses, portfolio context across sessions |
| `analystFollows` | Social graph (who follows whom) |
| `comments` | Threaded comments on signals, predictions, theses |

## Credit System

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|----------------------|
| Haiku | 1 credit | 4 credits |
| Sonnet | 3 credits | 15 credits |
| Opus | 15 credits | 75 credits |

1 credit = $0.001

Monthly grants: Free (5,000), Analyst (50,000), Operator (250,000), Institution (unlimited)
