# Core Systems

## 1. Signal Detection Engine

**Location**: `lib/signals/`

Three primary convergence layers + systemic risk metrics, scored via Bayesian fusion:

### Layers
1. **Geopolitical** (`geopolitical.ts`) - Conflict anniversaries (Oct 7, Feb 24), elections, sanctions, military exercises. Manually curated event library with market sector tags.
2. **Market/Technical** - Technical indicators (RSI, MACD, Bollinger, ATR), regime state, options flow
3. **OSINT** - GDELT event feeds, entity extraction, sentiment analysis
4. **Systemic Risk** - Contagion modeling, credit spreads, VIX regime, yield curve

### Narrative Overlay (not a convergence layer)
- **Celestial** (`celestial.ts`) - Eclipses, conjunctions, retrogrades. Actor-belief context only.
- **Hebrew Calendar** (`hebrew-calendar.ts`) - Holidays, Shmita cycles, historical precedents
- **Islamic Calendar** (`islamic-calendar.ts`) - Hijri tracking, Ramadan, market relevance for Muslim-majority economies

Max 0.5 bonus from narrative overlay. No convergence weight.

### Convergence Scoring
Bayesian fusion via `scoreBayesianConvergences()` replaces additive scoring. Multi-layer convergences generate synthetic signals with intensity (1-5), category, and layers JSON. Status: upcoming (>1 day future), active (within 1 day), passed (<-1 day).

---

## 2. Prediction Engine

**Location**: `lib/predictions/engine.ts`

### Lifecycle
1. **Generation** (Claude Sonnet): Input thesis + signals + game theory + base rates + calibration feedback. Output: 3-5 falsifiable predictions (7/14/30/90 day deadlines). Each prediction must trace to a specific data source.
2. **Pre-Event Lock**: Pending predictions marked `preEvent=1`. When wartime threshold fires, related predictions set to `preEvent=0` + outcome='post_event'. Post-event predictions excluded from accuracy scoring.
3. **Regime Tagging**: `regimeAtCreation` (peacetime/transitional/wartime), `referencePrices` (SPY, WTI, GLD snapshot), `regimeInvalidated` flag.
4. **Direction vs Level Split**: `direction` (up/down/flat), `priceTarget` (numeric), `referenceSymbol` (asset to measure). Scored separately: `directionCorrect` and `levelCorrect`.
5. **Resolution** (Claude Haiku): Input prediction claim + real market data. Output: confirmed/denied/partial/expired + score (0.0-1.0). Rules: quote specific numbers, brutal honesty over optimism.
6. **Auto-Expiry**: 7 days past deadline. outcome='expired', score=0.1.

### Self-Calibration
- Brier score and log-loss tracking
- Per-confidence-band calibration curves
- Per-category accuracy with damped half-gap correction
- Calibration multiplier per category (e.g., 0.85 = reduce confidence by 15%)
- Base rate integration with structural similarity assessment

### Cross-Layer Amplification
Convergence bonus is calculated as `Math.max(0, primaryLayers.length - 1)` and added to base score. Only primary layers count; narrative layers (CAL/CEL) do not contribute to convergence. Raw intensity is capped at 10 then normalized to 1-5 scale.

Note: The research pages reference fixed multipliers (1.4x, 2.1x, 3.2x) but the actual code uses the Bayesian fusion engine (`lib/signals/bayesian-fusion.ts`) with likelihood ratios and posterior updating, plus the simpler additive convergence bonus above.

### Volume Cap
MAX_ACTIVE_PREDICTIONS = 500

---

## 3. Regime Detection

**Location**: `lib/regime/detection.ts`

Six dimensions, each classified into discrete states:

| Dimension | Source | States |
|-----------|--------|--------|
| Volatility | VIX | suppressed (<13) > low-vol > normal > elevated > high-vol > crisis (>40) |
| Growth | GDP + jobless + consumer sentiment + industrial production | expansion (>3%) > growth > slowdown > contraction |
| Monetary | Fed Funds + direction | emergency (<1%) > neutral > tightening > easing |
| Risk Appetite | Credit spreads + VIX + yield curve | risk-on > neutral > risk-off > panic |
| Dollar | DXY + direction | weakening > stable > strengthening > dollar-crisis (>110) |
| Commodities | Oil + gold | supercycle-up > stable > deflation > supply-shock |

**Composite Score**: Weighted average from -1 (max risk-off) to +1 (max risk-on).
**Persistence**: Stored in `regime:store` with transition history and market implications.

---

## 4. Game Theory Engine

**Location**: `lib/game-theory/`

### Nash Equilibrium Finder (`analysis.ts`)
- Brute-force iteration over all strategy pairs
- Best-response check for both actors
- Stability: stable (positive payoff sum), unstable (negative), mixed

### Schelling Points
- Pareto-optimal outcomes (both actors gain)
- Least escalatory strategies (status quo bias)
- Convention-based solutions

### Escalation Ladder
- Step-by-step from disagreement to conflict
- Probability at each step
- Market impact projection per step

### 10 Built-In Scenarios
taiwan-strait, iran-nuclear, opec-production, russia-ukraine-endgame, us-china-trade-war, hormuz-closure, india-pakistan-kashmir, red-sea-shipping, eu-energy-crisis, dprk-provocation

