# NEXUS Backtest Results

> Auto-generated from database. Actual results of the NEXUS signal convergence engine against historical data.

---

## Backtest: 2022-01-01 to 2023-12-31

| Parameter | Value |
|---|---|
| Run ID | `bt_1773154701245_3ac1nh` |
| Date Range | 2022-01-01 to 2023-12-31 |
| Instruments | TLT, IEF, XLU, VNQ, SPY |
| Layers | celestial, hebrew, islamic, geopolitical, economic, esoteric |
| Convergence Threshold | 3/5 |
| Timeframes | 14, 30 days |
| Step Interval | 7 days |
| Trading Cost | 10 bps |
| Completed | 2026-03-10 |

### Core Accuracy

| Metric | Value |
|---|---|
| Total Predictions | 28 |
| Validated | 28 |
| Directional Accuracy | 64.3% |
| Brier Score | 0.2390 |
| Log Loss | 0.6713 |
| Avg Confidence | 57.1% |
| Calibration Gap | 7.1% |
| 95% CI | [45.8%, 79.3%] |
| Effective Sample Size | 27 |

### Statistical Significance

| Test | Value |
|---|---|
| p-value | 0.068823 |
| p-value (Holm-Bonferroni) | 0.412938 |
| Significant at 95%? | No |

### Baseline Comparisons

| Baseline | Accuracy | Brier |
|---|---|---|
| **NEXUS** | **64.3%** | **0.2390** |
| Random | 50.0% | 0.2500 |
| Climatological | 44.2% | 0.2466 |

### Walk-Forward (5-Fold)

| Metric | Value |
|---|---|
| OOS Accuracy | 70.0% |
| OOS Brier | 0.2341 |
| Stability Ratio | 1.246 |
| OOS p-value | 0.036819 |

| Fold | Train | Test | Train Acc | Test Acc |
|---|---|---|---|---|
| 1 | 2022-02-15 - 2022-04-01 | 2022-04-14 - 2022-07-07 | 50.0% | 50.0% |
| 2 | 2022-02-15 - 2022-07-07 | 2022-07-28 - 2022-09-23 | 50.0% | 75.0% |
| 3 | 2022-02-15 - 2022-09-23 | 2022-10-03 - 2023-02-18 | 58.3% | 75.0% |
| 4 | 2022-02-15 - 2023-02-18 | 2023-03-06 - 2023-05-20 | 62.5% | 50.0% |
| 5 | 2022-02-15 - 2023-05-20 | 2023-06-15 - 2023-07-25 | 60.0% | 100.0% |

### By Volatility Regime

| Regime | n | Accuracy | Brier |
|---|---|---|---|
| normal | 10 | 50.0% | 0.2661 |
| low_vol | 7 | 71.4% | 0.2494 |
| elevated | 11 | 72.7% | 0.2077 |

### Cost Sensitivity

| Cost (bps) | Return % | Sharpe | Profit Factor |
|---|---|---|---|
| 5 | 0.0% | 1.615 | 3.26 |
| 10 | 0.0% | 1.494 | 2.97 |
| 15 | 0.0% | 1.373 | 2.71 |
| 20 | 0.0% | 1.251 | 2.47 |
| 30 | 0.0% | 1.008 | 2.06 |
| 50 | 0.0% | 0.519 | 1.43 |

### Portfolio Simulation

| Metric | Value |
|---|---|
| Final Value | $100983 |
| Return | 0.0% |
| Sharpe | 1.494 |
| Sortino | 1.953 |
| Max Drawdown | 0.0% |
| Win Rate | 64.3% |
| Profit Factor | 2.97 |
| Trades | 28 |

### By Category

| Category | n | Accuracy | Brier |
|---|---|---|---|
| mixed | 26 | 61.5% | 0.2418 |
| market | 2 | 100.0% | 0.2034 |

### By Year

| Year | n | Accuracy | Brier |
|---|---|---|---|
| 2022 | 14 | 64.3% | 0.2307 |
| 2023 | 14 | 64.3% | 0.2474 |

### Calibration

| Bucket | n | Predicted | Observed |
|---|---|---|---|
| 45-55% | 10 | 50% | 70% |
| 55-70% | 18 | 63% | 61% |

> **Warning:** Sample size (n=28) is below 30. Statistical metrics are unreliable and should be treated as directional only.

