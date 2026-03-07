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

export interface PerformanceReport {
  totalResolved: number;
  sampleSufficient: boolean;
  brierScore: number;
  logLoss: number;
  binaryAccuracy: number;
  avgConfidence: number;
  calibrationGap: number;
  calibration: CalibrationBucket[];
  byCategory: CategoryStats[];
  failurePatterns: FailurePattern[];
  timeframeAccuracy: Record<string, { count: number; brierScore: number; binaryAccuracy: number; reliable: boolean }>;
  recentTrend: { recentBrier: number; priorBrier: number; improving: boolean; windowSize: number } | null;
  resolutionBias: ResolutionBias;
  promptSection: string;
}

// ── Constants ──

const MIN_TOTAL_FOR_REPORT = 5;
const MIN_BUCKET_SIZE = 3;
const MIN_CATEGORY_SIZE = 3;
const DECAY_HALF_LIFE_DAYS = 60;
const EPSILON = 1e-7; // prevent log(0)

// ── Core Scoring Functions ──

/**
 * Brier score: mean((confidence - outcome)^2)
 * Lower is better. 0 = perfect, 0.25 = coin flip at 50%, 1 = maximally wrong.
 * Uses binary outcome: confirmed=1, denied=0.
 * Partial predictions are scored at 0.5 (directionally correct, magnitude wrong).
 */
