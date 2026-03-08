# Prediction Engine Academic Upgrade Roadmap

Research-backed improvements to transform NEXUS from additive convergence scoring to statistically rigorous Bayesian intelligence fusion.

## Priority Stack (ordered by impact/effort ratio)

### 1. Red Team Prompt in AI Synthesis
- **Effort**: Trivial | **Impact**: High
- **Research**: Tetlock GJP - structured disagreement outperforms consensus
- **Implementation**: Add adversarial challenge step before prediction generation. The AI must argue against the current thesis before generating predictions.
- **File**: `lib/predictions/engine.ts`, `lib/prompts/registry.ts`
- **Status**: DONE - Red team adversarial challenge via Haiku before main prediction generation

### 2. Base Rate Anchoring
- **Effort**: Low | **Impact**: High
- **Research**: Tetlock "Fermi-ize" principle - outside-view base rates before inside-view adjustment
- **Implementation**: Inject empirical base rates into prediction prompt (e.g., "military operations launch in ~2% of weeks during standoffs", "VIX spikes above 30 occur ~8% of trading days"). Force the model to start from base rates and adjust.
- **File**: `lib/predictions/base-rates.ts` (new), `lib/predictions/engine.ts`
- **Status**: DONE - Empirical base rates module + log-odds adjustment + prompt injection + post-generation confidence anchoring

### 3. Incremental Belief Updating
- **Effort**: Low | **Impact**: High
- **Research**: GJP data - frequent small updates beat infrequent large revisions. Most accurate forecasters made 2-5% adjustments.
- **Implementation**: New function `updatePredictionConfidence()` that reviews existing predictions against new signals and adjusts confidence by small increments (capped at +/-5% per cycle). Replaces the current "generate new or ignore" binary.
- **File**: `lib/predictions/engine.ts`
- **Status**: DONE - `updateExistingPredictions()` with +/-5% capped adjustments per cycle

### 4. Prediction Market Benchmark Integration
- **Effort**: Low | **Impact**: Medium
- **Research**: External calibration against crowd wisdom. Divergence from markets is itself a signal.
- **Implementation**: Already have Polymarket + Kalshi integration. Feed divergence data INTO prediction generation prompt so the model knows when NEXUS disagrees with markets. Track divergence accuracy over time.
- **File**: `lib/predictions/engine.ts`, `lib/prediction-markets/divergence.ts`
- **Status**: TODO

### 5. BIN Decomposition + Calibration Infrastructure
- **Effort**: Low-Medium | **Impact**: Medium
- **Research**: Satopaa et al. 2021 - Bias-Information-Noise decomposition. Brier score decomposes into calibration + resolution + uncertainty.
- **Implementation**: Extend `feedback.ts` with BIN decomposition, resolution scoring, and reliability diagrams. After each scoring cycle, identify whether errors come from bias (systematic), noise (random), or information gaps.
- **File**: `lib/predictions/feedback.ts`
- **Status**: DONE - Full BIN decomposition, per-category breakdown, diagnostic recommendations in performance report

### 6. Bayesian Fusion (Replace Additive Scoring)
- **Effort**: Medium | **Impact**: Highest
- **Research**: Martin 2026 (arXiv:2601.13362) - Bayesian networks with conditional dependencies outperform naive models. Hoegh et al. 2015 (Technometrics) - Bayesian model fusion for multi-source signal prediction.
- **Implementation**: Replace additive convergence bonus system with proper Bayesian updating. Each layer produces a likelihood ratio, maintain prior probability per scenario, convergence score = posterior after sequential updating across layers. Model conditional dependencies (oil <-> geopolitical risk, calendar <-> actor-belief).
- **File**: `lib/signals/bayesian-fusion.ts` (new), `lib/signals/engine.ts` (wired in)
- **Status**: DONE - Sequential Bayesian updating, conditional dependency matrix, layer reliability coefficients, scenario-type priors. Integrated as drop-in replacement in signal engine.

### 7. Actor-Belief Bayesian Typing (Calendar Layer)
- **Effort**: Medium | **Impact**: Medium-High
- **Research**: Tahir 2025 - computational geopolitics with dynamic graph nodes and Bayesian type revision. Calendar events modeled as signals that update actor-type probabilities.
- **Implementation**: Replace "Purim = +1 convergence" with "Ben Gvir's prior(provocative action) = 0.3; on Tisha B'Av, posterior = 0.7 based on documented behavior." Each actor has a type distribution (cooperative/hawkish) with calendar-conditioned priors.
- **File**: `lib/signals/actor-beliefs.ts` (new), `lib/predictions/engine.ts` (wired into prediction prompt)
- **Status**: DONE - 7 actor profiles, 17 calendar behavior modifiers, Bayesian type-revision with confidence damping. Integrated into prediction generation prompt.

---

## Academic References

- Martin, C. (2026). "Bayesian Networks for Geopolitical Forecasting." arXiv:2601.13362
- Hoegh, A. et al. (2015). "Bayesian Model Fusion for Civil Unrest Prediction." Technometrics
- Satopaa, V. et al. (2021). "Bias, Information, Noise: A BIN Model of Forecasting." Management Science
- Mellers, B. et al. (2024). "Human and Algorithmic Predictions." Extended GJP research
- Tetlock, P. & Gardner, D. (2015). "Superforecasting." Crown
- Heuer, R. & Pherson, R. (2010). "Structured Analytic Techniques for Intelligence Analysis." CQ Press
- Tahir, M. (2025). "Computational Geopolitics: Bayesian Game Theory for State Actor Modeling."
