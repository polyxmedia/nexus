---
paths:
  - "lib/signals/**/*.ts"
  - "lib/predictions/**/*.ts"
  - "lib/regime/**/*.ts"
  - "app/api/signals/**/*.ts"
  - "app/api/predictions/**/*.ts"
---

# Signal & Prediction Engine Rules

@SYSTEMS.md @METHODOLOGY.md

## Signal Architecture

4 primary signal layers + narrative overlay:

1. **GEO** - Geopolitical events (GDELT, ACLED, manual)
2. **MKT** - Market regime shifts (VIX, sector rotation, options flow)
3. **OSI** - OSINT intelligence (aircraft tracking, shipping, social)
4. **Systemic Risk** - Cross-asset correlation breakdowns

**Narrative overlay** (CAL/CEL):
- Calendar (Hebrew, Islamic, FOMC, OPEX) and Celestial as actor-belief context
- Max 0.5 bonus, NO convergence weight
- These are actor-belief context only, not predictive layers

## Signal Convergence

- Signals fire when multiple layers align on the same event/timeframe
- Intensity scale: 1-5
- `layers` field: JSON array of contributing layer names
- `marketSectors`: JSON array of affected sectors

## Prediction Rules

- Regime-aware tagging: `regimeAtCreation` (peacetime/transitional/wartime)
- Direction vs level split scoring: `directionCorrect` + `levelCorrect`
- Pre-event filtering: `preEvent` flag
- Volume cap: 75 max active predictions
- Auto-expiry: 7 days past deadline
- Brier score: `score` field (0-1, lower is better)
- Confidence: 0-1 range, calibration tracked

## Prediction Outcomes

Valid outcomes: `confirmed`, `denied`, `partial`, `expired`, `post_event`

## Regime Detection

6-dimensional regime detection in `lib/regime/`:
- Market volatility, geopolitical tension, monetary policy, credit stress, liquidity, sentiment
