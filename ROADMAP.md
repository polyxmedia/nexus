# Nexus Roadmap

## NEXUS v2 — Critical Intelligence Upgrades

> From platform self-assessment. These are the features that transform NEXUS from "good analyst you have to ask" into "intelligence officer who wakes you up."

### v2.1 Proactive Push System (Event-Driven, Not Query-Driven)
- [x] Continuous monitoring loop (5-min intervals) comparing live data against active theses/positions
- [x] Threshold-based alert push: price targets, kill conditions, convergence detection
- [x] Auto-generate briefings when signal convergence detected
- [x] Browser push notifications for critical alerts
- [x] "You shouldn't have to ask" paradigm: NEXUS tells you before you think to check

### v2.2 Red Team Adversarial Layer
- [x] Second Claude call in analysis pipeline challenging every thesis
- [x] Structural devil's advocate: attacks assumptions, prices alternative scenarios
- [x] Output: adjusted confidence, explicit risk caveats, counterarguments stored alongside analysis
- [x] Display as "Challenge" section on signal/thesis detail pages
- [x] Prevents confirmation bias structurally rather than hoping the analyst catches it

### v2.3 Prediction Auto-Resolve & Self-Calibration
- [x] Cron job checking expired predictions against real market data
- [x] Auto-score hit/miss using concrete resolution criteria
- [x] Feed results into Brier score calibration per category
- [x] Track confidence accuracy over time (calibration curve)
- [x] Surface insights: "underconfident on geo, overconfident on celestial"
- [x] After 6 months: self-calibrating prediction engine

### v2.4 Three-Brain Architecture
- [x] SENTINEL agent: lightweight, always-on, pattern detection, anomaly alerts (speed-optimised)
- [x] ANALYST agent: deep reasoning, thesis generation, convergence analysis (depth-optimised)
- [x] EXECUTOR agent: position sizing, entry/exit, risk calculations (precision-optimised)
- [x] Coordination: Sentinel detects -> Analyst reasons -> Executor acts
- [x] Each brain has specialised prompts and restricted tool access

### v2.5 Conditional Monte Carlo Simulation
- [ ] Scenario-weighted simulation (not just historical returns)
- [ ] Define regime-specific parameters (wartime vol, ceasefire shock, supply crisis drift)
- [ ] Blend scenarios by probability weights
- [ ] Output actual probability distributions for positions
- [ ] Visual comparison of scenario outcomes on trading page

### v2.6 Market Data Upgrade
- [ ] Replace Alpha Vantage free tier with Polygon.io or IEX Cloud (~$50/mo)
- [ ] Options flow data via Quandl/Nasdaq Data Link (~$50/mo)
- [ ] TradingView webhook integration for technical alerts (~$30/mo)
- [ ] Futures curves and COT report data

### v2.7 AIS Ship Tracking
- [ ] AIS data feed for real-time vessel monitoring (~$100/mo)
- [ ] Chokepoint monitoring: Hormuz, Suez, Malacca, Bab el-Mandeb
- [ ] Tanker traffic anomaly detection (hours before news reports)
- [ ] Auto-generate signals when traffic patterns deviate from baseline
- [ ] Overlay on war room map alongside aircraft tracking

### v2.8 Knowledge Graph Enhancement
- [ ] Relationship traversal on existing entity graph
- [ ] Auto-link chain: positions -> drivers -> events -> signals -> convergences
- [ ] Graph-based reasoning: queries traverse connections, not just keywords
- [ ] Visual graph explorer with path highlighting

### v2.9 Operator Dashboard v2
- [ ] At-a-glance portfolio with action flags (SELL/HOLD/WAITING)
- [ ] Active alerts with severity levels and countdown timers
- [ ] Current regime indicator (WARTIME/PEACETIME)
- [ ] Active thesis confidence meter
- [ ] Next signal with countdown

### v2.10 Infrastructure Targets
| Service | Purpose | Monthly |
|---------|---------|---------|
| Polygon.io / IEX | Real-time market data | ~$50 |
| Quandl | Options flow, COT | ~$50 |
| TradingView | Technical alerts | ~$30 |
| AIS tracking | Ship/tanker monitoring | ~$100 |
| FlightRadar24 | Military aircraft upgrade | ~$50 |
| Hosting | Railway/Fly.io | ~$30 |
| **Total** | | **~$310/mo** |

---

