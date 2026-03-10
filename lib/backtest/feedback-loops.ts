/**
 * Backtest Feedback Loops
 *
 * Connects completed backtest results back into the live platform systems:
 * 1. Category accuracy → prediction confidence adjustment
 * 2. Walk-forward OOS accuracy → thesis generation credibility
 * 3. Regime analysis → regime detection engine calibration
 * 4. Cost sensitivity → trading position sizing
 * 5. Calibration data → prediction engine confidence correction
 *
 * All functions are read-only consumers of backtest data. They pull
 * the latest completed backtest run from DB and derive adjustments.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import type {
  BacktestResults,
  WalkForwardResults,
  RegimeStats,
  CostSensitivityResult,
} from "./types";

// ── Cache ──
// Backtest results don't change often, cache for 10 minutes to avoid
// hammering the DB on every prediction/thesis/trade.

interface CachedResults {
  results: BacktestResults | null;
  fetchedAt: number;
}

let cache: CachedResults | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch the latest completed backtest results from DB.
 * Returns null if no completed backtest exists.
 */
export async function getLatestBacktestResults(): Promise<BacktestResults | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.results;
  }

  try {
    const rows = await db.execute(sql`
      SELECT results FROM backtest_runs
      WHERE status = 'complete' AND results IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 1
    `);

    if (!rows.rows || rows.rows.length === 0) {
      cache = { results: null, fetchedAt: Date.now() };
      return null;
    }

    const raw = rows.rows[0].results;
    const results: BacktestResults = typeof raw === "string" ? JSON.parse(raw) : raw;
    cache = { results, fetchedAt: Date.now() };
    return results;
  } catch {
    return null;
  }
}

/** Clear the cache (call after a new backtest completes) */
export function invalidateBacktestCache(): void {
  cache = null;
}

// ═══════════════════════════════════════════════════════════════
// 1. CATEGORY ACCURACY → PREDICTION CONFIDENCE ADJUSTMENT
// ═══════════════════════════════════════════════════════════════

export interface CategoryCalibrationAdjustment {
  /** Multiplier to apply to raw confidence (e.g. 0.85 = reduce by 15%) */
  multiplier: number;
  /** Reason for the adjustment */
  reason: string;
  /** Whether there's enough data to trust this adjustment */
  reliable: boolean;
}

/**
 * Returns a confidence multiplier for a given prediction category
 * based on backtest accuracy data. If the backtest shows the model
 * is systematically overconfident in "market" predictions, this
 * returns a multiplier < 1.0 for that category.
 *
 * Uses calibration gap: if stated confidence exceeds actual accuracy,
 * dampen by half the gap (gradual correction to avoid overcorrection).
 */
