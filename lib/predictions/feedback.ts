import { db, schema } from "../db";
import { desc, not, isNull } from "drizzle-orm";

// ── Types ──

interface CalibrationBucket {
  range: string;
  midpoint: number;
  count: number;
  confirmedRate: number;
  brierContribution: number;
  reliable: boolean; // true if count >= MIN_BUCKET_SIZE
}

interface CategoryStats {
  category: string;
  total: number;
  confirmed: number;
  denied: number;
  partial: number;
  expired: number;
  brierScore: number;
  avgConfidence: number;
  calibrationGap: number;
  reliable: boolean;
}

interface FailurePattern {
  pattern: string;
  frequency: number;
  examples: string[];
}

interface ResolutionBias {
  avgLlmScore: number;
  binaryAccuracy: number;
  partialRate: number;
  biasDirection: "lenient" | "harsh" | "neutral";
  biasWarning: string | null;
}

interface DirectionLevelStats {
  totalWithDirection: number;
  directionCorrectRate: number;
  totalWithLevel: number;
  levelCorrectRate: number;
  partialRate: number; // direction correct + level wrong
}

export interface BINReport {
  bias: number;               // Systematic calibration error
  biasDirection: "overconfident" | "underconfident" | "neutral";
  noise: number;              // Random scatter
  information: number;        // Valid signal extraction (higher = better)
  brierScore: number;         // For reference
  interpretation: string;     // Human-readable diagnosis
  recommendation: string;     // What to fix first
  // Per-category breakdown
  byCategory: Array<{
    category: string;
    bias: number;
    noise: number;
    information: number;
  }>;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number; // 0.95 for 95% CI
  method: "wilson" | "bootstrap";
}

export interface PerformanceReport {
  totalResolved: number;
  sampleSufficient: boolean;
  brierScore: number;
  brierCI: ConfidenceInterval | null;
  logLoss: number;
  binaryAccuracy: number;
  accuracyCI: ConfidenceInterval | null;
  avgConfidence: number;
  calibrationGap: number;
  calibration: CalibrationBucket[];
  byCategory: CategoryStats[];
  failurePatterns: FailurePattern[];
  timeframeAccuracy: Record<string, { count: number; brierScore: number; binaryAccuracy: number; reliable: boolean }>;
  recentTrend: { recentBrier: number; priorBrier: number; improving: boolean; windowSize: number } | null;
  resolutionBias: ResolutionBias;
  directionLevel: DirectionLevelStats;
  regimeInvalidatedCount: number;
  postEventCount: number;
  bin: BINReport | null;
  promptSection: string;
}

// ── Constants ──

const MIN_TOTAL_FOR_REPORT = 3;
const MIN_BUCKET_SIZE = 5;  // Academic standard: minimum 5 per bucket for reliable calibration stats
const MIN_CATEGORY_SIZE = 5;
const DECAY_HALF_LIFE_DAYS = 60;
const EPSILON = 1e-7; // prevent log(0)

// ── Statistical Confidence Intervals ──

/**
 * Wilson score interval for binomial proportion.
 * Superior to normal approximation for small samples.
 * Wilson (1927), recommended by Agresti & Coull (1998).
 */
export function wilsonInterval(successes: number, total: number, z = 1.96): ConfidenceInterval {
  if (total === 0) return { lower: 0, upper: 1, level: 0.95, method: "wilson" };
  const p = successes / total;
  const denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const spread = (z / denominator) * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total));
  return {
    lower: Math.max(0, center - spread),
    upper: Math.min(1, center + spread),
    level: 0.95,
    method: "wilson",
  };
}

/**
 * Bootstrap confidence interval for Brier score.
 * Nonparametric: resamples predictions with replacement.
 * Efron & Tibshirani (1993). Percentile method with 2000 iterations.
 */
export function bootstrapBrierCI(
  predictions: Array<{ confidence: number; outcome: string }>,
  iterations = 2000,
  level = 0.95
): ConfidenceInterval {
  const scoreable = predictions.filter(p => p.outcome !== "expired");
  if (scoreable.length < 5) return { lower: 0, upper: 0.5, level, method: "bootstrap" };

  const brierSamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    // Resample with replacement
    const sample: typeof scoreable = [];
    for (let j = 0; j < scoreable.length; j++) {
      sample.push(scoreable[Math.floor(Math.random() * scoreable.length)]);
    }
    brierSamples.push(brierScore(sample));
  }

  brierSamples.sort((a, b) => a - b);
  const alpha = (1 - level) / 2;
  const lowerIdx = Math.floor(alpha * iterations);
  const upperIdx = Math.floor((1 - alpha) * iterations);

  return {
    lower: brierSamples[lowerIdx],
    upper: brierSamples[Math.min(upperIdx, iterations - 1)],
    level,
    method: "bootstrap",
  };
}

/**
 * Benjamini-Hochberg procedure for multiple testing correction.
 * Controls false discovery rate (FDR) at specified level.
 * Benjamini & Hochberg (1995, JRSS-B).
 */