## CRITICAL: Security Hardening (Pre-Deploy)

### Rate Limiting
- [ ] Add rate limiting on auth endpoints (login, register) to prevent brute-force attacks
- [ ] Add rate limiting on trading endpoints (Trading212, Coinbase orders) to prevent abuse
- [ ] Add rate limiting on AI/chat endpoints to prevent resource exhaustion
- [ ] Consider Vercel/Cloudflare WAF for edge-level rate limiting

### Settings API Hardening
- [ ] Filter out `user:*` keys from the settings GET response (currently exposes password hashes)
- [ ] Stop returning last 4 chars of API keys in masked output

### CSRF Protection
- [ ] Add origin/referer validation on state-changing endpoints (POST/PUT/DELETE)
- [ ] Validate origin header on trading and settings routes

### API Key Encryption at Rest
- [ ] Encrypt API keys stored in the settings table (AES-256 or similar)
- [ ] Decrypt only at point of use, never return plaintext to frontend

### Input Validation & Limits
- [ ] Add max length validation on chat messages to prevent resource exhaustion
- [ ] Add max length validation on knowledge content submissions
- [ ] Add request body size limits on all POST endpoints

## NEXUS v3 — Critical New Features

> Intelligence capabilities that close the loop between signal detection, market positioning, and real-world power dynamics.

### v3.1 Prediction Markets Integration (Polymarket / Kalshi)
- [x] Real-time probability feeds from Polymarket and Kalshi
- [x] Geopolitical event markets (elections, conflicts, policy decisions)
- [x] Cross-reference prediction market odds against NEXUS prediction engine confidence
- [x] Arbitrage detection: where NEXUS disagrees with market pricing (divergence engine)
- [x] Full page with Overview/Geopolitical/Economic/Political/Divergences tabs
- [x] Chat tool for querying prediction market data
- [ ] Historical accuracy comparison: prediction markets vs NEXUS Brier scores

### v3.2 Congressional & Insider Trading Tracker
- [ ] SEC Form 4 filings feed (corporate insider buys/sells)
- [ ] Congressional STOCK Act disclosure tracking (House + Senate)
- [ ] Cluster buy detection (multiple insiders buying same stock within window)
- [ ] Insider buy/sell ratio by sector with historical signal accuracy
- [ ] Congressional trading by committee (Armed Services, Finance, Intelligence)
- [ ] Cross-reference insider trades with upcoming signals and catalysts
- [ ] Dashboard widget with latest filings and cluster alerts
- [ ] Chat tool for querying insider/congressional activity

### v3.3 Sanctions & Export Controls Tracker
- [ ] OFAC SDN list monitoring with change detection
- [ ] BIS Entity List updates (chip export restrictions)
- [ ] EU/UK sanctions list tracking
- [ ] Auto-generate signals when sanctions target new entities/sectors
- [ ] Cross-reference sanctioned entities with knowledge graph
- [ ] Market impact scoring per sanctions action
- [ ] Dashboard widget with latest sanctions activity

### v3.4 On-Chain Analytics
- [x] Whale wallet movement tracking (BTC >100 via Blockchain.com)
- [x] Exchange inflow/outflow monitoring (CoinGecko top 20 exchanges)
- [x] Stablecoin flow analysis (USDT/USDC/DAI/FDUSD/USDe market caps)
- [x] DeFi TVL tracking across major protocols (DeFi Llama)
- [x] Full page with whale alerts, exchange flows, DeFi TVL, stablecoins
- [x] Chat tool for on-chain intelligence queries
- [ ] Cross-reference on-chain signals with Coinbase trading integration

### v3.5 Shipping & Dark Fleet Intelligence
- [x] Chokepoint monitoring: Hormuz, Suez, Malacca, Bab el-Mandeb, Panama (baseline + GDELT anomaly)
- [x] Dark fleet detection (sanctions evasion, ship-to-ship transfers, AIS gap keywords via GDELT)
- [x] Tanker traffic anomaly scoring (oil price + GDELT maritime correlation)
- [x] Full page with chokepoint status, traffic anomalies, dark fleet alerts, GDELT events
- [x] Chat tool for shipping intelligence queries
- [ ] AIS vessel tracking integration (paid feed)
- [ ] Overlay on war room map alongside aircraft tracking

