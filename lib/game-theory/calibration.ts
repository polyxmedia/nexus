/**
 * Game Theory Calibration Bridge
 *
 * Connects game theory predictions to the existing prediction/calibration
 * system so equilibrium probabilities, escalation forecasts, and market
 * direction calls can be scored against actual outcomes.
 *
 * Uses Brier score (Brier 1950) for probability calibration and tracks
 * prediction records that the feedback system (lib/predictions/feedback.ts)
 * can score when outcomes are resolved.
 *
 * Flow: runBayesianAnalysis() -> extractPredictions() -> prediction records
 *       -> outcomes resolved later -> brierScore() from feedback.ts
 */

import type { BayesianAnalysis, BayesianEquilibrium } from "./bayesian";

export interface GameTheoryPrediction {
  id: string; // unique prediction ID
  scenarioId: string;
  timestamp: string;
  category: "equilibrium" | "escalation" | "market_direction" | "cooperation" | "mediation";
  claim: string; // human-readable prediction
  confidence: number; // 0-1
  direction?: "bullish" | "bearish" | "mixed";
  outcome?: "confirmed" | "denied" | "partial" | "pending";
  resolvedAt?: string;
  metadata: Record<string, unknown>;
}

/**
 * Extract trackable predictions from a Bayesian analysis.
 * Each prediction gets a unique ID for later resolution scoring.
 */
export function extractPredictions(
  scenarioId: string,
  analysis: BayesianAnalysis
): GameTheoryPrediction[] {
  const predictions: GameTheoryPrediction[] = [];
  const now = new Date().toISOString();
  let idx = 0;

  const makeId = () => `gt-${scenarioId}-${Date.now()}-${idx++}`;

  // 1. Top equilibrium prediction
  if (analysis.equilibria.length > 0) {
    const topEq = analysis.equilibria[0];
    const stratDesc = Object.entries(topEq.strategyProfile)
      .map(([a, s]) => `${a}: ${s}`)
      .join(", ");

    predictions.push({
      id: makeId(),
      scenarioId,
      timestamp: now,
      category: "equilibrium",
      claim: `Most likely outcome: ${stratDesc}`,
      confidence: topEq.probability,
      outcome: "pending",
      metadata: {
        strategyProfile: topEq.strategyProfile,
        stability: topEq.stability,
        bargainingRange: topEq.bargainingRange,
        fearonCondition: topEq.fearonCondition,
      },
    });
  }

  // 2. Escalation probability
  predictions.push({
    id: makeId(),
    scenarioId,
    timestamp: now,
    category: "escalation",
    claim: `Escalation probability: ${Math.round(analysis.escalationProbability * 100)}%`,
    confidence: analysis.escalationProbability,
    outcome: "pending",
    metadata: {
      pathCount: analysis.sequentialPaths.length,
      bargainingRange: analysis.bargainingRange,
    },
  });

  // 3. Market direction call
  predictions.push({
    id: makeId(),
    scenarioId,
    timestamp: now,
    category: "market_direction",
    claim: `Market direction: ${analysis.marketAssessment.direction} (${analysis.marketAssessment.keySectors.join(", ")})`,
    confidence: analysis.marketAssessment.confidence,
    direction: analysis.marketAssessment.direction,
    outcome: "pending",
    metadata: {
      sectors: analysis.marketAssessment.keySectors,
      timeframe: analysis.marketAssessment.timeframe,
      mostLikelyOutcome: analysis.marketAssessment.mostLikelyOutcome,
    },
  });

  // 4. Cooperation sustainability (repeated game)
  predictions.push({
    id: makeId(),
    scenarioId,
    timestamp: now,
    category: "cooperation",
    claim: analysis.repeatedGame.cooperationSustainable
      ? `Cooperation sustainable (threshold δ*=${analysis.repeatedGame.cooperationThreshold.toFixed(2)})`
      : `Cooperation NOT sustainable (threshold δ*=${analysis.repeatedGame.cooperationThreshold.toFixed(2)})`,
    confidence: analysis.repeatedGame.cooperationSustainable ? 0.7 : 0.3,
    outcome: "pending",
    metadata: {
      discountFactors: analysis.repeatedGame.discountFactors,
      cooperationPremium: analysis.repeatedGame.cooperationPremium,
    },
  });

  // 5. Mediation value (correlated equilibrium)
  if (analysis.correlatedEquilibrium.mediatorRequired) {
    predictions.push({
      id: makeId(),
      scenarioId,
      timestamp: now,
      category: "mediation",
      claim: `Mediation can improve outcomes by ${analysis.correlatedEquilibrium.improvementOverNash.toFixed(1)} utility over Nash`,
      confidence: 0.6,
      outcome: "pending",
      metadata: {
        socialWelfare: analysis.correlatedEquilibrium.socialWelfare,
        improvementOverNash: analysis.correlatedEquilibrium.improvementOverNash,
        recommendations: analysis.correlatedEquilibrium.recommendations,
      },
    });
  }

  return predictions;
}

/**
 * Compute Brier score for a set of resolved game theory predictions.
 * Brier score = (1/N) * Σ(confidence - outcome)²
 * where outcome = 1 if confirmed, 0 if denied, 0.5 if partial.
 *
 * Lower is better. Perfect calibration = 0.0. Random = 0.25.
 */
export function gameTheoryBrierScore(predictions: GameTheoryPrediction[]): number {
  const resolved = predictions.filter(p => p.outcome && p.outcome !== "pending");
  if (resolved.length === 0) return NaN;

  let sumSquaredError = 0;
  for (const p of resolved) {
    const outcomeValue = p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0;
    sumSquaredError += Math.pow(p.confidence - outcomeValue, 2);
  }

  return sumSquaredError / resolved.length;
}

/**
 * Compute calibration buckets for game theory predictions.
 * Groups predictions by confidence level and compares predicted vs actual rates.
 */
export function gameTheoryCalibration(predictions: GameTheoryPrediction[]): {
  bucket: string;
  count: number;
  avgConfidence: number;
  actualRate: number;
  gap: number;
}[] {
  const resolved = predictions.filter(p => p.outcome && p.outcome !== "pending");
  const buckets = [
    { label: "0-20%", min: 0, max: 0.2 },
    { label: "20-40%", min: 0.2, max: 0.4 },
    { label: "40-60%", min: 0.4, max: 0.6 },
    { label: "60-80%", min: 0.6, max: 0.8 },
    { label: "80-100%", min: 0.8, max: 1.01 },
  ];

  return buckets.map(b => {
    const inBucket = resolved.filter(p => p.confidence >= b.min && p.confidence < b.max);
    if (inBucket.length === 0) {
      return { bucket: b.label, count: 0, avgConfidence: 0, actualRate: 0, gap: 0 };
    }

    const avgConf = inBucket.reduce((s, p) => s + p.confidence, 0) / inBucket.length;
    const actualRate = inBucket.filter(p => p.outcome === "confirmed").length / inBucket.length;

    return {
      bucket: b.label,
      count: inBucket.length,
      avgConfidence: avgConf,
      actualRate,
      gap: avgConf - actualRate,
    };
  });
}