export function benjaminiHochberg(
  pValues: Array<{ label: string; pValue: number }>,
  fdrLevel = 0.05
): Array<{ label: string; pValue: number; adjusted: number; significant: boolean }> {
  const m = pValues.length;
  if (m === 0) return [];

  // Sort by p-value ascending
  const sorted = pValues
    .map((p, i) => ({ ...p, rank: 0, originalIndex: i }))
    .sort((a, b) => a.pValue - b.pValue);

  // Assign ranks
  sorted.forEach((p, i) => { p.rank = i + 1; });

  // Compute adjusted p-values (step-up)
  const results = sorted.map(p => {
    const adjusted = Math.min(1, p.pValue * m / p.rank);
    return {
      label: p.label,
      pValue: p.pValue,
      adjusted,
      significant: adjusted <= fdrLevel,
    };
  });

  // Enforce monotonicity (adjusted p-values should be non-decreasing when sorted by original p-value)
  for (let i = results.length - 2; i >= 0; i--) {
    results[i].adjusted = Math.min(results[i].adjusted, results[i + 1].adjusted);
  }

  return results;
}

// ── Core Scoring Functions ──

/**
 * Brier score: mean((confidence - outcome)^2)
 * Lower is better. 0 = perfect, 0.25 = coin flip at 50%, 1 = maximally wrong.
 * Uses binary outcome: confirmed=1, denied=0.
 * Partial predictions are scored at 0.5 (directionally correct, magnitude wrong).
 */
export function brierScore(predictions: Array<{ confidence: number; outcome: string }>): number {
  const scoreable = predictions.filter((p) => p.outcome !== "expired");
  if (scoreable.length === 0) return 0.25;

  const sum = scoreable.reduce((s, p) => {
    const actual = outcomeToNumeric(p.outcome);
    return s + Math.pow(p.confidence - actual, 2);
  }, 0);
  return sum / scoreable.length;
}

/**
 * Log loss (cross-entropy): -mean(y*log(p) + (1-y)*log(1-p))
 * Lower is better. Heavily penalizes confident wrong predictions.
 * Standard in prediction markets alongside Brier.
 */
export function logLoss(predictions: Array<{ confidence: number; outcome: string }>): number {
  const scoreable = predictions.filter((p) => p.outcome !== "expired");
  if (scoreable.length === 0) return 1;

  const sum = scoreable.reduce((s, p) => {
    const actual = outcomeToNumeric(p.outcome);
    const clampedConf = Math.max(EPSILON, Math.min(1 - EPSILON, p.confidence));
    return s - (actual * Math.log(clampedConf) + (1 - actual) * Math.log(1 - clampedConf));
  }, 0);
  return sum / scoreable.length;
}

export function outcomeToNumeric(outcome: string): number {
  switch (outcome) {
    case "confirmed": return 1;
    case "denied": return 0;
    case "partial": return 0.5;
    default: return 0;
  }
}

/**
 * Exponential decay weight. Recent predictions matter more.
 * Weight = 2^(-days_ago / half_life)
 */