### v3.6 Signal Backtester
- [x] Run historical signal engine against past price data
- [x] Score convergence accuracy: did intensity 4-5 signals predict moves?
- [x] Per-layer accuracy breakdown (celestial, hebrew, geopolitical, esoteric)
- [x] Backtest specific signal types against specific asset classes
- [x] Calibration dashboard: where the engine is strong vs weak
- [ ] Feed results into prediction engine confidence adjustment

### v3.6.1 Backtest Institutional Hardening
- [x] Fix: prior backtests now loadable (missing DB columns in query, JSONB string parsing, error handling)
- [x] Remove "partial" outcome category, pure binary Brier scoring per Brier (1950)
- [x] Climatological baseline: naive "always bullish" accuracy computed from historical data, not assumed 50%
- [x] Walk-forward validation: 5-fold expanding window, out-of-sample accuracy, overfit ratio detection
- [x] Holm-Bonferroni multiple testing correction: prevents p-hacking across preset scenarios
- [x] Regime-conditioned analysis: break results by volatility regime (low_vol, normal, elevated, crisis)
- [x] Transaction cost sensitivity: sweep 5-50bps to test profitability robustness
- [x] Sharpe annualization: explicit sqrt(trades_per_year) for event-driven strategies, documented as non-standard
- [x] Look-ahead bias audit: confirmed signal engine uses only deterministic calendar/recurring events, no reactive OSINT
- [x] AI analysis prompt upgraded: references walk-forward, regime, cost sensitivity, climatological baseline, overfit detection
- [ ] Survivorship bias: add delisted symbol detection for individual stock backtests
- [ ] Non-independence correction: adjust p-values for temporally clustered predictions (Newey-West or block bootstrap)
- [ ] Monte Carlo permutation test: compare observed accuracy against 10,000 random shuffles for exact p-value
- [ ] Expanding window cross-validation with purging (de Prado 2018): purge overlapping predictions between train/test

### v3.7 Narrative Tracker
- [x] Track narrative shifts across GDELT and Reddit (worldnews, geopolitics, economics, wallstreetbets)
- [x] Narrative clustering: group related stories into themes via keyword matching
- [x] Narrative momentum scoring (rising, peaking, fading, stable)
- [x] Divergence detection: when narrative sentiment contradicts price action
- [x] Full page with trending narratives, divergences, source breakdown
- [x] Chat tool for narrative queries
- [ ] Feed narrative signals into thesis generation

### v3.8 Bond Auction Intelligence
- [ ] Treasury auction bid-to-cover ratios
- [ ] Indirect bidder % (foreign central bank demand proxy)
- [ ] Direct vs indirect vs dealer allocation trends
- [ ] Auto-generate signals on auction demand anomalies
- [ ] Historical auction impact on yield curve
- [ ] Feed into liquidity and macro regime assessment

### v3.9 Election Cycle Overlay
- [ ] Presidential cycle market patterns mapped to signal timeline
- [ ] Midterm election effects on sector rotation
- [ ] Policy uncertainty index integration
- [ ] Election prediction market data (from v3.1 Polymarket feed)
- [ ] Historical election-year performance by asset class
- [ ] Auto-adjust signal weights during election windows

### v3.10 Automated Alert Chains
- [ ] Signal intensity 5 auto-generates prediction and trade recommendation
- [ ] Configurable action chains: detect -> reason -> notify -> stage trade
- [ ] Multi-channel delivery: in-app, push, email, Telegram
- [ ] Escalation levels based on convergence density
- [ ] Close the loop from signal detection to position management

### v3.11 MCP Server for External Agents
- [ ] Expose NEXUS intelligence layer as MCP tool server
- [ ] External AI agents can query signals, predictions, macro data, knowledge
- [ ] Authentication and rate limiting for external consumers
- [ ] Tool definitions matching internal chat tool capabilities
- [ ] Documentation and example agent implementations

### v3.12 AI Progression Tracker
- [x] Remote Labor Index (remotelabor.ai) integration
- [x] METR time horizon tracking
- [x] AI 2027 scenario milestone tracker
- [x] Sector automation risk with adoption rates
- [x] Labor displacement indicators
- [x] Dashboard widget with overview/sectors/timeline tabs
- [x] Chat tool for AI progression queries
- [ ] Live API integration when RLI dashboard API becomes public
- [ ] Historical RLI tracking over time (store snapshots)
- [ ] Cross-reference AI displacement data with labor market FRED data