### Wartime Thresholds (`wartime.ts`)
When thresholds fire:
1. Strategies invalidated (diplomacy non-viable after strikes)
2. Escalation trajectories activated with probability estimates
3. Scenario states transition: peacetime > escalating > wartime > de-escalating
4. Affected predictions marked post-event

### Bayesian N-Player (`bayesian.ts`)
- Incomplete information model (actors have private types)
- Belief distributions updated via Bayes' rule from observed signals
- Perfect Bayesian equilibria with audience cost constraints
- Coalition fracture risk analysis
- Fearon bargaining range (negotiation failure probability, <20% = conflict likely)

---

## 5. Thesis Generation

**Location**: `lib/thesis/engine.ts`

### Pipeline
1. **Data Gathering**: Technical snapshots, market sentiment, signal convergences, game theory analysis
2. **Bayesian N-Player Game Theory**: Fearon bargaining range, actor type distributions, audience cost constraints, coalition stability
3. **Red Team Challenge**: Adversarial assessment from opposing perspective
4. **Backtest Integration**: Walk-forward OOS accuracy feeds thesis credibility

### Output Structure
- Executive summary, situation assessment, risk scenarios
- Trading actions (direction, entry conditions, risk level)
- Market regime, volatility outlook, convergence density
- Overall confidence (0-1)
- Red team challenge with kill conditions
- Valid until date

---

## 6. Knowledge Bank

**Location**: `lib/knowledge/engine.ts`

### Operations
- `addKnowledge`: Insert + background embedding via Voyage AI
- `updateKnowledge`: Edit + re-embed if content changed
- `archiveKnowledge`: Mark archived (keeps in DB)
- `supersedeKnowledge`: Mark old version superseded, link to new

### Retrieval
- `searchKnowledge`: Semantic search (pgvector cosine distance) with LIKE fallback
- `getRelevantKnowledge`: Multi-topic retrieval, deduped across topics
- Categories: thesis, model, event, actor, market, geopolitical, technical

### Embeddings
Voyage AI, 1024-dimensional vectors stored in pgvector column. Searched via `<->` operator.

---

## 7. Chat System

**Location**: `lib/chat/tools.ts`, `lib/chat/prompt.ts`

### 59 Tools
Signal & market data, game theory, macro, options, portfolio risk, intelligence & knowledge, historical parallels, actor profiles, OSINT, web search, narrative reports, artifacts, memory, on-chain, shipping, congressional trading, prediction markets, gamma exposure, GPR index, BOCPD, ACH analysis, source reliability, correlation monitor, nowcasting, systemic risk, vessel tracking, VIP movements, longevity, AI progression, bayesian analysis, central bank analysis, collection gaps, narratives, short interest, esoteric readings, economic calendar, market regime, IW status, operator context, scenario branches, document generation

### System Prompt Protocol
- Mandatory Superforecasting: Call 5 tools in parallel before any probability
- Regime detection before every analysis
- Structural similarity check, falsification search, pre-mortem, hard data cross-check
- Artifact-based output (tables, briefings) instead of plain text

### Message Compression
When sessions exceed 20 messages: summarization + recent 8 messages retained

### Memory
Persistent per-user memories (preferences, theses, portfolio, instructions) injected at conversation start via `recall_memory` tool.

---

## 8. Backtest Feedback Loops

**Location**: `lib/backtest/feedback-loops.ts`

### Connections to Live Systems
1. **Category Accuracy > Prediction Confidence**: Brier score per category drives damped half-gap correction multipliers
2. **Walk-Forward OOS > Thesis Credibility**: Out-of-sample accuracy feeds thesis confidence
3. **Regime Analysis > Detection Calibration**: Per-regime accuracy stored alongside regime state
4. **Cost Sensitivity > Position Sizing**: Backtest cost analysis (slippage, commissions) scales position sizes
5. **Calibration > Confidence Correction**: Per-confidence-band and per-timeframe reliability curves

Cache: 10-minute TTL.

---

## 9. War Room

**Location**: `lib/warroom/`, components in `components/warroom/`

### Layers
- **Aircraft**: OpenSky Network ADS-B (20s polling), filtered by military callsign prefixes
- **VIP Aircraft**: 15,000+ known VIP aircraft (heads of state, oligarchs, defense officials) from plane-alert-db
- **Vessels**: Maritime tracking with chokepoint monitoring (Suez, Hormuz, Panama, Malacca)
- **OSINT**: GDELT event feeds (5min polling) with entity extraction
- **Conflict Heatmap**: ACLED conflict data overlay
- **Satellites**: Satellite position tracking

### Views
- 2D Leaflet map with CARTO dark tiles
- 3D globe with custom earth shaders and atmosphere

---

## 10. Alert System

**Location**: `lib/alerts/`

### Condition Types
price_threshold, vix_level, geofence, signal_intensity, prediction_due, osint_keyword, custom

### Notification Channels
Telegram, SMS, email, in-app (SSE streaming via `/api/alerts/stream`)

### Checking
Scheduled condition evaluation with severity classification and trigger history logging.