> **LLM Note:** 100% of predictions (28/28) are for dates before the LLM training cutoff (2025-04-01). The model's weights encode knowledge of actual outcomes for these dates, so backtest accuracy is likely inflated. Only 0 post-cutoff predictions exist (need 5+ for reliable measurement).

---

## Backtest: 2019-06-01 to 2021-06-30

| Parameter | Value |
|---|---|
| Run ID | `bt_1773117776047_8x9hyw` |
| Date Range | 2019-06-01 to 2021-06-30 |
| Instruments | GLD, TLT, SPY, GDX |
| Layers | celestial, hebrew, islamic, geopolitical, economic, esoteric |
| Convergence Threshold | 3/5 |
| Timeframes | 7, 14, 30 days |
| Step Interval | 7 days |
| Trading Cost | 10 bps |
| Completed | 2026-03-10 |

### Core Accuracy

| Metric | Value |
|---|---|
| Total Predictions | 28 |
| Validated | 5 |
| Directional Accuracy | 100.0% |
| Brier Score | 0.1916 |
| Log Loss | 0.5751 |
| Avg Confidence | 56.4% |
| Calibration Gap | 43.6% |
| 95% CI | [56.6%, 100.0%] |
| Effective Sample Size | 5 |

### Statistical Significance

| Test | Value |
|---|---|
| p-value | 0.012674 |
| p-value (Holm-Bonferroni) | 0.076042 |
| Significant at 95%? | No |

### Baseline Comparisons

| Baseline | Accuracy | Brier |
|---|---|---|
| **NEXUS** | **100.0%** | **0.1916** |
| Random | 50.0% | 0.2500 |
| Climatological | 66.5% | 0.2229 |

### Walk-Forward (0-Fold)

| Metric | Value |
|---|---|
| OOS Accuracy | 0.0% |
| OOS Brier | 0.0000 |
| Stability Ratio | 0.000 |
| OOS p-value | 1.000000 |

| Fold | Train | Test | Train Acc | Test Acc |
|---|---|---|---|---|

### By Volatility Regime

| Regime | n | Accuracy | Brier |
|---|---|---|---|
| normal | 1 | 100.0% | 0.2304 |
| low_vol | 2 | 100.0% | 0.1874 |
| unknown | 2 | 100.0% | 0.1764 |

### Cost Sensitivity

| Cost (bps) | Return % | Sharpe | Profit Factor |
|---|---|---|---|
| 5 | 0.0% | 1.860 | N/A |
| 10 | 0.0% | 1.799 | N/A |
| 15 | 0.0% | 1.738 | N/A |
| 20 | 0.0% | 1.677 | N/A |
| 30 | 0.0% | 1.556 | 1623.70 |
| 50 | 0.0% | 1.315 | 27.55 |

### Portfolio Simulation

| Metric | Value |
|---|---|
| Final Value | $100004 |
| Return | 0.0% |
| Sharpe | 1.799 |
| Sortino | 0.000 |
| Max Drawdown | 0.0% |
| Win Rate | 100.0% |
| Profit Factor | N/A |
| Trades | 5 |

### By Category

| Category | n | Accuracy | Brier |
|---|---|---|---|
| mixed | 5 | 100.0% | 0.1916 |

### By Year

| Year | n | Accuracy | Brier |
|---|---|---|---|
| 2021 | 5 | 100.0% | 0.1916 |

### Calibration

| Bucket | n | Predicted | Observed |
|---|---|---|---|
| 45-55% | 2 | 50% | 100% |
| 55-70% | 3 | 63% | 100% |

> **Warning:** Sample size (n=5) is below 30. Statistical metrics are unreliable and should be treated as directional only.

> **LLM Note:** 100% of predictions (5/5) are for dates before the LLM training cutoff (2025-04-01). The model's weights encode knowledge of actual outcomes for these dates, so backtest accuracy is likely inflated. Only 0 post-cutoff predictions exist (need 5+ for reliable measurement).

---

## Backtest: 2019-06-01 to 2021-06-30

| Parameter | Value |
|---|---|
| Run ID | `bt_1773117126879_29jwdz` |
| Date Range | 2019-06-01 to 2021-06-30 |
| Instruments | GLD, TLT, SPY, GDX |
| Layers | celestial, hebrew, islamic, geopolitical, economic, esoteric |
| Convergence Threshold | 3/5 |
| Timeframes | 7, 14, 30 days |
| Step Interval | 7 days |
| Trading Cost | 10 bps |
| Completed | 2026-03-10 |

### Core Accuracy

