# Methodology

Extracted from the platform's published research pages and whitepaper. This documents how NEXUS works at the analytical level.

## Four Core Phases

### Phase 1: DETECT (Multi-Layer Signal Detection)

Continuous monitoring across three primary signal layers plus systemic risk metrics and a narrative overlay. Each layer operates independently with specialized detection logic. Raw inputs normalized into a common signal schema: timestamp, category, affected entities, geographic scope, intensity score (1-5).

Layer independence ensures failure in one layer never compromises others.

### Phase 2: SCORE & FUSE (Convergence Analysis)

Signals scored for intensity (1-5 scale). Cross-layer amplification applies when signals from independent primary layers converge.

**Implementation**: Convergence bonus calculated as `Math.max(0, primaryLayers.length - 1)` added to base score, then normalized to 1-5 scale. The Bayesian fusion engine (`lib/signals/bayesian-fusion.ts`) provides an additional scoring path using proper posterior updating via likelihood ratios, conditional dependency matrices between layer pairs, and exponential likelihood ratio model for layer significance.

**Research pages reference**: Fixed multipliers of 1.4x/2.1x/3.2x are documented in the published methodology for conceptual clarity, but the actual implementation uses the additive bonus + Bayesian fusion approach described above.

Full four-layer convergence is exceptionally rare. Historical back-testing shows Level 5 events precede major market dislocations within a 72-hour window.

Full four-layer convergence is exceptionally rare. Historical back-testing shows Level 5 events precede major market dislocations within a 72-hour window.

### Phase 3: SYNTHESIZE (AI Analysis)

Claude-powered analyst synthesizes signals, generates theses with quantified confidence scores, produces game-theory scenario analysis with branching probabilities, and creates narrative intelligence reports with structured assessments.

### Phase 4: VALIDATE (Outcome Tracking & Feedback)

Price movements tracked at multiple intervals after predictions. Brier scoring measures calibration. Directional accuracy, magnitude accuracy, and timing accuracy measured separately. Feedback flows upstream to adjust detection thresholds, convergence weights, and AI prompts.

---

## Signal Layers

### Primary Convergence Layers

**GEO (Geopolitical)** - Decay: days to years
- Conflicts, treaties, sanctions, regime changes, military deployments, diplomatic shifts
- Sources: Government publications, defense intelligence, verified reporting networks

**MKT (Market)** - Decay: hours to days
- Price action anomalies, unusual volume, options flow, dark pool activity, credit spreads
- Quantitative backbone of signal detection

**OSI (OSINT)** - Decay: days to weeks
- Open source intelligence: social media, satellite imagery, shipping data, flight tracking, news wires
- Real-time ground truth validating or contradicting other layers

### Narrative Overlay (zero convergence weight, max 0.5 bonus)

**CAL (Calendar)** - Decay: weeks to months
- Hebrew holidays, Islamic calendar events, FOMC meetings, options expiry dates
- Tracked because some market participants and geopolitical actors incorporate calendar systems into their decision-making

**CEL (Celestial)** - Decay: weeks to months
- Eclipses, planetary alignments, lunar cycles, solar activity
- Actor-belief context only

### Signal Decay Formula

The research pages document an exponential decay model: `I(t) = I_0 * e^(-lambda * t)` where each signal has a half-life after which relevance decays 50%, varying by layer type (fast for markets, slow for geopolitical).

**Note**: This formula is documented in the published methodology but the signal engine implementation uses date-based status classification (upcoming/active/passed) rather than continuous decay. Signals are classified by proximity: upcoming (>1 day future), active (within 1 day), passed (<1 day ago), with a 3-day convergence window (`PROXIMITY_DAYS = 3`).

### Intensity Scale

| Level | Name | Description |
|-------|------|-------------|
| 1 | Background Noise | Routine events with minimal predictive value |
| 2 | Low Activity | Slight deviation from baseline |
| 3 | Elevated | Clear departure from normal, 2+ corroborating layers |
| 4 | High Alert | Strong convergence across 3+ layers with historical pattern matching |
| 5 | Critical Convergence | Maximum signal density, rare alignment across all layers |

---