### v3.13 Systemic Risk & Tail Risk Engine
> Empirically validated crisis detection. Kritzman et al. (2011, Journal of Portfolio Management) proved out-of-sample across 40+ years.
- [x] Absorption ratio: PCA on multi-asset returns, track fraction of variance explained by top eigenvectors
- [x] Turbulence index: Mahalanobis distance of current returns from historical mean vector
- [x] Combined stress dashboard: rising absorption + rising turbulence = crisis warning
- [x] Historical overlay: flag when current readings match pre-crisis signatures (2007, 2020, 2022)
- [x] Feed into regime detection as a fragility dimension
- [x] Chat tool for querying current systemic stress level
- [ ] Dashboard widget with absorption ratio gauge and turbulence time series

### v3.14 Bayesian Change-Point Detection (BOCPD)
> Adams & MacKay (2007) algorithm. Detects structural breaks in real-time without predefined breakpoints.
- [x] Online BOCPD engine with Student-t predictive distribution and constant hazard function
- [x] Apply to: VIX, gold, oil, US 10Y yield, DXY, signal intensity
- [x] Change-point detection with probability threshold (>0.5)
- [x] Full page with stream cards, run lengths, timeline visualization, change-point table
- [x] Chat tool for querying detected change-points across data streams
- [ ] Alert generation on high-confidence change-points
- [ ] Feed detected regime shifts into thesis generation context

### v3.15 Aggregate Short Interest Signal
> Review of Asset Pricing Studies (2023): "one of the strongest known predictors of the equity risk premium."
- [x] Short interest tracking via Alpha Vantage (10 sector-proxy ETFs)
- [x] Aggregate short interest ratio tracking
- [x] Per-sector short interest breakdown with trend detection
- [x] 52-week z-score with contrarian signal generation (z>2 = bullish, z<-2 = bearish)
- [x] Full page with aggregate stats, sector cards, individual ticker table
- [x] Chat tool for short interest queries
- [ ] Cross-reference high short interest sectors with geopolitical signal exposure
- [ ] Historical short interest vs forward returns validation

### v3.16 GPR Threats vs Acts Decomposition
> Caldara & Iacoviello (AER 2022). Threats sub-index moves faster and is more tradeable than composite.
- [x] Ingest GPR daily index with threats/acts decomposition from matteoiacoviello.com CSV
- [x] Track GPR by region (Middle East, East Asia, Europe, South Asia, Africa) using GDELT
- [x] Asset-class-specific response functions (ME->oil/defense, East Asia->semis/tech, etc.)
- [x] Threshold crossing detection (150 elevated, 200 crisis, 300 extreme)
- [x] Full page with composite/threats/acts cards, T/A ratio, 30-day history, regional proxies
- [x] Chat tool for querying current GPR levels and sub-indices
- [ ] Build proprietary industry-specific GPR from earnings call NLP
- [ ] Feed GPR decomposition into thesis layer inputs

### v3.17 Gamma Exposure (GEX) Engine
> Dealer hedging mechanics from Black-Scholes framework. Determines whether options market amplifies or dampens moves.
- [x] Compute net dealer gamma from options chain data (Alpha Vantage) for SPY, QQQ, IWM
- [x] Track aggregate GEX level and sign (positive = dampening, negative = amplifying)
- [x] Identify zero gamma level as volatility inflection point
- [x] Put wall and call wall as support/resistance levels
- [x] Synthetic fallback using VIX + put/call ratio when options data unavailable
- [x] Full page with aggregate regime, per-ticker cards, gamma profile visualization
- [x] Chat tool for querying current gamma positioning
- [ ] GEX flip alerts when aggregate gamma crosses zero
- [ ] Historical GEX vs realized volatility validation

### v3.18 Insider Purchase Clustering
> Lakonishok & Lee (2001, RFS): insider purchase firms outperform by 7.8% annually. Only buys matter, sells are noise.
- [ ] SEC EDGAR Form 4 RSS feed parser (near-real-time)
- [ ] Filter for open-market purchases only (exclude option exercises, grants)
- [ ] Cluster detection: multiple insiders buying same stock within 14-day window
- [ ] Cross-reference insider buys with geopolitical exposure (defense, energy, shipping)
- [ ] Congressional STOCK Act disclosure overlay (from v3.2)
- [ ] Auto-generate signals on cluster buy detection
- [ ] Chat tool and dashboard widget with latest filings