| Metric | Value |
|---|---|
| Total Predictions | 28 |
| Validated | 5 |
| Directional Accuracy | 100.0% |
| Brier Score | 0.1992 |
| Log Loss | 0.5905 |
| Avg Confidence | 55.6% |
| Calibration Gap | 44.4% |
| 95% CI | [N/A, N/A] |
| Effective Sample Size | undefined |

### Statistical Significance

| Test | Value |
|---|---|
| p-value | 0.012674 |
| p-value (Holm-Bonferroni) | 0.076042 |
| Significant at 95%? | No |

### Baseline Comparisons

| Baseline | Accuracy | Brier |
|---|---|---|
| **NEXUS** | **100.0%** | **0.1992** |
| Random | 50.0% | 0.2500 |
| Climatological | 66.5% | 0.2229 |

### Walk-Forward (0-Fold)

| Metric | Value |
|---|---|
| OOS Accuracy | 0.0% |
| OOS Brier | 0.0000 |
| Stability Ratio | 0.000 |
| OOS p-value | 1.000000 |

| Fold | Train | Test | Train Acc | Test Acc |
|---|---|---|---|---|

### By Volatility Regime

| Regime | n | Accuracy | Brier |
|---|---|---|---|
| normal | 1 | 100.0% | 0.2704 |
| low_vol | 2 | 100.0% | 0.1734 |
| unknown | 2 | 100.0% | 0.1895 |

### Cost Sensitivity

| Cost (bps) | Return % | Sharpe | Profit Factor |
|---|---|---|---|
| 5 | 0.0% | 1.764 | N/A |
| 10 | 0.0% | 1.711 | N/A |
| 15 | 0.0% | 1.657 | N/A |
| 20 | 0.0% | 1.604 | N/A |
| 30 | 0.0% | 1.497 | 1750.91 |
| 50 | 0.0% | 1.281 | 29.82 |

### Portfolio Simulation

| Metric | Value |
|---|---|
| Final Value | $100004 |
| Return | 0.0% |
| Sharpe | 1.711 |
| Sortino | 0.000 |
| Max Drawdown | 0.0% |
| Win Rate | 100.0% |
| Profit Factor | N/A |
| Trades | 5 |

### By Category

| Category | n | Accuracy | Brier |
|---|---|---|---|
| mixed | 5 | 100.0% | 0.1992 |

### By Year

| Year | n | Accuracy | Brier |
|---|---|---|---|
| 2021 | 5 | 100.0% | 0.1992 |

### Calibration

| Bucket | n | Predicted | Observed |
|---|---|---|---|
| 45-55% | 1 | 50% | 100% |
| 55-70% | 4 | 63% | 100% |

---

## Backtest: 2019-06-01 to 2021-06-30

| Parameter | Value |
|---|---|
| Run ID | `bt_1772973431092_0s3nze` |
| Date Range | 2019-06-01 to 2021-06-30 |
| Instruments | GLD, TLT, SPY, GDX |
| Layers | celestial, hebrew, islamic, geopolitical, economic, esoteric |
| Convergence Threshold | 3/5 |
| Timeframes | 7, 14, 30 days |
| Step Interval | 7 days |
| Trading Cost | 10 bps |
| Completed | 2026-03-08 |

### Core Accuracy

| Metric | Value |
|---|---|
| Total Predictions | 31 |
| Validated | 4 |
| Directional Accuracy | 100.0% |
| Brier Score | 0.2199 |
| Log Loss | 0.6321 |
| Avg Confidence | 53.5% |
| Calibration Gap | 46.5% |
| 95% CI | [N/A, N/A] |
| Effective Sample Size | undefined |

### Statistical Significance

| Test | Value |
|---|---|
| p-value | 0.022750 |
| p-value (Holm-Bonferroni) | N/A |
| Significant at 95%? | Yes |

### Baseline Comparisons

| Baseline | Accuracy | Brier |
|---|---|---|
| **NEXUS** | **100.0%** | **0.2199** |
| Random | 50.0% | 0.2500 |

### Portfolio Simulation

| Metric | Value |
|---|---|
| Final Value | $100004 |
| Return | 0.0% |
| Sharpe | 2.054 |
| Sortino | 0.000 |
| Max Drawdown | 0.0% |
| Win Rate | 100.0% |
| Profit Factor | N/A |
| Trades | 4 |

### By Category

| Category | n | Accuracy | Brier |
|---|---|---|---|
| mixed | 4 | 100.0% | 0.2199 |

