# Changelog

All notable changes to Nexus are documented here.

## [Unreleased]

### Added

#### v2.1 Proactive Push System
- 14-job scheduler with continuous monitoring (1-min alert check, 5-min intelligence cycle, 5-min monitor sweep)
- SSE real-time alert delivery via NotificationProvider, NotificationBell (sidebar badge + dropdown), NotificationToast (5s auto-dismiss)
- Alert evaluation engine: price threshold, VIX level, signal intensity, prediction due, OSINT keyword
- AI-powered alert suggestions based on active signals

#### v2.2 Red Team Adversarial Layer
- Red team assessment on every signal analysis (non-blocking Claude Sonnet 4 call)
- Red team challenge wired into thesis generation pipeline with `red_team_challenge` DB column
- Thesis page surfaces: core challenge, kill conditions, alternative scenarios with probabilities, confidence adjustment, bias score
- Structural confirmation bias prevention

#### v2.3 Prediction Auto-Resolve & Self-Calibration
- Auto-resolve expired predictions every 6h via monitor sweep (compares against Alpha Vantage + GDELT)
- Brier score, log loss, calibration gap per prediction and per category
- Calibration API at `/api/predictions/calibration` with failure pattern detection
- Performance feedback injected into prediction generation for self-calibration
- Weighted Brier with exponential decay, resolution bias detection

#### v2.4 Three-Brain Architecture
- SENTINEL (Haiku): fast pattern detection, anomaly alerts, convergence detection
- ANALYST (Sonnet 4): deep reasoning, thesis impact, regime detection
- EXECUTOR (Haiku): position sizing (1-2% fixed fractional), risk enforcement (max 25% position, 15% drawdown, 1.5:1 R:R)
- Coordinator: Sentinel -> Analyst -> Executor pipeline, 5-min cycle

#### v3.1 Prediction Markets Integration
- Polymarket + Kalshi real-time probability feeds via Gamma API
- Divergence detection engine: cross-references market odds against NEXUS prediction confidence
- Full page with Overview/Geopolitical/Economic/Political/Divergences tabs
- Chat tool: `get_prediction_markets`

#### v3.4 On-Chain Analytics
- Whale transaction tracking (BTC >100) via Blockchain.com API
- Exchange flows (top 20 exchanges) via CoinGecko
- DeFi TVL tracking (top protocols) via DeFi Llama
- Stablecoin supply monitoring (USDT/USDC/DAI/FDUSD/USDe)
- Full page with whale alerts, exchange flows, DeFi TVL, stablecoin sections
- Chat tool: `get_on_chain`

#### v3.5 Shipping & Dark Fleet Intelligence
- 5 chokepoint monitoring (Hormuz, Suez, Malacca, Bab el-Mandeb, Panama)
- Dark fleet detection via GDELT maritime event keywords (sanctions evasion, STS transfers, AIS gaps)
- Traffic anomaly scoring correlating oil price volatility with GDELT mention frequency
- Chat tool: `get_shipping_intelligence`

#### v3.7 Narrative Tracker
- GDELT + Reddit (4 subreddits) narrative tracking with theme clustering
- Momentum scoring (rising/peaking/fading/stable) based on article recency
- Sentiment analysis via keyword matching (-1 to 1 scale)
- Narrative-price divergence detection
- Chat tool: `get_narratives`

#### v3.14 Bayesian Change-Point Detection
- Adams & MacKay (2007) BOCPD algorithm with Student-t predictive distribution
- Monitors 6 streams: VIX, gold, oil, US 10Y yield, DXY, signal intensity
- Run-length distribution tracking with memory-efficient pruning
- Full page with stream cards, timeline visualization, change-point table
- Chat tool: `get_change_points`

#### v3.15 Aggregate Short Interest Signal
- Short interest tracking for 10 sector-proxy ETFs via Alpha Vantage
- Per-sector aggregation with trend detection
- 52-week z-score and contrarian signal generation
- Chat tool: `get_short_interest`

#### v3.16 GPR Threats vs Acts Decomposition
- Caldara-Iacoviello GPR daily index with threats/acts sub-indices
- Regional GPR proxies (5 regions) via GDELT event counting
- Asset exposure mapping per region (ME->oil, East Asia->semis, etc.)
- Threshold crossing detection (elevated/crisis/extreme)
- Chat tool: `get_gpr_index`

#### v3.17 Gamma Exposure (GEX) Engine
- Net dealer gamma calculation for SPY, QQQ, IWM from options chain data
- Zero-gamma level, put wall, call wall identification
- Regime classification: dampening (positive GEX) vs amplifying (negative GEX)
- Synthetic fallback using VIX + put/call ratio with confidence scoring
- Chat tool: `get_gamma_exposure`