export function decayWeight(resolvedAt: string | null, now: Date): number {
  if (!resolvedAt) return 0.5;
  const daysAgo = (now.getTime() - new Date(resolvedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(2, -daysAgo / DECAY_HALF_LIFE_DAYS);
}

// ── BIN (Bias-Information-Noise) Decomposition ──
// Satopaa et al. 2021: splits forecasting error into systematic bias,
// random noise, and valid information extraction.
//
// Brier = (mean_c - mean_o)^2 + var(c) + var(o) - 2*cov(c,o)
// Bias  = (mean_c - mean_o)^2
// Noise = var(c) (scatter in confidence assignments)
// Information = cov(c, o) (how well confidence tracks actual outcomes)

export function computeBINDecomposition(
  predictions: Array<{ confidence: number; outcome: string; category: string; resolvedAt: string | null }>
): BINReport {
  const scoreable = predictions.filter((p) => p.outcome !== "expired" && p.outcome !== "post_event");

  if (scoreable.length < 3) {
    return {
      bias: 0,
      biasDirection: "neutral",
      noise: 0,
      information: 0,
      brierScore: 0.25,
      interpretation: "Insufficient data for BIN decomposition (need at least 3 resolved predictions).",
      recommendation: "Accumulate more resolved predictions before analyzing error sources.",
      byCategory: [],
    };
  }

  const confidences = scoreable.map((p) => p.confidence);
  const outcomes = scoreable.map((p) => outcomeToNumeric(p.outcome));

  const { bias, biasDirection, noise, information, brier } = computeBINComponents(confidences, outcomes);

  // Per-category breakdown
  const categories = Array.from(new Set(scoreable.map((p) => p.category)));
  const byCategory = categories
    .map((cat) => {
      const catPreds = scoreable.filter((p) => p.category === cat);
      if (catPreds.length < 3) return null;
      const catC = catPreds.map((p) => p.confidence);
      const catO = catPreds.map((p) => outcomeToNumeric(p.outcome));
      const catBIN = computeBINComponents(catC, catO);
      return {
        category: cat,
        bias: catBIN.bias,
        noise: catBIN.noise,
        information: catBIN.information,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Generate interpretation and recommendation
  const { interpretation, recommendation } = generateBINDiagnosis(bias, biasDirection, noise, information, brier, confidences, outcomes);

  return {
    bias,
    biasDirection,
    noise,
    information,
    brierScore: brier,
    interpretation,
    recommendation,
    byCategory,
  };
}

function computeBINComponents(
  confidences: number[],
  outcomes: number[]
): { bias: number; biasDirection: "overconfident" | "underconfident" | "neutral"; noise: number; information: number; brier: number } {
  const n = confidences.length;

  const meanC = confidences.reduce((s, c) => s + c, 0) / n;
  const meanO = outcomes.reduce((s, o) => s + o, 0) / n;

  // Bias: systematic calibration error
  const bias = Math.pow(meanC - meanO, 2);

  let biasDirection: "overconfident" | "underconfident" | "neutral" = "neutral";
  if (meanC - meanO > 0.05) biasDirection = "overconfident";
  else if (meanC - meanO < -0.05) biasDirection = "underconfident";

  // Variance of confidences
  const varC = confidences.reduce((s, c) => s + Math.pow(c - meanC, 2), 0) / n;

  // Variance of outcomes
  const varO = outcomes.reduce((s, o) => s + Math.pow(o - meanO, 2), 0) / n;

  // Covariance(confidence, outcome) = information
  const information = confidences.reduce((s, c, i) => s + (c - meanC) * (outcomes[i] - meanO), 0) / n;

  // Noise: var(c) captures scatter in confidence assignments
  const noise = varC;

  // Brier from decomposition: bias + var(c) + var(o) - 2*cov(c,o)
  const brier = bias + varC + varO - 2 * information;

  return { bias, biasDirection, noise, information, brier: Math.max(0, brier) };
}

function generateBINDiagnosis(
  bias: number,
  biasDirection: "overconfident" | "underconfident" | "neutral",
  noise: number,
  information: number,
  brier: number,
  confidences: number[],
  outcomes: number[]
): { interpretation: string; recommendation: string } {
  const meanC = confidences.reduce((s, c) => s + c, 0) / confidences.length;
  const meanO = outcomes.reduce((s, o) => s + o, 0) / outcomes.length;
  const calGap = Math.abs(meanC - meanO) * 100;

  // Determine the dominant error source
  // Total error budget (excluding information which is subtracted)
  const biasContrib = bias;
  const noiseContrib = noise;
  const infoContrib = Math.max(0, information); // information reduces error

  let interpretation: string;
  let recommendation: string;

  if (brier < 0.1) {
    interpretation = "Forecasting performance is strong across all BIN components. Bias, noise, and information extraction are all within good ranges.";
    recommendation = "Maintain current analytical approach. Focus on edge cases and category-specific weaknesses if any.";
  } else if (biasContrib > noiseContrib && biasContrib > infoContrib) {
    // Bias-dominated errors
    const direction = biasDirection === "overconfident" ? "overconfidence" : "underconfidence";
    const correction = Math.round(calGap);
    interpretation = `Errors are primarily driven by bias (systematic ${direction}). Stated confidence averages ${(meanC * 100).toFixed(0)}% while the actual confirmation rate is ${(meanO * 100).toFixed(0)}%.`;
    if (biasDirection === "overconfident") {
      recommendation = `Reduce stated confidence by ~${correction}pp across the board. The analytical framework is capturing signal, but the probability assignments are systematically too high.`;
    } else {
      recommendation = `Increase stated confidence by ~${correction}pp. You are being too conservative given your actual hit rate.`;
    }
  } else if (noiseContrib > biasContrib && noiseContrib > infoContrib) {
    // Noise-dominated errors
    interpretation = `Errors are primarily driven by noise (inconsistent confidence assignments). Confidence variance is ${(noise * 100).toFixed(1)}, indicating predictions at similar quality levels get widely different confidence scores.`;
    recommendation = "Adopt a more systematic evaluation framework. Use reference classes and base rates to anchor confidence, reducing scatter in probability assignments.";
  } else if (infoContrib > 0 && infoContrib > biasContrib) {
    // Good information but overwhelmed by other components
    interpretation = `Information extraction is strong (cov=${information.toFixed(4)}) -- confidence correctly moves with outcomes. The signal is being partially overwhelmed by ${noiseContrib > biasContrib ? "noise" : "bias"}.`;
    recommendation = `Keep the analytical approach (information extraction is working), but reduce ${noiseContrib > biasContrib ? "scatter in confidence assignments" : "systematic calibration error"}.`;
  } else {
    // Mixed or low-information
    interpretation = `Error sources are distributed: bias=${bias.toFixed(4)}, noise=${noise.toFixed(4)}, information=${information.toFixed(4)}. No single dominant error component.`;
    if (information <= 0) {
      recommendation = "Information extraction is weak or negative, meaning confidence does not track outcomes. Revisit the analytical framework entirely: focus on what signals actually predict outcomes.";
    } else {
      recommendation = "Address all three components: tighten calibration (bias), reduce confidence scatter (noise), and strengthen signal-to-outcome tracking (information).";
    }
  }

  return { interpretation, recommendation };
}

// ── Main Report ──

export async function computePerformanceReport(): Promise<PerformanceReport | null> {
  const resolved = await db
    .select()
    .from(schema.predictions)
    .where(not(isNull(schema.predictions.outcome)))
    .orderBy(desc(schema.predictions.resolvedAt))
    ;

  if (resolved.length < MIN_TOTAL_FOR_REPORT) return null;

  const now = new Date();

  // Exclude regime-invalidated and post_event from scoring
  const regimeInvalidatedCount = resolved.filter((p) => p.regimeInvalidated === 1).length;
  const postEventCount = resolved.filter((p) => p.outcome === "post_event").length;

  // Only pre-event predictions count toward Brier score
  const scoreable = resolved.filter((p) =>
    p.outcome !== "expired" &&
    p.outcome !== "post_event" &&
    p.regimeInvalidated !== 1 &&
    p.preEvent === 1
  );

  // Non-expired includes all resolved minus expired/post_event/invalidated (for display stats)
  const nonExpired = resolved.filter((p) =>
    p.outcome !== "expired" &&
    p.outcome !== "post_event" &&
    p.regimeInvalidated !== 1
  );
  const sampleSufficient = scoreable.length >= 10;

  // ── Proper scoring rules (only pre-event, non-invalidated predictions) ──

  const scoringInputs = scoreable.map((p) => ({
    confidence: p.confidence,
    outcome: p.outcome!,
    weight: decayWeight(p.resolvedAt, now),
  }));

  const brier = brierScore(scoringInputs);
  const ll = logLoss(scoringInputs);

  // Weighted Brier (recent predictions count more)
  const totalWeight = scoringInputs.reduce((s, p) => s + p.weight, 0);
  const weightedBrier = totalWeight > 0
    ? scoringInputs.reduce((s, p) => {
        const actual = outcomeToNumeric(p.outcome);
        return s + p.weight * Math.pow(p.confidence - actual, 2);
      }, 0) / totalWeight
    : brier;

  // Binary accuracy (confirmed / non-expired)
  const confirmed = nonExpired.filter((p) => p.outcome === "confirmed");
  const binaryAccuracy = nonExpired.length > 0 ? confirmed.length / nonExpired.length : 0;
  const avgConfidence = nonExpired.length > 0
    ? nonExpired.reduce((s, p) => s + p.confidence, 0) / nonExpired.length
    : 0;
  const calibrationGap = avgConfidence - binaryAccuracy;

  // ── Confidence intervals (academic rigor) ──
  const brierCI = scoringInputs.length >= 5
    ? bootstrapBrierCI(scoringInputs)
    : null;
  const accuracyCI = nonExpired.length >= 3
    ? wilsonInterval(confirmed.length, nonExpired.length)
    : null;

  // ── Calibration buckets (proper reliability diagram data) ──
  // Use scoreable set (preEvent only, excludes invalidated/post_event) for consistency
  // with the headline Brier score. This ensures the reliability diagram reflects
  // the same population as the scoring metrics.

  const bucketDefs: { min: number; max: number; label: string }[] = [
    { min: 0.0, max: 0.35, label: "low (0-35%)" },
    { min: 0.35, max: 0.5, label: "med-low (35-50%)" },
    { min: 0.5, max: 0.65, label: "medium (50-65%)" },
    { min: 0.65, max: 0.8, label: "high (65-80%)" },
    { min: 0.8, max: 1.01, label: "very high (80%+)" },
  ];

  const calibration: CalibrationBucket[] = bucketDefs.map((bucket) => {
    const inBucket = scoreable.filter((p) => p.confidence >= bucket.min && p.confidence < bucket.max);
    const confirmedInBucket = inBucket.filter((p) => p.outcome === "confirmed").length;
    const confirmedRate = inBucket.length > 0 ? confirmedInBucket / inBucket.length : 0;
    // Use mean confidence in bucket as midpoint (not hardcoded bin center)
    // for a more accurate reliability diagram per Bröcker & Smith (2007)
    const midpoint = inBucket.length > 0
      ? inBucket.reduce((s, p) => s + p.confidence, 0) / inBucket.length
      : (bucket.min + Math.min(bucket.max, 1)) / 2;
    const bucketBrier = inBucket.length > 0
      ? inBucket.reduce((s, p) => s + Math.pow(p.confidence - outcomeToNumeric(p.outcome!), 2), 0) / inBucket.length
      : 0;
    return {
      range: bucket.label,
      midpoint,
      count: inBucket.length,
      confirmedRate,
      brierContribution: bucketBrier,
      reliable: inBucket.length >= MIN_BUCKET_SIZE,
    };
  });

  // ── Category breakdown ──
  // Use nonExpired for display stats (total/confirmed/denied) but scoreable
  // population for Brier to stay consistent with the headline metric.

  const categories = ["market", "geopolitical", "celestial"];
  const byCategory: CategoryStats[] = categories
    .map((cat) => {
      const inCat = resolved.filter((p) => p.category === cat);
      if (inCat.length === 0) return null;
      const catNonExpired = inCat.filter((p) =>
        p.outcome !== "expired" && p.outcome !== "post_event" && p.regimeInvalidated !== 1
      );
      const catScoreable = catNonExpired.filter((p) => p.preEvent === 1);
      const catConfirmed = catNonExpired.filter((p) => p.outcome === "confirmed").length;
      // Brier from scoreable (preEvent only) for consistency with headline
      const catBrier = catScoreable.length > 0
        ? brierScore(catScoreable.map((p) => ({ confidence: p.confidence, outcome: p.outcome! })))
        : brierScore(catNonExpired.map((p) => ({ confidence: p.confidence, outcome: p.outcome! })));
      const catAvgConf = catNonExpired.length > 0
        ? catNonExpired.reduce((s, p) => s + p.confidence, 0) / catNonExpired.length
        : 0;
      const catAccuracy = catNonExpired.length > 0 ? catConfirmed / catNonExpired.length : 0;
      return {
        category: cat,
        total: inCat.length,
        confirmed: catConfirmed,
        denied: catNonExpired.filter((p) => p.outcome === "denied").length,
        partial: catNonExpired.filter((p) => p.outcome === "partial").length,
        expired: inCat.filter((p) => p.outcome === "expired").length,
        brierScore: catBrier,
        avgConfidence: catAvgConf,
        calibrationGap: catAvgConf - catAccuracy,
        reliable: catNonExpired.length >= MIN_CATEGORY_SIZE,
      };
    })
    .filter((c): c is CategoryStats => c !== null);

  // ── Timeframe accuracy ──
  // Use nonExpired for counts/accuracy display, scoreable for Brier consistency

  const timeframeAccuracy: Record<string, { count: number; brierScore: number; binaryAccuracy: number; reliable: boolean }> = {};
  for (const p of nonExpired) {
    const tf = p.timeframe || "unknown";
    if (!timeframeAccuracy[tf]) {
      timeframeAccuracy[tf] = { count: 0, brierScore: 0, binaryAccuracy: 0, reliable: false };
    }
    timeframeAccuracy[tf].count++;
  }
  for (const tf of Object.keys(timeframeAccuracy)) {
    const tfDisplay = nonExpired.filter((p) => (p.timeframe || "unknown") === tf);
    const tfScoreable = scoreable.filter((p) => (p.timeframe || "unknown") === tf);
    const tfBrier = tfScoreable.length > 0
      ? brierScore(tfScoreable.map((p) => ({ confidence: p.confidence, outcome: p.outcome! })))
      : brierScore(tfDisplay.map((p) => ({ confidence: p.confidence, outcome: p.outcome! })));
    const tfConfirmed = tfDisplay.filter((p) => p.outcome === "confirmed").length;
    timeframeAccuracy[tf] = {
      count: tfDisplay.length,
      brierScore: tfBrier,
      binaryAccuracy: tfDisplay.length > 0 ? tfConfirmed / tfDisplay.length : 0,
      reliable: tfDisplay.length >= MIN_BUCKET_SIZE,
    };
  }

  // ── Failure pattern detection ──

  const denied = nonExpired.filter((p) => p.outcome === "denied");
  const expired = resolved.filter((p) => p.outcome === "expired");
  const failurePatterns: FailurePattern[] = [];

  // Pattern: overconfident denials (high confidence + denied)
  const overconfidentDenied = denied.filter((p) => p.confidence >= 0.65);
  if (overconfidentDenied.length >= 2) {
    failurePatterns.push({
      pattern: "High-confidence predictions denied",
      frequency: overconfidentDenied.length,
      examples: overconfidentDenied.slice(0, 3).map((p) =>
        `"${p.claim.slice(0, 80)}..." (stated ${(p.confidence * 100).toFixed(0)}%)`
      ),
    });
  }

  // Pattern: category-specific weakness
  for (const cat of byCategory) {
    if (cat.reliable && cat.brierScore > 0.35) {
      failurePatterns.push({
        pattern: `${cat.category} predictions poorly calibrated (Brier ${cat.brierScore.toFixed(3)})`,
        frequency: cat.total,
        examples: denied
          .filter((p) => p.category === cat.category)
          .slice(0, 2)
          .map((p) => `"${p.claim.slice(0, 80)}..."`),
      });
    }
  }

  // Pattern: excessive expired (unverifiable claims)
  if (expired.length >= 3 && expired.length / resolved.length > 0.2) {
    failurePatterns.push({
      pattern: `${((expired.length / resolved.length) * 100).toFixed(0)}% of predictions expire unverified`,
      frequency: expired.length,
      examples: expired.slice(0, 3).map((p) => `"${p.claim.slice(0, 80)}..."`),
    });
  }

  // Pattern: timeframe weakness
  for (const [tf, data] of Object.entries(timeframeAccuracy)) {
    if (data.reliable && data.brierScore > 0.35) {
      failurePatterns.push({
        pattern: `${tf} timeframe performs poorly (Brier ${data.brierScore.toFixed(3)})`,
        frequency: data.count,
        examples: [],
      });
    }
  }

  // ── Recent trend (decay-weighted rolling comparison) ──

  let recentTrend: PerformanceReport["recentTrend"] = null;
  if (nonExpired.length >= 10) {
    const windowSize = Math.min(10, Math.floor(nonExpired.length / 2));
    const recent = nonExpired.slice(0, windowSize);
    const prior = nonExpired.slice(windowSize, windowSize * 2);
    const recentBrier = brierScore(recent.map((p) => ({ confidence: p.confidence, outcome: p.outcome! })));
    const priorBrier = prior.length > 0
      ? brierScore(prior.map((p) => ({ confidence: p.confidence, outcome: p.outcome! })))
      : recentBrier;
    recentTrend = {
      recentBrier,
      priorBrier,
      improving: recentBrier < priorBrier, // lower Brier = better
      windowSize,
    };
  }

  // ── Resolution bias detection ──

  const llmScores = nonExpired.filter((p) => p.score != null);
  const avgLlmScore = llmScores.length > 0
    ? llmScores.reduce((s, p) => s + (p.score || 0), 0) / llmScores.length
    : 0;
  const partialRate = nonExpired.length > 0
    ? nonExpired.filter((p) => p.outcome === "partial").length / nonExpired.length
    : 0;

  // Compare LLM's subjective score to binary outcome
  // If avgLlmScore >> binaryAccuracy, the resolver is being lenient (generous partial scores)
  const scoreBias = avgLlmScore - binaryAccuracy;
  let biasDirection: ResolutionBias["biasDirection"] = "neutral";
  let biasWarning: string | null = null;

  if (scoreBias > 0.15) {
    biasDirection = "lenient";
    biasWarning = `Resolution scoring appears lenient: avg LLM score (${(avgLlmScore * 100).toFixed(0)}%) significantly exceeds binary accuracy (${(binaryAccuracy * 100).toFixed(0)}%). The "partial" category may be overused (${(partialRate * 100).toFixed(0)}% of outcomes).`;
  } else if (scoreBias < -0.15) {
    biasDirection = "harsh";
    biasWarning = `Resolution scoring appears harsh: avg LLM score (${(avgLlmScore * 100).toFixed(0)}%) is well below binary accuracy (${(binaryAccuracy * 100).toFixed(0)}%).`;
  }

  const resolutionBias: ResolutionBias = {
    avgLlmScore,
    binaryAccuracy,
    partialRate,
    biasDirection,
    biasWarning,
  };

  // ── Direction vs Level stats ──

  const withDirection = resolved.filter((p) => p.directionCorrect != null);
  const withLevel = resolved.filter((p) => p.levelCorrect != null);
  const directionLevel: DirectionLevelStats = {
    totalWithDirection: withDirection.length,
    directionCorrectRate: withDirection.length > 0
      ? withDirection.filter((p) => p.directionCorrect === 1).length / withDirection.length
      : 0,
    totalWithLevel: withLevel.length,
    levelCorrectRate: withLevel.length > 0
      ? withLevel.filter((p) => p.levelCorrect === 1).length / withLevel.length
      : 0,
    partialRate: withDirection.length > 0
      ? withDirection.filter((p) => p.directionCorrect === 1 && p.levelCorrect === 0).length / withDirection.length
      : 0,
  };

  // ── BIN Decomposition ──

  const binInput = nonExpired.map((p) => ({
    confidence: p.confidence,
    outcome: p.outcome!,
    category: p.category,
    resolvedAt: p.resolvedAt,
  }));
  const bin = binInput.length >= 3 ? computeBINDecomposition(binInput) : null;

  // ── Build prompt section ──

  const promptSection = buildPromptSection({
    totalResolved: resolved.length,
    sampleSufficient,
    brierScore: weightedBrier,
    brierCI,
    logLoss: ll,
    binaryAccuracy,
    accuracyCI,
    avgConfidence,
    calibrationGap,
    calibration,
    byCategory,
    failurePatterns,
    timeframeAccuracy,
    recentTrend,
    resolutionBias,
    directionLevel,
    regimeInvalidatedCount,
    postEventCount,
    bin,
  });

  return {
    totalResolved: resolved.length,
    sampleSufficient,
    brierScore: weightedBrier,
    brierCI,
    logLoss: ll,
    binaryAccuracy,
    accuracyCI,
    avgConfidence,
    calibrationGap,
    calibration,
    byCategory,
    failurePatterns,
    timeframeAccuracy,
    recentTrend,
    resolutionBias,
    directionLevel,
    regimeInvalidatedCount,
    postEventCount,
    bin,
    promptSection,
  };
}

// ── Prompt Builder ──

function buildPromptSection(report: Omit<PerformanceReport, "promptSection">): string {
  const lines: string[] = [];

  lines.push(`PERFORMANCE DATA (${report.totalResolved} resolved predictions${report.sampleSufficient ? "" : " - LOW SAMPLE SIZE, interpret cautiously"}):`);
  lines.push("");

  // Proper scoring rules
  lines.push("Scoring metrics (lower Brier/log-loss = better calibration):");
  const brierCIStr = report.brierCI
    ? ` [95% CI: ${report.brierCI.lower.toFixed(4)}–${report.brierCI.upper.toFixed(4)}, n=${report.totalResolved}]`
    : ` [n=${report.totalResolved}, CI unavailable (need >= 5)]`;
  lines.push(`  Brier score: ${report.brierScore.toFixed(4)} ${brierInterpretation(report.brierScore)}${brierCIStr}`);
  lines.push(`  Log loss: ${report.logLoss.toFixed(4)}`);
  const accCIStr = report.accuracyCI
    ? ` [95% Wilson CI: ${(report.accuracyCI.lower * 100).toFixed(1)}%–${(report.accuracyCI.upper * 100).toFixed(1)}%]`
    : "";
  lines.push(`  Binary accuracy: ${(report.binaryAccuracy * 100).toFixed(0)}% of non-expired predictions confirmed${accCIStr}`);
  lines.push(`  Average stated confidence: ${(report.avgConfidence * 100).toFixed(0)}%`);
  if (!report.sampleSufficient) {
    lines.push("");
    lines.push("  WARNING: Sample size insufficient for reliable statistical inference (< 10 resolved). All metrics should be treated as preliminary estimates with wide uncertainty.");
  }

  // Calibration direction
  if (Math.abs(report.calibrationGap) > 0.1) {
    if (report.calibrationGap > 0) {
      lines.push("");
      lines.push(`CALIBRATION CORRECTION REQUIRED: You state ${(report.avgConfidence * 100).toFixed(0)}% average confidence but only ${(report.binaryAccuracy * 100).toFixed(0)}% confirm. Reduce confidence by approximately ${(report.calibrationGap * 100).toFixed(0)} percentage points.`);
      // Damping: don't suggest correcting more than half the gap at once
      const dampedCorrection = report.calibrationGap * 0.5;
      lines.push(`Apply a gradual correction: reduce confidence levels by ~${(dampedCorrection * 100).toFixed(0)}pp this round to avoid overcorrection.`);
    } else {
      lines.push("");
      lines.push(`CALIBRATION NOTE: You are slightly underconfident. You could increase confidence by ~${(Math.abs(report.calibrationGap) * 0.5 * 100).toFixed(0)}pp.`);
    }
  } else {
    lines.push("");
    lines.push("Calibration is within acceptable range. Maintain current confidence approach.");
  }

  // Reliability diagram data (only show reliable buckets)
  const reliableBuckets = report.calibration.filter((b) => b.reliable);
  if (reliableBuckets.length > 0) {
    lines.push("");
    lines.push("Calibration by confidence band (reliable bands only, n >= 3):");
    for (const b of reliableBuckets) {
      const expected = b.midpoint;
      const actual = b.confirmedRate;
      const diff = actual - expected;
      const direction = diff > 0.1 ? "underconfident" : diff < -0.1 ? "overconfident" : "well calibrated";
      lines.push(`  ${b.range}: stated ~${(expected * 100).toFixed(0)}%, actual ${(actual * 100).toFixed(0)}% confirmed (n=${b.count}, ${direction})`);
    }
  }

  // Category performance (only reliable)
  const reliableCategories = report.byCategory.filter((c) => c.reliable);
  if (reliableCategories.length > 0) {
    lines.push("");
    lines.push("Category performance (reliable categories only, n >= 3):");
    for (const cat of reliableCategories) {
      const quality = cat.brierScore < 0.2 ? "good" : cat.brierScore < 0.3 ? "moderate" : "poor";
      lines.push(`  ${cat.category}: Brier ${cat.brierScore.toFixed(3)} (${quality}), ${cat.confirmed}/${cat.total - cat.expired} confirmed, gap: ${cat.calibrationGap > 0 ? "+" : ""}${(cat.calibrationGap * 100).toFixed(0)}pp`);
    }
  }

  // Timeframe performance (only reliable)
  const reliableTf = Object.entries(report.timeframeAccuracy).filter(([, v]) => v.reliable);
  if (reliableTf.length > 0) {
    lines.push("");
    lines.push("Timeframe performance:");
    // Sort by Brier score (best first)
    reliableTf.sort(([, a], [, b]) => a.brierScore - b.brierScore);
    for (const [tf, data] of reliableTf) {
      lines.push(`  ${tf}: Brier ${data.brierScore.toFixed(3)}, ${(data.binaryAccuracy * 100).toFixed(0)}% confirmed (n=${data.count})`);
    }
    const bestTf = reliableTf[0];
    const worstTf = reliableTf[reliableTf.length - 1];
    if (reliableTf.length >= 2 && worstTf[1].brierScore - bestTf[1].brierScore > 0.1) {
      lines.push(`  RECOMMENDATION: Favor ${bestTf[0]} timeframe (Brier ${bestTf[1].brierScore.toFixed(3)}) over ${worstTf[0]} (Brier ${worstTf[1].brierScore.toFixed(3)})`);
    }
  }

  // Failure patterns
  if (report.failurePatterns.length > 0) {
    lines.push("");
    lines.push("FAILURE PATTERNS TO AVOID:");
    for (const fp of report.failurePatterns) {
      lines.push(`  * ${fp.pattern} (${fp.frequency}x)`);
      for (const ex of fp.examples.slice(0, 2)) {
        lines.push(`    - ${ex}`);
      }
    }
  }

  // Resolution bias warning
  if (report.resolutionBias.biasWarning) {
    lines.push("");
    lines.push(`RESOLUTION BIAS DETECTED: ${report.resolutionBias.biasWarning}`);
  }

  // Direction vs Level accuracy
  if (report.directionLevel.totalWithDirection >= 3) {
    lines.push("");
    lines.push("DIRECTION vs LEVEL ACCURACY:");
    lines.push(`  Direction correct: ${(report.directionLevel.directionCorrectRate * 100).toFixed(0)}% (n=${report.directionLevel.totalWithDirection})`);
    if (report.directionLevel.totalWithLevel >= 3) {
      lines.push(`  Level correct: ${(report.directionLevel.levelCorrectRate * 100).toFixed(0)}% (n=${report.directionLevel.totalWithLevel})`);
      lines.push(`  Direction right + level wrong (partial): ${(report.directionLevel.partialRate * 100).toFixed(0)}%`);
    }
    if (report.directionLevel.directionCorrectRate > 0.6 && report.directionLevel.levelCorrectRate < 0.3) {
      lines.push("  INSIGHT: Direction calls are solid but price targets are too aggressive. Widen your target ranges.");
    }
  }

  // Regime invalidation stats
  if (report.regimeInvalidatedCount > 0 || report.postEventCount > 0) {
    lines.push("");
    lines.push("REGIME & EVENT FILTERING:");
    if (report.regimeInvalidatedCount > 0) {
      lines.push(`  ${report.regimeInvalidatedCount} predictions invalidated by regime change (excluded from Brier)`);
    }
    if (report.postEventCount > 0) {
      lines.push(`  ${report.postEventCount} predictions tagged POST_EVENT (excluded from Brier)`);
    }
    lines.push("  Only pre-event predictions count toward calibration scoring.");
  }

  // Trend
  if (report.recentTrend) {
    lines.push("");
    const dir = report.recentTrend.improving ? "IMPROVING" : "DECLINING";
    lines.push(`Trend (${report.recentTrend.windowSize}-prediction window): ${dir} - recent Brier ${report.recentTrend.recentBrier.toFixed(3)} vs prior ${report.recentTrend.priorBrier.toFixed(3)}`);
  }

  // BIN Decomposition
  if (report.bin) {
    lines.push("");
    lines.push("BIN ERROR DECOMPOSITION (Bias-Information-Noise):");
    lines.push(`  Bias: ${report.bin.bias.toFixed(4)} (${report.bin.biasDirection})`);
    lines.push(`  Noise: ${report.bin.noise.toFixed(4)} (confidence scatter)`);
    lines.push(`  Information: ${report.bin.information.toFixed(4)} (signal extraction, higher = better)`);
    lines.push(`  Diagnosis: ${report.bin.interpretation}`);
    lines.push(`  Action: ${report.bin.recommendation}`);
    if (report.bin.byCategory.length > 0) {
      lines.push("  Per-category BIN:");
      for (const cat of report.bin.byCategory) {
        lines.push(`    ${cat.category}: bias=${cat.bias.toFixed(4)}, noise=${cat.noise.toFixed(4)}, info=${cat.information.toFixed(4)}`);
      }
    }
  }

  return lines.join("\n");
}

function brierInterpretation(brier: number): string {
  if (brier < 0.1) return "(excellent)";
  if (brier < 0.2) return "(good)";
  if (brier < 0.25) return "(moderate - at coin-flip baseline)";
  if (brier < 0.35) return "(poor - worse than naive 50/50)";
  return "(very poor - significant miscalibration)";
}