### By Year

| Year | n | Accuracy | Brier |
|---|---|---|---|
| 2021 | 4 | 100.0% | 0.2199 |

### Calibration

| Bucket | n | Predicted | Observed |
|---|---|---|---|
| 45-55% | 2 | 50% | 100% |
| 55-70% | 2 | 63% | 100% |

---

## Backtest: 2019-06-01 to 2021-06-30

| Parameter | Value |
|---|---|
| Run ID | `bt_1772965310674_j7w89f` |
| Date Range | 2019-06-01 to 2021-06-30 |
| Instruments | GLD, TLT, SPY, GDX |
| Layers | celestial, hebrew, islamic, geopolitical, economic, esoteric |
| Convergence Threshold | 3/5 |
| Timeframes | 7, 14, 30 days |
| Step Interval | 7 days |
| Trading Cost | 10 bps |
| Completed | 2026-03-08 |

### Core Accuracy

| Metric | Value |
|---|---|
| Total Predictions | 0 |
| Validated | 0 |
| Directional Accuracy | 0.0% |
| Brier Score | 0.0000 |
| Log Loss | 0.0000 |
| Avg Confidence | 0.0% |
| Calibration Gap | 0.0% |
| 95% CI | [N/A, N/A] |
| Effective Sample Size | undefined |

### Statistical Significance

| Test | Value |
|---|---|
| p-value | 1.000000 |
| p-value (Holm-Bonferroni) | N/A |
| Significant at 95%? | No |

### Baseline Comparisons

| Baseline | Accuracy | Brier |
|---|---|---|
| **NEXUS** | **0.0%** | **0.0000** |
| Random | 50.0% | 0.2500 |

### By Category

| Category | n | Accuracy | Brier |
|---|---|---|---|

### By Year

| Year | n | Accuracy | Brier |
|---|---|---|---|

### Calibration

| Bucket | n | Predicted | Observed |
|---|---|---|---|

---

## Backtest: 2019-06-01 to 2021-06-30

| Parameter | Value |
|---|---|
| Run ID | `bt_1772950666177_oj3qje` |
| Date Range | 2019-06-01 to 2021-06-30 |
| Instruments | GLD, TLT, SPY, GDX |
| Layers | celestial, hebrew, islamic, geopolitical, economic, esoteric |
| Convergence Threshold | 3/5 |
| Timeframes | 7, 14, 30 days |
| Step Interval | 7 days |
| Trading Cost | 10 bps |
| Completed | 2026-03-08 |

### Core Accuracy

| Metric | Value |
|---|---|
| Total Predictions | 31 |
| Validated | 4 |
| Directional Accuracy | 100.0% |
| Brier Score | 0.2130 |
| Log Loss | 0.6181 |
| Avg Confidence | 54.3% |
| Calibration Gap | 45.8% |
| 95% CI | [N/A, N/A] |
| Effective Sample Size | undefined |

### Statistical Significance

| Test | Value |
|---|---|
| p-value | 0.022750 |
| p-value (Holm-Bonferroni) | N/A |
| Significant at 95%? | Yes |

### Baseline Comparisons

| Baseline | Accuracy | Brier |
|---|---|---|
| **NEXUS** | **100.0%** | **0.2130** |
| Random | 50.0% | 0.2500 |

### Portfolio Simulation

| Metric | Value |
|---|---|
| Final Value | $100003 |
| Return | 0.0% |
| Sharpe | 3.652 |
| Sortino | 0.000 |
| Max Drawdown | 0.0% |
| Win Rate | 100.0% |
| Profit Factor | N/A |
| Trades | 4 |

### By Category

| Category | n | Accuracy | Brier |
|---|---|---|---|
| mixed | 4 | 100.0% | 0.2130 |

### By Year

| Year | n | Accuracy | Brier |
|---|---|---|---|
| 2021 | 4 | 100.0% | 0.2130 |

### Calibration

| Bucket | n | Predicted | Observed |
|---|---|---|---|
| 45-55% | 1 | 50% | 100% |
| 55-70% | 3 | 63% | 100% |

---

## Backtest: 2021-09-01 to 2023-03-31

| Parameter | Value |
|---|---|
| Run ID | `bt_1772943181163_ztuq2w` |
| Date Range | 2021-09-01 to 2023-03-31 |
| Instruments | USO, XLE, OIH, SPY |
| Layers | celestial, hebrew, islamic, geopolitical, economic, esoteric |
| Convergence Threshold | 3/5 |
| Timeframes | 7, 14, 30 days |
| Step Interval | 7 days |
| Trading Cost | 10 bps |
| Completed | 2026-03-08 |