---

## Phase 1: Core Terminal Features (Current)

### Watchlists
- [x] Custom symbol lists with live-updating columns (price, change %, volume)
- [x] Multiple watchlists with naming/reordering
- [x] Quick-add from search with popular symbol suggestions
- [x] Drag to reorder symbols within watchlists
- [ ] Sortable columns, mini sparkline per row
- [ ] Watchlist alerts (notify on % move)
- [ ] Market cap column

### Chart Upgrades
- [ ] Technical indicator overlays (SMA, EMA, RSI, MACD, Bollinger Bands)
- [ ] Fibonacci retracement drawing tool
- [ ] Multi-timeframe toggle (1D, 1W, 1M, 3M, 6M, 1Y, 5Y)
- [ ] Volume profile
- [ ] Compare mode (overlay multiple symbols)
- [ ] Fullscreen chart view

### Options Chain
- [ ] Options chain viewer by expiry
- [ ] Greeks display (delta, gamma, theta, vega, rho)
- [ ] Implied volatility surface / skew chart
- [ ] Open interest and volume heatmap
- [ ] P&L payoff diagram for positions
- [ ] Unusual options activity scanner

### Screener
- [ ] Stock/ETF screener with filters (market cap, P/E, sector, volume, RSI, etc.)
- [ ] Saved screens with auto-refresh
- [ ] Results export to watchlist
- [ ] Custom formula filters

## Phase 2: Market Intelligence

### Sector Heat Map
- [ ] S&P 500 treemap by sector/industry
- [ ] Color by daily change, 1W, 1M performance
- [ ] Click-through to company detail
- [ ] Sector rotation analysis (momentum scoring)

### Correlation Matrix
- [ ] Cross-asset correlation grid (equities, bonds, commodities, FX, crypto)
- [ ] Rolling window selector (30d, 90d, 1Y)
- [ ] Highlight regime changes (correlation breakdowns)
- [ ] Integration with geopolitical signals (unique to Nexus)

### Earnings Calendar
- [ ] Upcoming earnings with consensus EPS/revenue estimates
- [ ] Actual vs estimate with surprise scoring
- [ ] Historical earnings surprise chart
- [ ] Pre/post market reaction tracking
- [ ] Earnings whisper numbers where available

### Central Bank Monitor
- [ ] Fed funds futures implied rate probabilities
- [ ] ECB, BOJ, BOE rate decision tracking
- [ ] FOMC dot plot visualization
- [ ] Meeting countdown with market positioning
- [ ] Historical rate decision impact on assets

## Phase 3: Advanced Analytics

### Company Fundamentals
- [ ] Financial statements (income, balance sheet, cash flow)
- [ ] Key ratios dashboard (P/E, EV/EBITDA, ROE, debt/equity)
- [ ] Peer comparison tables
- [ ] DCF model builder
- [ ] Revenue/earnings trend charts

### Futures Term Structure
- [ ] Commodity futures curves (oil, gold, natgas, copper, wheat)
- [ ] Contango/backwardation indicator
- [ ] Roll yield calculation
- [ ] Historical curve comparison

### Fund Flows
- [ ] ETF inflows/outflows by sector, asset class
- [ ] Mutual fund flow data
- [ ] Smart money vs retail flow signals
- [ ] Sector rotation heatmap from flows

### Insider Transactions
- [ ] SEC Form 4 filings feed
- [ ] Insider buy/sell ratio by sector
- [ ] Cluster buy detection (multiple insiders buying)
- [ ] Historical insider signal accuracy

## Phase 4: Portfolio & Execution

### Portfolio Attribution
- [ ] Factor exposure analysis (value, momentum, size, quality)
- [ ] Sector/geography allocation breakdown
- [ ] Risk decomposition (systematic vs idiosyncratic)
- [ ] What-if scenario analysis
- [ ] Rebalancing suggestions

### Backtesting Engine
- [x] Define strategy rules (entry/exit, position sizing)
- [x] Backtest against historical data
- [x] Performance metrics (Sharpe, Sortino, max drawdown, win rate)
- [x] Walk-forward analysis
- [ ] Compare strategy variants

### Advanced Order Management
- [ ] Multi-leg order builder (spreads, straddles)
- [ ] Bracket orders (entry + stop + target)
- [ ] Time-weighted / volume-weighted execution
- [ ] Trade journal with P&L attribution

