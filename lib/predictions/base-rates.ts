/**
 * Empirical base rates for prediction anchoring.
 *
 * Implements Tetlock's "Fermi-ize" principle: start from outside-view
 * base rates before applying inside-view adjustments. This prevents
 * overconfident predictions on rare events and underconfident predictions
 * on common ones.
 */

export const BASE_RATES = {
  // Market events (annualized frequencies converted to weekly/monthly probabilities)
  market: {
    spx_weekly_drop_5pct: 0.02,
    spx_weekly_drop_10pct: 0.004,
    vix_above_30: 0.08,
    vix_above_40: 0.02,
    oil_weekly_move_10pct: 0.04,
    gold_new_ath_month: 0.05,
    recession_any_quarter: 0.06,
    fed_rate_change_meeting: 0.35,
    sector_rotation_month: 0.15,
    flash_crash_year: 0.08,
  },

  // Geopolitical events
  geopolitical: {
    military_op_any_week: 0.02,
    sanctions_new_round_month: 0.08,
    ceasefire_holds_30d: 0.40,
    regime_change_year: 0.03,
    chokepoint_disruption_month: 0.01,
    nuclear_test_year: 0.15,
    territorial_dispute_escalation_month: 0.05,
    diplomatic_breakthrough_quarter: 0.10,
    election_upset: 0.20,
    coup_attempt_year: 0.04,
  },

  // Calendar/convergence events
  celestial: {
    calendar_convergence_week: 0.05,
    convergence_with_market_move: 0.15,
    holiday_volatility_premium: 1.3,
  },
} as const;

export type BaseRateCategory = keyof typeof BASE_RATES;

const RATE_DESCRIPTIONS: Record<string, Record<string, { label: string; timeframe: string }>> = {
  market: {
    spx_weekly_drop_5pct: { label: "S&P 500 drops 5%+ in a week", timeframe: "week" },
    spx_weekly_drop_10pct: { label: "S&P 500 drops 10%+ in a week", timeframe: "week" },
    vix_above_30: { label: "VIX closes above 30", timeframe: "trading day" },
    vix_above_40: { label: "VIX closes above 40", timeframe: "trading day" },
    oil_weekly_move_10pct: { label: "WTI crude moves 10%+ in a week", timeframe: "week" },
    gold_new_ath_month: { label: "Gold hits new all-time high", timeframe: "month" },
    recession_any_quarter: { label: "US enters recession", timeframe: "quarter" },
    fed_rate_change_meeting: { label: "Fed changes rates at a meeting", timeframe: "meeting" },
    sector_rotation_month: { label: "Major sector rotation occurs", timeframe: "month" },
    flash_crash_year: { label: "Flash crash event occurs", timeframe: "year" },
  },
  geopolitical: {
    military_op_any_week: { label: "Major military operation launches (during standoff)", timeframe: "week" },
    sanctions_new_round_month: { label: "New sanctions round imposed (during tensions)", timeframe: "month" },
    ceasefire_holds_30d: { label: "Ceasefire holds 30 days once announced", timeframe: "instance" },
    regime_change_year: { label: "Regime change in any country", timeframe: "year" },
    chokepoint_disruption_month: { label: "Major chokepoint disruption", timeframe: "month" },
    nuclear_test_year: { label: "DPRK nuclear test", timeframe: "year" },
    territorial_dispute_escalation_month: { label: "Territorial dispute escalates militarily", timeframe: "month" },
    diplomatic_breakthrough_quarter: { label: "Major diplomatic breakthrough", timeframe: "quarter" },
    election_upset: { label: "Election produces upset result", timeframe: "instance" },
    coup_attempt_year: { label: "Coup attempt anywhere", timeframe: "year" },
  },
  celestial: {
    calendar_convergence_week: { label: "Multi-calendar convergence occurs", timeframe: "week" },
    convergence_with_market_move: { label: "Market move >2% on convergence day", timeframe: "convergence day" },
    holiday_volatility_premium: { label: "Volatility multiplier around major holidays", timeframe: "multiplier" },
  },
};

/**
 * Returns a formatted block of relevant base rates for injection into
 * prediction prompts.
 */
export function getBaseRateContext(categories: string[]): string {
  const lines: string[] = ["EMPIRICAL BASE RATES (outside-view anchors):"];

  for (const category of categories) {
    const rates = BASE_RATES[category as BaseRateCategory];
    const descriptions = RATE_DESCRIPTIONS[category];
    if (!rates || !descriptions) continue;

    lines.push("");
    lines.push(`[${category.toUpperCase()}]`);

    for (const [key, value] of Object.entries(rates)) {
      const desc = descriptions[key];
      if (!desc) continue;

      if (desc.timeframe === "multiplier") {
        lines.push(`- ${desc.label}: ${value}x baseline`);
      } else {
        const pct = (value as number) * 100;
        const formatted = pct < 1 ? pct.toFixed(1) : Math.round(pct);
        lines.push(`- ${desc.label}: ${formatted}% base probability per ${desc.timeframe}`);
      }
    }
  }

  lines.push("");
  lines.push("Use these as starting anchors. Adjust based on specific evidence, but document why your estimate diverges from the base rate.");

  return lines.join("\n");
}

/**
 * Convert a probability to log-odds. Clamps to avoid infinities.
 */
function toLogOdds(p: number): number {
  const clamped = Math.max(0.001, Math.min(0.999, p));
  return Math.log(clamped / (1 - clamped));
}

/**
 * Convert log-odds back to probability.
 */
function fromLogOdds(lo: number): number {
  return 1 / (1 + Math.exp(-lo));
}

/**
 * Adjusts a stated confidence toward the base rate using log-odds
 * weighted averaging.
 *
 * Evidence strength controls how much the model's estimate can pull
 * away from the base rate:
 *   1 (weak)       - stays close to the base rate (weight 0.2 on model estimate)
 *   2 (moderate)   - weight 0.4 on model estimate
 *   3 (solid)      - weight 0.6 on model estimate
 *   4 (strong)     - weight 0.8 on model estimate
 *   5 (very strong)- nearly trusts the model estimate (weight 0.9)
 *
 * This prevents the common failure mode where the model assigns 90%
 * confidence to a 2% base rate event without proportionally strong evidence.
 *
 * @param statedConfidence - Model's raw confidence (0-1)
 * @param baseRate - Empirical base rate (0-1)
 * @param evidenceStrength - Strength of inside-view evidence (1-5)
 * @returns Adjusted confidence (0-1)
 */
export function adjustForBaseRate(
  statedConfidence: number,
  baseRate: number,
  evidenceStrength: number
): number {
  const clampedStrength = Math.max(1, Math.min(5, evidenceStrength));

  // Weight for the model's estimate based on evidence strength
  // Maps 1->0.2, 2->0.4, 3->0.6, 4->0.8, 5->0.9
  const modelWeight = clampedStrength <= 4
    ? clampedStrength * 0.2
    : 0.9;
  const baseWeight = 1 - modelWeight;

  const baseLO = toLogOdds(baseRate);
  const modelLO = toLogOdds(statedConfidence);

  const adjustedLO = baseWeight * baseLO + modelWeight * modelLO;

  return fromLogOdds(adjustedLO);
}