export async function getCategoryCalibrationAdjustment(
  category: string
): Promise<CategoryCalibrationAdjustment> {
  const results = await getLatestBacktestResults();
  if (!results) {
    return { multiplier: 1.0, reason: "No backtest data available", reliable: false };
  }

  const catStats = results.byCategory[category];
  if (!catStats || catStats.count < 10) {
    return { multiplier: 1.0, reason: `Insufficient backtest data for ${category} (n=${catStats?.count ?? 0})`, reliable: false };
  }

  // Calibration gap: positive means overconfident (stated > actual)
  const gap = catStats.avgConfidence - catStats.directionalAccuracy;

  if (Math.abs(gap) < 0.05) {
    return { multiplier: 1.0, reason: `${category} predictions well-calibrated in backtest (gap ${(gap * 100).toFixed(1)}pp)`, reliable: true };
  }

  // Apply half the gap as correction (damped to avoid overcorrection)
  const correction = gap * 0.5;
  const multiplier = 1 - correction;
  const clamped = Math.max(0.7, Math.min(1.3, multiplier));

  const direction = gap > 0 ? "overconfident" : "underconfident";
  return {
    multiplier: clamped,
    reason: `Backtest shows ${direction} in ${category} by ${(Math.abs(gap) * 100).toFixed(1)}pp (n=${catStats.count}, Brier ${catStats.brierScore.toFixed(3)}). Applying ${(Math.abs(correction) * 100).toFixed(1)}pp damped correction.`,
    reliable: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. WALK-FORWARD OOS ACCURACY → THESIS CREDIBILITY
// ═══════════════════════════════════════════════════════════════

export interface WalkForwardCredibility {
  /** 0-1 credibility score for thesis generation */
  credibilityScore: number;
  /** Overfit ratio (OOS/IS accuracy, < 1 = overfit) */
  overfitRatio: number;
  /** Whether OOS results are statistically significant */
  oosSignificant: boolean;
  /** Summary for injection into thesis prompt */
  promptSection: string;
}

/**
 * Derives a credibility score from walk-forward validation results.
 * Thesis generation uses this to:
 * - Scale overall confidence
 * - Add credibility context to the briefing prompt
 * - Flag if the model appears overfit
 */
export async function getWalkForwardCredibility(): Promise<WalkForwardCredibility | null> {
  const results = await getLatestBacktestResults();
  if (!results?.walkForward) return null;

  const wf = results.walkForward;

  // Credibility score: based on OOS accuracy, overfit ratio, and significance
  let credibility = 0.5;

  // OOS accuracy contribution
  if (wf.oosAccuracy > 0.6) credibility += 0.2;
  else if (wf.oosAccuracy > 0.55) credibility += 0.1;
  else if (wf.oosAccuracy < 0.45) credibility -= 0.2;

  // Overfit ratio contribution
  if (wf.overfitRatio > 0.9) credibility += 0.15; // minimal overfit
  else if (wf.overfitRatio > 0.8) credibility += 0.05;
  else if (wf.overfitRatio < 0.7) credibility -= 0.15; // heavily overfit

  // Significance contribution
  if (wf.oosSignificant) credibility += 0.15;

  credibility = Math.max(0.1, Math.min(1.0, credibility));

  // Build prompt section
  const lines: string[] = [];
  lines.push("WALK-FORWARD VALIDATION (backtest credibility check):");
  lines.push(`  Out-of-sample accuracy: ${(wf.oosAccuracy * 100).toFixed(1)}%`);
  lines.push(`  Temporal stability ratio: ${wf.overfitRatio.toFixed(2)} ${wf.overfitRatio < 0.8 ? "(WARNING: accuracy degrades in later periods)" : "(stable)"}`);
  lines.push(`  Statistical significance: ${wf.oosSignificant ? "YES" : "NO"} (p=${wf.oosPValue.toFixed(4)})`);
  if (wf.oosAccuracyCI) {
    lines.push(`  OOS accuracy 95% CI: [${(wf.oosAccuracyCI.lower * 100).toFixed(1)}%, ${(wf.oosAccuracyCI.upper * 100).toFixed(1)}%]`);
  }
  lines.push(`  Credibility score: ${(credibility * 100).toFixed(0)}%`);

  if (wf.overfitRatio < 0.8) {
    lines.push("  CAUTION: Accuracy degrades in later time periods. This may indicate regime sensitivity or concept drift. Reduce confidence in forward-looking claims.");
  }

  if (!wf.oosSignificant) {
    lines.push("  NOTE: Out-of-sample results are not statistically significant. Treat predictions as directional guidance only.");
  }

  return {
    credibilityScore: credibility,
    overfitRatio: wf.overfitRatio,
    oosSignificant: wf.oosSignificant,
    promptSection: lines.join("\n"),
  };
}

// ═══════════════════════════════════════════════════════════════
// 3. REGIME ANALYSIS → REGIME DETECTION CALIBRATION
// ═══════════════════════════════════════════════════════════════

export interface RegimePerformanceContext {
  /** Current regime's historical accuracy in backtesting */
  currentRegimeAccuracy: number | null;
  /** Current regime's Brier score from backtest */
  currentRegimeBrier: number | null;
  /** Which regime performed best historically */
  bestRegime: { name: string; accuracy: number } | null;
  /** Which regime performed worst */
  worstRegime: { name: string; accuracy: number } | null;
  /** All regime stats for reference */
  allRegimes: Record<string, RegimeStats>;
}

/**
 * Returns backtest accuracy data broken down by volatility regime.
 * The regime detection engine uses this to:
 * - Inform which regime classifications lead to better predictions
 * - Flag when the current regime has historically poor prediction accuracy
 */
export async function getRegimePerformanceContext(
  currentRegime?: string
): Promise<RegimePerformanceContext | null> {
  const results = await getLatestBacktestResults();
  if (!results?.byRegime) return null;

  const regimes = results.byRegime;
  const entries = Object.entries(regimes).filter(([, s]) => s.count >= 5);

  if (entries.length === 0) return null;

  // Find best and worst performing regimes
  let best: { name: string; accuracy: number } | null = null;
  let worst: { name: string; accuracy: number } | null = null;

  for (const [name, stats] of entries) {
    if (!best || stats.directionalAccuracy > best.accuracy) {
      best = { name, accuracy: stats.directionalAccuracy };
    }
    if (!worst || stats.directionalAccuracy < worst.accuracy) {
      worst = { name, accuracy: stats.directionalAccuracy };
    }
  }

  // Current regime stats
  const currentStats = currentRegime ? regimes[currentRegime] : undefined;

  return {
    currentRegimeAccuracy: currentStats?.directionalAccuracy ?? null,
    currentRegimeBrier: currentStats?.brierScore ?? null,
    bestRegime: best,
    worstRegime: worst,
    allRegimes: regimes,
  };
}

// ═══════════════════════════════════════════════════════════════
// 4. COST SENSITIVITY → TRADING POSITION SIZING
// ═══════════════════════════════════════════════════════════════

export interface CostAwareSizing {
  /** Maximum cost in bps before strategy becomes unprofitable */
  breakEvenCostBps: number | null;
  /** Recommended cost assumption for position sizing */
  recommendedCostBps: number;
  /** Whether to scale down positions due to thin margins */
  positionScaleFactor: number;
  /** Explanation */
  reason: string;
}

/**
 * Analyzes backtest cost sensitivity to inform trading execution.
 * Returns a recommended cost assumption and position scale factor.
 * If the strategy barely breaks even at 10bps, positions should be smaller.
 */
export async function getCostAwareSizing(): Promise<CostAwareSizing> {
  const results = await getLatestBacktestResults();
  if (!results?.costSensitivity || results.costSensitivity.length === 0) {
    return {
      breakEvenCostBps: null,
      recommendedCostBps: 10,
      positionScaleFactor: 1.0,
      reason: "No backtest cost sensitivity data available. Using default 10bps assumption.",
    };
  }

  const costs = results.costSensitivity;

  // Find break-even point: first cost level where total return goes negative
  let breakEvenCostBps: number | null = null;
  for (const c of costs) {
    if (c.totalReturn < 0) {
      breakEvenCostBps = c.costBps;
      break;
    }
  }

  // If no break-even found, strategy is robust, use the last tested level
  if (breakEvenCostBps === null && costs[costs.length - 1].totalReturn > 0) {
    breakEvenCostBps = costs[costs.length - 1].costBps * 2; // extrapolate
  }

  // Recommended cost: use 15bps as realistic estimate for retail
  const recommendedCostBps = 15;

  // Position scale factor: if break-even is close to recommended cost, scale down
  let positionScaleFactor = 1.0;
  let reason = "";

  if (breakEvenCostBps !== null) {
    const margin = breakEvenCostBps - recommendedCostBps;

    if (margin < 5) {
      // Very thin margin, strategy barely profitable at current costs
      positionScaleFactor = 0.5;
      reason = `Strategy breaks even at ${breakEvenCostBps}bps, only ${margin}bps margin above recommended ${recommendedCostBps}bps cost. Reducing position sizes by 50%.`;
    } else if (margin < 15) {
      // Moderate margin
      positionScaleFactor = 0.75;
      reason = `Strategy breaks even at ${breakEvenCostBps}bps, ${margin}bps margin above ${recommendedCostBps}bps cost. Moderate position sizing.`;
    } else {
      // Comfortable margin
      positionScaleFactor = 1.0;
      reason = `Strategy robust to costs up to ${breakEvenCostBps}bps (${margin}bps margin). Full position sizing.`;
    }

    // Additional check: Sharpe at recommended cost level
    const atRecommended = costs.find((c) => c.costBps >= recommendedCostBps);
    if (atRecommended && atRecommended.sharpeRatio < 0.5) {
      positionScaleFactor *= 0.8;
      reason += ` Sharpe ratio at ${recommendedCostBps}bps is ${atRecommended.sharpeRatio.toFixed(2)} (below 0.5 threshold), further reducing by 20%.`;
    }
  } else {
    reason = "Could not determine break-even cost from backtest data. Using default sizing.";
  }

  return {
    breakEvenCostBps,
    recommendedCostBps,
    positionScaleFactor: Math.max(0.25, Math.min(1.0, positionScaleFactor)),
    reason,
  };
}

// ═══════════════════════════════════════════════════════════════
// 5. CALIBRATION DATA → PREDICTION CONFIDENCE CORRECTION
// ═══════════════════════════════════════════════════════════════

export interface CalibrationCorrection {
  /** Adjusted confidence after applying backtest calibration data */
  adjustedConfidence: number;
  /** The correction applied (negative = reduced, positive = increased) */
  correctionPp: number;
  /** Source of the correction */
  source: string;
}

/**
 * Applies backtest calibration data to correct a raw confidence value.
 * Uses the backtest calibration curve to find the actual observed frequency
 * at a given confidence level and blend toward it.
 *
 * Example: if backtest shows that predictions stated at 70% confidence
 * actually confirmed at 55%, this nudges a new 70% prediction toward
 * a corrected ~62.5% (midpoint with damping).
 */
export async function applyCalibrationCorrection(
  rawConfidence: number,
  category?: string
): Promise<CalibrationCorrection> {
  const results = await getLatestBacktestResults();
  if (!results) {
    return { adjustedConfidence: rawConfidence, correctionPp: 0, source: "no backtest data" };
  }

  // Try category-specific correction first
  if (category) {
    const catStats = results.byCategory[category];
    if (catStats && catStats.count >= 10) {
      const catGap = catStats.avgConfidence - catStats.directionalAccuracy;
      if (Math.abs(catGap) > 0.05) {
        // Damped correction: apply half the category-specific gap
        const correction = catGap * 0.5;
        const adjusted = Math.max(0.05, Math.min(0.95, rawConfidence - correction));
        return {
          adjustedConfidence: adjusted,
          correctionPp: -(correction * 100),
          source: `backtest ${category} calibration (n=${catStats.count}, gap=${(catGap * 100).toFixed(1)}pp)`,
        };
      }
    }
  }

  // Fall back to overall calibration curve
  const curve = results.calibrationCurve;
  if (!curve || curve.length === 0) {
    return { adjustedConfidence: rawConfidence, correctionPp: 0, source: "no calibration curve" };
  }

  // Find the bucket this confidence falls into
  const bucket = curve.find(
    (b) => rawConfidence >= b.midpoint - 0.15 && rawConfidence < b.midpoint + 0.15
  );

  if (!bucket || bucket.count < 5) {
    return { adjustedConfidence: rawConfidence, correctionPp: 0, source: "insufficient data in confidence bucket" };
  }

  // Gap between stated and observed
  const gap = bucket.expectedFrequency - bucket.observedFrequency;
  if (Math.abs(gap) < 0.05) {
    return { adjustedConfidence: rawConfidence, correctionPp: 0, source: "calibration within tolerance" };
  }

  // Damped correction: blend 50% toward observed frequency
  const correction = gap * 0.5;
  const adjusted = Math.max(0.05, Math.min(0.95, rawConfidence - correction));

  return {
    adjustedConfidence: adjusted,
    correctionPp: -(correction * 100),
    source: `backtest calibration curve (bucket ${bucket.range}, observed ${(bucket.observedFrequency * 100).toFixed(0)}% vs expected ${(bucket.expectedFrequency * 100).toFixed(0)}%)`,
  };
}

// ═══════════════════════════════════════════════════════════════
// COMBINED: All feedback for injection into prompts
// ═══════════════════════════════════════════════════════════════

/**
 * Builds a combined prompt section with all backtest feedback.
 * Suitable for injection into prediction or thesis prompts.
 */
export async function getBacktestFeedbackPromptSection(): Promise<string> {
  const results = await getLatestBacktestResults();
  if (!results) return "";

  const lines: string[] = ["BACKTEST FEEDBACK (from latest completed backtest):"];
  lines.push("");

  // Overall stats
  lines.push(`Overall: ${results.totalPredictions} predictions, ${(results.directionalAccuracy * 100).toFixed(1)}% directional accuracy, Brier ${results.brierScore.toFixed(3)}`);
  lines.push(`Statistically significant: ${results.significant ? "YES" : "NO"} (corrected p=${results.pValueCorrected.toFixed(4)})`);

  // Climatological baseline comparison
  if (results.climatologicalBaseline) {
    const edge = results.directionalAccuracy - results.climatologicalBaseline.directionalAccuracy;
    lines.push(`vs "Always Bullish" baseline: ${edge > 0 ? "+" : ""}${(edge * 100).toFixed(1)}pp edge`);
  }

  // Walk-forward
  if (results.walkForward) {
    const wf = results.walkForward;
    lines.push("");
    lines.push(`Walk-Forward OOS: ${(wf.oosAccuracy * 100).toFixed(1)}% accuracy, temporal stability ${wf.overfitRatio.toFixed(2)}`);
    if (wf.oosAccuracyCI) {
      lines.push(`  OOS 95% CI: [${(wf.oosAccuracyCI.lower * 100).toFixed(1)}%, ${(wf.oosAccuracyCI.upper * 100).toFixed(1)}%]`);
    }
    if (wf.overfitRatio < 0.8) {
      lines.push("  WARNING: Temporal stability below 0.8, accuracy degrades in later periods. Predictions may be less reliable than earlier results suggest.");
    }
  }

  // Category breakdown
  const catEntries = Object.entries(results.byCategory).filter(([, s]) => s.count >= 5);
  if (catEntries.length > 0) {
    lines.push("");
    lines.push("Category accuracy (backtest):");
    for (const [cat, stats] of catEntries) {
      const gap = stats.avgConfidence - stats.directionalAccuracy;
      const dir = gap > 0.05 ? "overconfident" : gap < -0.05 ? "underconfident" : "calibrated";
      lines.push(`  ${cat}: ${(stats.directionalAccuracy * 100).toFixed(1)}% (n=${stats.count}, ${dir}, Brier ${stats.brierScore.toFixed(3)})`);
    }
  }

  // Regime performance
  if (results.byRegime) {
    const regimeEntries = Object.entries(results.byRegime).filter(([, s]) => s.count >= 5);
    if (regimeEntries.length > 0) {
      lines.push("");
      lines.push("Regime-conditioned accuracy:");
      for (const [regime, stats] of regimeEntries) {
        lines.push(`  ${regime}: ${(stats.directionalAccuracy * 100).toFixed(1)}% (n=${stats.count})`);
      }
    }
  }

  // Cost sensitivity summary
  if (results.costSensitivity && results.costSensitivity.length > 0) {
    const at10 = results.costSensitivity.find((c) => c.costBps === 10);
    const at30 = results.costSensitivity.find((c) => c.costBps === 30);
    if (at10) {
      lines.push("");
      lines.push(`Cost sensitivity: Sharpe ${at10.sharpeRatio.toFixed(2)} at 10bps${at30 ? `, ${at30.sharpeRatio.toFixed(2)} at 30bps` : ""}`);
    }
  }

  // LLM leakage warning
  if (results.llmLeakageWarning) {
    lines.push("");
    lines.push(`LLM LEAKAGE: ${results.llmLeakageWarning}`);
  }

  lines.push("");
  lines.push("Use this backtest data to calibrate confidence levels. Reduce confidence in categories where backtesting shows overconfidence.");

  return lines.join("\n");
}