## Prediction Methodology

### Prediction Lifecycle

1. **Generation** (Claude Sonnet): Inputs thesis, signals, game theory, base rates, calibration feedback. Produces 3-5 falsifiable predictions with 7/14/30/90 day deadlines. Each must trace to a specific data source.
2. **Pre-Event Lock**: Predictions locked before events (`preEvent=1`). If a wartime threshold fires, related predictions marked post-event and excluded from accuracy scoring.
3. **Regime Tagging**: Each prediction tagged with `regimeAtCreation` (peacetime/transitional/wartime) and reference prices (SPY, WTI, GLD snapshot).
4. **Direction vs Level Split**: Scored separately for directional correctness and target level accuracy.
5. **Resolution** (Claude Haiku): Compares claim against real market data. Outputs: confirmed/denied/partial/expired with score (0.0-1.0). Requires quoting specific numbers. Brutal honesty over optimism.
6. **Auto-Expiry**: 7 days past deadline, outcome='expired', score=0.1.

### Calibration System

- **Brier Score**: Primary metric, penalizes overconfidence
- **Log Loss**: Secondary probability calibration metric
- **Calibration Gap**: Difference between predicted probability and observed frequency
- **Per-Category Tracking**: Separate accuracy for geopolitical, market, conflict escalation, etc.
- **Timeframe Tracking**: Accuracy across 1-7 day, 8-14 day, 15+ day horizons
- **Damped Half-Gap Correction**: Adjusts confidence per category to prevent oscillation
- **Base Rate Integration**: Historical frequency of similar events with structural similarity assessment

### Temporal Validity Constraint

Predictions generated after event onset cannot be treated as prospective forecasts. They test analytical coherence, not forecasting skill. Only pre-event predictions measure genuine predictive capability. The platform distinguishes post-onset vs. pre-event predictions explicitly in reporting.

---

## Game Theory Framework

### Nash Equilibrium Analysis

Brute-force search over all strategy pairs. Best-response check for both actors. Stability classification: stable (positive payoff sum), unstable (negative), mixed.

### Escalation Ladder (5 Levels)

1. **Diplomatic Tensions**: Ambassador recalls, UN disputes, trade rhetoric
2. **Economic Sanctions**: Asset freezes, trade embargoes, SWIFT disconnections
3. **Proxy Engagements** (critical threshold): Arms transfers, cyber ops, info warfare
4. **Military Posturing** (max danger): Force mobilization, naval deployments, airspace violations
5. **Direct Confrontation**: Kinetic engagement, territory seizure, full mobilization

### Signalling Theory (3 Channels)

1. **Public Statements**: Low cost, high reversibility. Credibility scored against observable actions.
2. **Military Deployments**: High cost, hard to fake. Tracked via War Room aircraft/vessel monitoring.
3. **Economic Moves**: Medium cost. Used to calibrate payoff matrices and assess commitment levels.

### Scenario Branching

Game theory outputs feed into scenario analysis. Each equilibrium assessment generates branching paths with probability assignments. Weights update in real-time as new signals arrive.

### Bayesian N-Player Analysis

- Incomplete information model (actors have private types)
- Belief distributions updated via Bayes' rule from observed signals
- Perfect Bayesian equilibria with audience cost constraints
- Coalition fracture risk analysis
- Fearon bargaining range: when negotiation space collapses below 20%, conflict becomes likely

---

## Actor-Belief Profile System

Tracks 7 geopolitical actors. Each profile encodes:
- Behavioral type distributions (hawkish, diplomatic, escalatory, etc.)
- Base weekly action probabilities
- Calendar-conditioned Bayesian modifiers
- Public statements, scripture/doctrinal references, past decisions
- Belief frameworks

### Calendar-Conditioned Modifiers

Each modifier carries: posterior multiplier, historical basis, sample size, confidence rating. Effective multiplier damped by confidence: `effective = 1 + (posterior - 1) * confidence`. Multiple modifiers compose multiplicatively with hard cap at 0.95 probability.

Scripture/doctrinal references tracked not as mystical prediction but as data about an actor's likely behavioral mode.

---

## Psycho-History Parallels Engine