### Cross Rates Matrix
- [ ] Full FX cross rates table
- [ ] Carry trade calculator (interest rate differentials)
- [ ] Forward rate curves
- [ ] FX volatility surface

## Phase 5: Data & Integration

### Economic Calendar (Enhanced)
- [ ] Consensus estimates vs actual releases
- [ ] Surprise index scoring
- [ ] Historical release impact on assets
- [ ] Custom calendar filters by country/category
- [ ] Push notifications on high-impact releases

### Data Export
- [ ] CSV/Excel download from any widget or view
- [ ] Scheduled data snapshots
- [ ] API access for external tools
- [ ] Webhook integrations

### Fixed Income Analytics
- [ ] Bond search and pricing
- [ ] Duration, convexity, spread analysis
- [ ] Yield curve modeling (Nelson-Siegel)
- [ ] Credit default swap spreads
- [ ] Sovereign bond comparison

### Headlines Ticker
- [ ] Real-time scrolling news ticker
- [ ] Symbol-tagged headlines (click to filter)
- [ ] Sentiment scoring per headline
- [ ] Breaking news alerts with sound

---

## Completed

### Core Platform
- [x] War Room geopolitical map with conflict zones, aircraft tracking, OSINT
- [x] AI Chat analyst with 20+ intelligence tools
- [x] Signal detection engine (multi-layer convergence, intensity 1-5)
- [x] Prediction engine with accuracy tracking and Brier scoring
- [x] Trading integration (Trading212)
- [x] Thesis generation engine
- [x] Knowledge bank
- [x] Timeline event stream
- [x] Entity relationship graph
- [x] Alert system

### Dashboard & Widgets
- [x] Configurable dashboard with drag-and-drop reordering
- [x] Widget marketplace with categories and search
- [x] Candlestick chart widget
- [x] Macro dashboard (FRED integration, 31 series)
- [x] Yield curve widget
- [x] VIX gauge
- [x] Credit Stress Monitor (HY/IG OAS spreads)
- [x] Dollar Liquidity Index (Fed BS, RRP, M2)
- [x] Inflation Pulse (5Y/10Y breakevens)
- [x] Volatility Regime (VIX fear gauge)
- [x] Currency Stress (DXY, EUR, JPY, CNY)
- [x] Labor Market Pulse (claims, unemployment, payrolls)
- [x] Commodity Complex (gold, oil, natgas)
- [x] Housing & Consumer (starts, sentiment, retail)
- [x] GDP Nowcast
- [x] Calendar widget (Hebrew, Islamic, economic)
- [x] News feed widget
- [x] Portfolio value, thesis, predictions, signals widgets

### Chat System
- [x] Projects with color coding
- [x] Tag system with inline add/remove
- [x] Search across chat titles and message content
- [x] Move chats between projects
- [x] Context menu (tag, move, delete)

### Marketing
- [x] Landing page with animated bento grid
- [x] Pricing tiers (Analyst/Operator/Institution)
- [x] Game Theory standalone page (Nash equilibria, escalation ladder, Schelling points, dominant strategies)
- [x] Prediction resolution queue (`/predictions/resolve`) with Brier score auto-calc
- [x] Thesis AI suggestions based on active signal context
- [x] Thesis executive summary markdown rendering
- [x] Entity Graph redesigned as list/detail explorer

---

## System Gaps (from audit 2026-03-08)

### P0 — Critical

#### Alert Delivery Pipeline
- [x] Wire `NotificationBell` to SSE stream or polling fallback
- [x] Show toast on new alert trigger
- [x] Add sidebar badge count for undismissed alerts
- [ ] Stretch: email delivery via Resend or SendGrid

#### Subscription Gating
- [x] Add `requireTier(minTier)` middleware helper for API routes
- [x] Gate trading routes behind operator+ tier check
- [x] Show upgrade prompt when a gated feature is accessed on a lower tier (`UpgradeGate` component)
- [x] Client-side `useSubscription` hook + `SubscriptionProvider` context
- [x] Chat rate limiting by tier (daily message limits)
- [x] Chat gated to analyst+ tier
- [x] Gate intelligence routes (regime, nowcast, ACH, I&W, NLP, collection gaps, systemic risk) behind operator+ tier
- [x] Gate thesis routes behind analyst+ tier
- [x] Gate war room behind analyst+ tier