function brierScore(predictions: Array<{ confidence: number; outcome: string }>): number {
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
function logLoss(predictions: Array<{ confidence: number; outcome: string }>): number {
  const scoreable = predictions.filter((p) => p.outcome !== "expired");
  if (scoreable.length === 0) return 1;

  const sum = scoreable.reduce((s, p) => {
    const actual = outcomeToNumeric(p.outcome);
    const clampedConf = Math.max(EPSILON, Math.min(1 - EPSILON, p.confidence));
    return s - (actual * Math.log(clampedConf) + (1 - actual) * Math.log(1 - clampedConf));
  }, 0);
  return sum / scoreable.length;
}

function outcomeToNumeric(outcome: string): number {
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
function decayWeight(resolvedAt: string | null, now: Date): number {
  if (!resolvedAt) return 0.5;
  const daysAgo = (now.getTime() - new Date(resolvedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(2, -daysAgo / DECAY_HALF_LIFE_DAYS);
}

// ── Main Report ──

export async function computePerformanceReport(): PerformanceReport | null {
  const resolved = await db
    .select()
    .from(schema.predictions)
    .where(not(isNull(schema.predictions.outcome)))
    .orderBy(desc(schema.predictions.resolvedAt))
    ;

  if (resolved.length < MIN_TOTAL_FOR_REPORT) return null;

  const now = new Date();
  const nonExpired = resolved.filter((p) => p.outcome !== "expired");
  const sampleSufficient = nonExpired.length >= 10;

  // ── Proper scoring rules ──

  const scoringInputs = nonExpired.map((p) => ({
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

  // ── Calibration buckets (proper reliability diagram data) ──

  const bucketDefs: { min: number; max: number; label: string; midpoint: number }[] = [
    { min: 0.0, max: 0.35, label: "low (0-35%)", midpoint: 0.175 },
    { min: 0.35, max: 0.5, label: "med-low (35-50%)", midpoint: 0.425 },
    { min: 0.5, max: 0.65, label: "medium (50-65%)", midpoint: 0.575 },
    { min: 0.65, max: 0.8, label: "high (65-80%)", midpoint: 0.725 },
    { min: 0.8, max: 1.01, label: "very high (80%+)", midpoint: 0.9 },
  ];

  const calibration: CalibrationBucket[] = bucketDefs.map((bucket) => {
    const inBucket = nonExpired.filter((p) => p.confidence >= bucket.min && p.confidence < bucket.max);
    const confirmedInBucket = inBucket.filter((p) => p.outcome === "confirmed").length;
    const confirmedRate = inBucket.length > 0 ? confirmedInBucket / inBucket.length : 0;
    const bucketBrier = inBucket.length > 0
      ? inBucket.reduce((s, p) => s + Math.pow(p.confidence - outcomeToNumeric(p.outcome!), 2), 0) / inBucket.length
      : 0;
    return {
      range: bucket.label,
      midpoint: bucket.midpoint,
      count: inBucket.length,
      confirmedRate,
      brierContribution: bucketBrier,
      reliable: inBucket.length >= MIN_BUCKET_SIZE,
    };
  });

  // ── Category breakdown ──

  const categories = ["market", "geopolitical", "celestial"];
  const byCategory: CategoryStats[] = categories
    .map((cat) => {
      const inCat = resolved.filter((p) => p.category === cat);
      if (inCat.length === 0) return null;
      const catNonExpired = inCat.filter((p) => p.outcome !== "expired");
      const catConfirmed = catNonExpired.filter((p) => p.outcome === "confirmed").length;
      const catBrier = brierScore(catNonExpired.map((p) => ({ confidence: p.confidence, outcome: p.outcome! })));
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

  const timeframeAccuracy: Record<string, { count: number; brierScore: number; binaryAccuracy: number; reliable: boolean }> = {};
  for (const p of nonExpired) {
    const tf = p.timeframe || "unknown";
    if (!timeframeAccuracy[tf]) {
      timeframeAccuracy[tf] = { count: 0, brierScore: 0, binaryAccuracy: 0, reliable: false };
    }
    timeframeAccuracy[tf].count++;
  }
  for (const tf of Object.keys(timeframeAccuracy)) {
    const tfPreds = nonExpired.filter((p) => (p.timeframe || "unknown") === tf);
    const tfBrier = brierScore(tfPreds.map((p) => ({ confidence: p.confidence, outcome: p.outcome! })));
    const tfConfirmed = tfPreds.filter((p) => p.outcome === "confirmed").length;
    timeframeAccuracy[tf] = {
      count: tfPreds.length,
      brierScore: tfBrier,
      binaryAccuracy: tfPreds.length > 0 ? tfConfirmed / tfPreds.length : 0,
      reliable: tfPreds.length >= MIN_BUCKET_SIZE,
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

  // ── Build prompt section ──

  const promptSection = buildPromptSection({
    totalResolved: resolved.length,
    sampleSufficient,
    brierScore: weightedBrier,
    logLoss: ll,
    binaryAccuracy,
    avgConfidence,
    calibrationGap,
    calibration,
    byCategory,
    failurePatterns,
    timeframeAccuracy,
    recentTrend,
    resolutionBias,
  });

  return {
    totalResolved: resolved.length,
    sampleSufficient,
    brierScore: weightedBrier,
    logLoss: ll,
    binaryAccuracy,
    avgConfidence,
    calibrationGap,
    calibration,
    byCategory,
    failurePatterns,
    timeframeAccuracy,
    recentTrend,
    resolutionBias,
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
  lines.push(`  Brier score: ${report.brierScore.toFixed(4)} ${brierInterpretation(report.brierScore)}`);
  lines.push(`  Log loss: ${report.logLoss.toFixed(4)}`);
  lines.push(`  Binary accuracy: ${(report.binaryAccuracy * 100).toFixed(0)}% of non-expired predictions confirmed`);
  lines.push(`  Average stated confidence: ${(report.avgConfidence * 100).toFixed(0)}%`);

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
    const bestTf = reliableTf;
    const worstTf = reliableTf[reliableTf.length - 1];
    if (reliableTf.length >= 2 && worstTf[1].brierScore - bestTf[1].brierScore > 0.1) {
      lines.push(`  RECOMMENDATION: Favor ${bestTf} timeframe (Brier ${bestTf[1].brierScore.toFixed(3)}) over ${worstTf} (Brier ${worstTf[1].brierScore.toFixed(3)})`);
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

  // Trend
  if (report.recentTrend) {
    lines.push("");
    const dir = report.recentTrend.improving ? "IMPROVING" : "DECLINING";
    lines.push(`Trend (${report.recentTrend.windowSize}-prediction window): ${dir} - recent Brier ${report.recentTrend.recentBrier.toFixed(3)} vs prior ${report.recentTrend.priorBrier.toFixed(3)}`);
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