#### Subscription Gating (P0)
- `requireTier(minTier)` server-side middleware: checks user subscription, admin bypass, returns 403 with upgrade prompt
- `getUserTier()` non-enforcing check for soft-gating and rate limiting
- `SubscriptionProvider` + `useSubscription()` client-side hook for tier-aware UI
- `UpgradeGate` component: wraps content behind tier check with lock icon + upgrade CTA
- Trading routes (Trading 212 + Coinbase) gated to operator+ tier
- Chat gated to analyst+ tier with daily message rate limiting by tier
- `rateLimit()` utility with windowed counters

#### Signal Convergence Backtester
- Admin backtesting engine with time-gated AI predictions and strict temporal isolation
- 5-phase pipeline: collect data, generate signals, simulate, validate, analyze
- Statistical validation: Brier scores, p-values (binomial test), calibration curves, log loss
- Recharts dashboard with cumulative accuracy, Brier over time, hypothetical P&L, YoY performance

#### Research Pages
- Methodology: expandable phases, convergence scoring, data sources, risk framework
- Game theory: interactive payoff matrix, escalation ladder, signalling theory, scenario branching
- Signal theory: continuous animation, cleaned tag styling, code-style formulas

#### Public Pages
- About, careers, contact, docs, status, terms, privacy, cookies, security via (public) route group
- Polyxmedia credit in footer, homepage footer replaced with shared PublicFooter

- **Watchlists** - create multiple watchlists, add/remove symbols, live quotes from Alpha Vantage, drag-and-drop reorder, rename/delete, popular symbol suggestions
- **Chat Projects** - organize chats into color-coded projects
- **Chat Tags** - tag chats with custom labels, filter by tag
- **Chat Search** - full-text search across chat titles and message content
- **Chat Context Menu** - right-click to tag, move to project, or delete chats
- **Credit Stress Monitor widget** - HY/IG OAS spreads with stress regime classification and gauge bars
- **Dollar Liquidity Index widget** - net liquidity from Fed balance sheet minus reverse repo, M2 tracking
- **Inflation Pulse widget** - 5Y/10Y breakeven inflation rates with trend analysis
- **Volatility Regime widget** - VIX fear gauge with 5-level regime label and sparkline
- **Currency Stress widget** - DXY, EUR/USD, JPY/USD, CNY/USD with strength direction
- **Labor Market Pulse widget** - initial/continuing claims, unemployment, payrolls with health status
- **Commodity Complex widget** - gold, WTI, Brent, natural gas with sparklines and % changes
- **Housing & Consumer widget** - housing starts, consumer sentiment, retail sales
- **GDP Nowcast widget** - real GDP growth with regime classification and industrial production
- Expanded FRED macro snapshot from 17 to 31 series

### Changed
- Chat sessions schema now supports `projectId` and `tags` fields
- Chat list page rebuilt with project sidebar, tag filter, and search bar
- Dashboard marketplace expanded with 9 new institutional-grade widgets

---

## [1.0.0] - 2026-03-06

### Added
- War Room geopolitical map (CARTO tiles, conflict zones, actor markers, strategic locations)
- Aircraft tracking layer (OpenSky Network, military callsign classification, 20s polling)
- OSINT layer (GDELT API with seed data fallback, 15 conflict hotspots)
- Scenario modeling panel with game theory analysis
- AI Chat with SSE streaming and 20+ intelligence tools
- Signal detection engine (celestial, Hebrew calendar, geopolitical, convergence layers)
- Signal intensity scoring (1-5) with multi-layer convergence
- Prediction engine with confidence scoring and outcome tracking
- Brier score and binary accuracy metrics for predictions
- Trading integration with Trading212 (demo and live)
- Trade execution from AI chat and thesis recommendations
- Thesis generation engine with executive summary, risk scenarios, trading actions
- Knowledge bank (theses, world models, actor profiles)
- Timeline event stream with cross-referencing
- Entity relationship graph with force-directed visualization
- Alert system (price threshold, VIX level, geofence, signal intensity, OSINT keyword)
- Alert history with dismissal
- Dashboard with configurable widget grid
- Widget drag-and-drop reordering in edit mode
- Widget marketplace with categories and search
- Candlestick chart widget (Alpha Vantage)
- Macro dashboard widget (FRED API)
- Yield curve visualization
- VIX gauge metric
- Put/call ratio widget
- Portfolio risk metrics (VaR, Sharpe, max drawdown)
- Calendar widget (Hebrew, Islamic, economic events)
- News feed widget (RSS aggregation)
- Portfolio value metric with P&L
- Threat level, market regime, convergence density metrics
- Thesis confidence and prediction accuracy metrics
- Multi-calendar convergence (Hebrew, Islamic, Chinese, FOMC, OPEX)
- Monte Carlo simulation tool in chat
- OSINT ingestion from GDELT and RSS feeds
- Marketing landing page with animated bento grid and pricing tiers
- SQLite database with WAL mode via drizzle-orm
- Dark navy theme with signal color system
- IBM Plex Mono + Sans typography