### P1 — High Priority

#### Signal Generation UI Trigger
No user-facing button to run signal detection. `/api/scheduler` route exists but requires manual HTTP calls.
- [ ] Add "Run Detection" button to the signals page header
- [ ] Show last-run timestamp and next scheduled time
- [ ] Spinner with refresh-on-complete
- [ ] Stretch: schedule configuration UI (daily / weekly / on-demand)

#### Signal → Trade Closed-Loop View
Chain Signal → Prediction → Trade → Outcome exists in DB but no connected view surfaces it.
- [ ] Add "Lineage" panel to signal detail page showing downstream predictions and trades
- [ ] Add signal origin to thesis detail page
- [ ] Approximate P&L attribution on the trading page

#### Portfolio Performance History
`portfolioSnapshots` table is populated but there is no historical chart.
- [ ] Equity curve chart on trading page (value over time from snapshots)
- [ ] Show peak, trough, drawdown, and cumulative return
- [ ] Add daily snapshot cron or trigger on portfolio page load

### P2 — Medium Priority

#### Onboarding Flow
New users land on an empty dashboard with no guidance.
- [ ] First-login welcome modal with step-by-step setup (connect broker, set API keys, run detection, generate thesis)
- [ ] Persist onboarding state in settings table
- [ ] Show completion indicator until all steps done

#### Export / Reporting
No way to export intelligence output.
- [ ] Thesis PDF export (title, summary, trading actions, layer inputs)
- [ ] Signals and predictions CSV export
- [ ] Weekly digest auto-generation (markdown summary of signals, resolved predictions, trades)

#### Game Theory: DB Persistence and AI Matching
Scenarios are hardcoded in `lib/game-theory/actors.ts`. The `game_theory_scenarios` DB table is out of sync.
- [ ] Persist analysis results to `game_theory_scenarios` with timestamps
- [ ] Allow users to annotate scenarios with current event notes
- [ ] "Which scenario most matches current signals?" AI cross-reference prompt

#### Knowledge Bank UX
The ingest UI is functional but rough.
- [ ] Bulk import (paste text, upload markdown file)
- [ ] Duplicate detection warnings before saving
- [ ] "Refresh embeddings" button for stale entries
- [ ] Surface knowledge entries in signal and thesis detail as supporting context

### P3 — Lower Priority

#### Mobile / Responsive Layout
Entire app uses `ml-48` fixed sidebar. Nothing works below ~1200px.
- [ ] Hamburger menu for sidebar on mobile
- [ ] Responsive page containers
- [ ] Priority: dashboard, signals list, thesis list

#### ACLED Conflict Data
Mentioned in system design but not implemented.
- [ ] `/api/acled` route using ACLED API
- [ ] ACLED events layer on War Room map
- [ ] Feed ACLED into geopolitical signal detection

#### Referral Payout Mechanism
Commissions tracked but no payout flow.
- [ ] Stripe Connect or manual payout queue
- [ ] "Request Payout" button once threshold is reached
- [ ] Payout history on referrals page

#### Model Selection in Settings
`getModel()` utility exists but model is effectively hardcoded.
- [ ] Add model preference setting (Opus / Sonnet / Haiku) per feature category
- [ ] Surface in settings under AI Configuration

#### Esoteric Signals (Cultural Context Only)
Stripped from trading composite: lunar phase, Chinese zodiac, numerology, flying stars, Kondratieff. Kept: Hebrew/Islamic calendars (first-class event layers). Esoteric data still available via `/api/esoteric` and calendar page.
- [ ] Surface as dedicated "Cultural Context" tab on calendar page (display only, clearly labeled non-trading)

#### Options Data Feed into Signals
Put/call ratio extremes should trigger a market signal. Currently options widget is display-only.
- [ ] Feed PCR extremes into the signal detection layer
- [ ] Add options flow summary to thesis layer inputs

### Technical Debt

- [ ] `lib/knowledge/ingest-final.ts` in root — unclear status, move or delete
- [ ] Signal scheduling has no retry logic or error recovery
- [ ] No structured error types across API routes (all ad hoc strings)
- [ ] No end-to-end or unit tests
- [ ] JSON stored in `text` Drizzle columns — migrate to `jsonb` for query performance on large datasets
- [ ] `gameTheoryScenarios` DB table exists but scenarios are hardcoded — reconcile or remove table