### Core Accuracy

| Metric | Value |
|---|---|
| Total Predictions | 23 |
| Validated | 23 |
| Directional Accuracy | 56.5% |
| Brier Score | 0.1972 |
| Log Loss | 0.6109 |
| Avg Confidence | 57.7% |
| Calibration Gap | 1.2% |
| 95% CI | [N/A, N/A] |
| Effective Sample Size | undefined |

### Statistical Significance

| Test | Value |
|---|---|
| p-value | 0.265807 |
| p-value (Holm-Bonferroni) | N/A |
| Significant at 95%? | No |

### Baseline Comparisons

| Baseline | Accuracy | Brier |
|---|---|---|
| **NEXUS** | **56.5%** | **0.1972** |
| Random | 50.0% | 0.2500 |

### By Category

| Category | n | Accuracy | Brier |
|---|---|---|---|
| mixed | 23 | 56.5% | 0.1972 |

### By Year

| Year | n | Accuracy | Brier |
|---|---|---|---|
| 2021 | 5 | 100.0% | 0.1484 |
| 2022 | 14 | 50.0% | 0.2157 |
| 2023 | 4 | 25.0% | 0.1934 |

### Calibration

| Bucket | n | Predicted | Observed |
|---|---|---|---|
| 30-45% | 1 | 38% | 0% |
| 45-55% | 9 | 50% | 33% |
| 55-70% | 10 | 63% | 70% |
| 70-85% | 3 | 77% | 100% |

---

## Backtest: 2019-06-01 to 2021-06-30

| Parameter | Value |
|---|---|
| Run ID | `bt_1772941058771_nzv0o4` |
| Date Range | 2019-06-01 to 2021-06-30 |
| Instruments | GLD, TLT, SPY, GDX |
| Layers | celestial, hebrew, islamic, geopolitical, economic, esoteric |
| Convergence Threshold | 3/5 |
| Timeframes | 7, 14, 30 days |
| Step Interval | 7 days |
| Trading Cost | 10 bps |
| Completed | 2026-03-08 |

### Core Accuracy

| Metric | Value |
|---|---|
| Total Predictions | 31 |
| Validated | 4 |
| Directional Accuracy | 100.0% |
| Brier Score | 0.2089 |
| Log Loss | 0.6100 |
| Avg Confidence | 54.5% |
| Calibration Gap | 45.5% |
| 95% CI | [N/A, N/A] |
| Effective Sample Size | undefined |

### Statistical Significance

| Test | Value |
|---|---|
| p-value | 0.022750 |
| p-value (Holm-Bonferroni) | N/A |
| Significant at 95%? | Yes |

### Baseline Comparisons

| Baseline | Accuracy | Brier |
|---|---|---|
| **NEXUS** | **100.0%** | **0.2089** |
| Random | 50.0% | 0.2500 |

### By Category

| Category | n | Accuracy | Brier |
|---|---|---|---|
| mixed | 4 | 100.0% | 0.2089 |

### By Year

| Year | n | Accuracy | Brier |
|---|---|---|---|
| 2021 | 4 | 100.0% | 0.2089 |

### Calibration

| Bucket | n | Predicted | Observed |
|---|---|---|---|
| 45-55% | 3 | 50% | 100% |
| 55-70% | 1 | 63% | 100% |

---

## Methodology

- **Signal Engine:** Multi-layer convergence detection (GEO, MKT, OSI, systemic risk)
- **Prediction:** Claude AI generates directional predictions when convergence exceeds threshold
- **Validation:** Predictions validated against actual price data at specified timeframe
- **Scoring:** Brier score (0.25 = random), directional accuracy, log loss
- **Statistics:** Binomial test, Holm-Bonferroni correction, Wilson CIs
- **Walk-Forward:** Expanding window cross-validation for temporal stability
- **Regime Analysis:** VIX-based regime conditioning (low_vol, normal, elevated, crisis)
- **Cost Sensitivity:** 5-50 bps transaction cost sweep

## References

- Brier (1950) Monthly Weather Review
- Holm (1979) Scandinavian J. Statistics
- Kritzman et al. (2011) J. Portfolio Management
- Tetlock & Gardner (2015) Superforecasting
- Caldara & Iacoviello (2022) American Economic Review