Searches knowledge bank, resolved prediction history, and signal archive for structurally similar past events using semantic vector search (Voyage AI v3, 1024-dimensional embeddings).

Scores parallels on structural similarity (0-1) considering: actor constellation overlap, escalation dynamics, economic preconditions, temporal context. Returns historical outcome, time-to-resolution, market impact, and key similarities/differences.

Not claiming historical determinism; surfaces patterns for human evaluation.

---

## Calendar Correlation Evidence

### Hebrew Calendar

- **Shmita Cycle** (7-year): 2000-01 dot-com collapse, 2007-08 financial crisis, 2014-15 China devaluation, 2021-22 regime changes
- **Purim** (Feb-Mar): Near fiscal year-end, statistical tendency for sharp reversals
- **Rosh Hashanah/Yom Kippur** (Sep-Oct): Autumn volatility window. Federal Reserve documented "Yom Kippur effect": reduced liquidity amplifies intraday moves

### Islamic Calendar

- **Ramadan**: GCC equity returns average 38bps higher/month with lower variance (Bialkowski et al., 2012)
- **Hajj Period**: Measurable impacts on Saudi equities, real estate, services

### Economic Calendar

- **FOMC**: 48 hours around rate decision account for 25% of annual S&P 500 returns (Lucca & Moench, 2015)
- **OPEX/Quad Witching**: Gamma exposure cliffs, 1-2% directional moves
- **NFP**: Moves 10-year yield average 6bps; 30 minutes post-release captures more volume than typical full sessions
- **Quarter-End Rebalancing**: Estimated $30-50B forced equity flows in final 3 trading days

### Three-System Convergence

Hebrew + Islamic + Economic within 5 days shows mean VIX elevation of 18% above trailing 30-day average.

### Statistical Requirements

1. Base rate comparison vs. non-holiday periods
2. Multiple testing correction (Bonferroni or Benjamini-Hochberg)
3. Out-of-sample validation
4. Mechanism requirement (plausible causal path)
5. Effect size over significance (must survive transaction costs)

---

## Documented Limitations

### Calendar/Celestial

Most academically contentious components. Evidence base thin and mixed. Kamstra et al. (2003) found no robust effect after controlling for seasonal affective disorder. These layers add contextual color to situations identified by stronger layers. Never the primary basis for any call. Performance contribution segmented and reported separately from GEO/MKT/OSI.

### Bayesian Fusion Assumptions

Dependency matrix values set from domain reasoning, not empirically calibrated. Should be updated from production data as resolved prediction dataset grows. Scenario priors (military escalation 5%, market disruption 12%) are order-of-magnitude estimates carrying uncertainty.

### Prediction Track Record

Dataset early-stage with wide confidence intervals. Few dozen predictions don't constitute statistical validation regardless of accuracy. Post-onset predictions explicitly separated from pre-event predictions in reporting.

### Data Source Dependencies

Aggregates from 39 external APIs (Alpha Vantage, FRED, GDELT, ACLED, OpenSky, 15 RSS feeds, Reddit, Polymarket, Kalshi, etc.). Each is a potential failure point. Graceful degradation returns empty results rather than failing. Quality bounded by input quality.

### AI Synthesis

Claude can produce confident-sounding analysis that is wrong. Carries training data biases. Mitigated by constraining to structured data inputs, requiring explicit confidence levels, and tracking all predictions against outcomes. AI is a tool requiring the same critical evaluation as other sources.

### Multiple Comparisons

7 actors across 17 calendar modifiers spanning 4 systems = 119 possible pairings. At 5% significance, ~6 show spurious correlations by chance. Addressed via confidence-damping and feedback loop auto-pruning. Formal Bonferroni/FDR correction planned but not yet implemented.

### Parameter Tuning and Look-Ahead Bias

Convergence window (3 days), intensity thresholds, likelihood ratio constants, scenario priors, and calibration buckets set from domain reasoning on historical data already known at design time. This introduces look-ahead bias: parameters perform better on known history than unseen future. Primary safeguard: Brier-scored prediction loop detects systematic errors. Feedback system allows data-driven recalibration as forward-looking dataset matures.
