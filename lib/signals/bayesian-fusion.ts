/**
 * Bayesian Fusion Engine for Signal Convergence Scoring
 * ═══════════════════════════════════════════════════════
 * The Seldon Equations
 *
 * Asimov's psychohistory was modelled on statistical mechanics: the behaviour
 * of gas molecules is unpredictable individually but statistically determined
 * in aggregate. This engine applies the same principle to geopolitical-market
 * convergence. Each signal layer is an evidence source. Each Bayesian update
 * is a step in the psychohistorical equation. The posterior probability is
 * the system's best estimate of what the aggregate will do next.
 *
 * The math is Bayes' theorem (1763). The insight is Boltzmann's (1877):
 * sufficiently large systems have statistically predictable behaviour
 * regardless of individual particle trajectories.
 *
 * References:
 * - Martin 2026 (arXiv:2601.13362): Bayesian networks for geopolitical forecasting
 * - Hoegh et al. 2015 (Technometrics): Bayesian model fusion with "selective superiorities"
 * - Asimov 1951 (Foundation): psychohistory as statistical mechanics of civilisation
 *
 * The core idea: instead of summing significance scores and adding flat convergence
 * bonuses, we treat each signal layer as an independent (or conditionally dependent)
 * evidence source. We start with a prior probability for a given scenario type and
 * update it sequentially using likelihood ratios derived from each layer's signals.
 *
 * Correlated layers (e.g., geopolitical and OSINT) have their evidence discounted
 * via a dependency matrix, preventing double-counting of information.
 */

import type { CelestialEvent } from "./celestial";
import type { HebrewCalendarSignal } from "./hebrew-calendar";
import type { GeopoliticalEvent } from "./geopolitical";
import type { ConvergenceResult } from "./intensity";
import { getCyclicalReading, type CyclicalReading } from "./structural-cycles";
import { detectEschatologicalConvergences, type EschatologicalConvergence } from "./eschatological";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface BayesianPrior {
  scenarioType: string;
  baseProbability: number;
  description: string;
}

export interface LayerLikelihood {
  /** P(signal | event) / P(signal | no event). >1 supports the event, <1 argues against. */
  likelihoodRatio: number;
  /** How reliable this layer is as an evidence source (0-1). */
  confidence: number;
}

export interface LayerEvidence {
  type: string;
  significance: number;
  events: Array<{ significance: number; [key: string]: unknown }>;
}

export interface BayesianFusionResult {
  /** Final posterior probability after all evidence is incorporated. */
  posterior: number;
  /** Intensity on 1-5 scale, derived from posterior. */
  intensity: number;
  /** How much each layer moved the posterior (absolute change in probability). */
  layerContributions: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════
// SCENARIO PRIORS
// ═══════════════════════════════════════════════════════════

/**
 * Base-rate probabilities for different scenario types.
 *
 * These reflect the unconditional probability that an event of this type
 * is occurring or imminent on any given day. Calibrated against historical
 * frequencies: military escalations are rare (~5% of observation windows),
 * while market disruptions are more common (~12%).
 */
export const SCENARIO_PRIORS: Record<string, number> = {
  military_escalation: 0.05,
  economic_crisis: 0.08,
  diplomatic_shift: 0.10,
  market_disruption: 0.12,
  regime_change: 0.03,
  energy_shock: 0.06,
  eschatological_collision: 0.04,
  default: 0.10,
};

// ═══════════════════════════════════════════════════════════
// LAYER RELIABILITY
// ═══════════════════════════════════════════════════════════

/**
 * Base reliability coefficients for each signal layer.
 *
 * These represent how predictive each layer historically is for
 * geopolitical-market convergence events. Geopolitical and OSINT
 * layers carry the most weight; celestial and calendar layers are
 * weaker but still contribute when they align with stronger signals.
 *
 * Values informed by Hoegh et al.'s "selective superiority" framework:
 * each layer dominates in certain scenario types but is subordinate
 * in others. These are the averaged weights.
 */
const LAYER_RELIABILITY: Record<string, number> = {
  geopolitical: 0.85,
  osint: 0.80,
  market: 0.75,
  eschatological: 0.65,
  hebrew: 0.45,
  celestial: 0.35,
};

// ═══════════════════════════════════════════════════════════
// CONDITIONAL DEPENDENCY MATRIX
// ═══════════════════════════════════════════════════════════

/**
 * Independence factors between pairs of signal layers.
 *
 * A value of 1.0 means the two layers are fully independent (no shared
 * information). A value of 0.5 means 50% of the second layer's evidence
 * is redundant given the first has already been observed.
 *
 * When both geopolitical and OSINT fire, for example, OSINT's likelihood
 * ratio deviation from 1 is multiplied by 0.50, because OSINT events
 * (conflict reports, troop movements) are often the same underlying
 * reality that drives geopolitical signals.
 *
 * Matrix is symmetric: DEPENDENCY_MATRIX[A][B] === DEPENDENCY_MATRIX[B][A].
 */
export const DEPENDENCY_MATRIX: Record<string, Record<string, number>> = {
  geopolitical: { celestial: 0.95, hebrew: 0.80, market: 0.60, osint: 0.50, eschatological: 0.70 },
  celestial: { geopolitical: 0.95, hebrew: 0.70, market: 0.90, osint: 0.95, eschatological: 0.85 },
  hebrew: { geopolitical: 0.80, celestial: 0.70, market: 0.85, osint: 0.90, eschatological: 0.55 },
  market: { geopolitical: 0.60, celestial: 0.90, hebrew: 0.85, osint: 0.65, eschatological: 0.80 },
  osint: { geopolitical: 0.50, celestial: 0.95, hebrew: 0.90, market: 0.65, eschatological: 0.75 },
  eschatological: { geopolitical: 0.70, celestial: 0.85, hebrew: 0.55, market: 0.80, osint: 0.75 },
};

// ═══════════════════════════════════════════════════════════
// LIKELIHOOD RATIO COMPUTATION
// ═══════════════════════════════════════════════════════════

/**
 * Computes the likelihood ratio for a layer given its significance score.
 *
 * The likelihood ratio (LR) is P(observing this signal | event is real) divided
 * by P(observing this signal | event is not real).
 *
 * We model this as an exponential function of significance:
 *   LR = 1 + reliability * (e^(k * significance) - 1)
 *
 * Where:
 * - significance is the aggregate significance score for all events in this layer
 * - reliability scales the LR based on how predictive the layer is
 * - k controls the sensitivity curve (higher k = more aggressive scaling)
 *
 * At significance=0, LR=1 (no evidence). At significance=3, a highly reliable
 * layer produces LR around 3.4. At significance=9 (the cap), LR can reach
 * ~49 for the most reliable layers, which is deliberately aggressive for
 * extreme multi-event aggregations.
 *
 * @param significance - Aggregate significance score from events in this layer (0+)
 * @param layerType - The signal layer type
 * @returns The likelihood ratio and confidence for this layer
 */
export function computeLayerLikelihood(
  significance: number,
  layerType: string
): LayerLikelihood {
  const reliability = LAYER_RELIABILITY[layerType] ?? 0.50;

  // Sensitivity parameter. Controls how fast LR grows with significance.
  // Calibrated so that a single high-significance event (sig=3) from a
  // reliable layer produces LR ~4, which moves a 0.10 prior to ~0.31.
  const k = 0.45;

  // Cap significance to prevent numerical overflow and keep posteriors sane.
  const cappedSignificance = Math.min(significance, 9);

  // Raw LR from the exponential model
  const rawLR = Math.exp(k * cappedSignificance);

  // Scale the deviation from 1 by reliability.
  // If reliability is 0.85 and rawLR is 5, effective LR = 1 + 0.85*(5-1) = 4.4
  const likelihoodRatio = 1 + reliability * (rawLR - 1);

  return {
    likelihoodRatio,
    confidence: reliability,
  };
}

// ═══════════════════════════════════════════════════════════
// DEPENDENCY DISCOUNTING
// ═══════════════════════════════════════════════════════════

/**
 * Adjusts a likelihood ratio to account for conditional dependencies
 * with layers that have already been processed.
 *
 * Given a raw LR for a new layer, we find the minimum independence factor
 * between this layer and all previously observed layers. The LR's deviation
 * from 1 is then multiplied by this factor.
 *
 * Example: if geopolitical (LR=4.0) was already applied, and we now process
 * OSINT (raw LR=3.5), the independence factor is 0.50. The adjusted OSINT
 * LR becomes 1 + 0.50 * (3.5 - 1) = 2.25. This prevents double-counting
 * the correlated information.
 *
 * We use the minimum independence factor (most conservative discount) across
 * all previously seen layers, following Martin 2026's recommendation for
 * robust fusion under uncertain dependency structures.
 *
 * @param rawLR - The unadjusted likelihood ratio
 * @param currentLayer - The layer being added
 * @param previousLayers - Layers already incorporated into the posterior
 * @returns The dependency-adjusted likelihood ratio
 */
export function adjustForDependency(
  rawLR: number,
  currentLayer: string,
  previousLayers: string[]
): number {
  if (previousLayers.length === 0) return rawLR;

  const layerDeps = DEPENDENCY_MATRIX[currentLayer];
  if (!layerDeps) return rawLR;

  // Find the minimum independence factor (strongest dependency)
  let minIndependence = 1.0;
  for (const prev of previousLayers) {
    const independence = layerDeps[prev];
    if (independence !== undefined && independence < minIndependence) {
      minIndependence = independence;
    }
  }

  // Scale the LR's deviation from 1 by the independence factor.
  // An LR of 1 means "no evidence", so we only discount the informative part.
  const deviation = rawLR - 1;
  return 1 + minIndependence * deviation;
}

// ═══════════════════════════════════════════════════════════
// BAYESIAN UPDATE
// ═══════════════════════════════════════════════════════════

/**
 * Performs a single Bayesian update step.
 *
 * Applies Bayes' theorem in odds form:
 *   posterior_odds = prior_odds * likelihood_ratio
 *
 * Equivalently:
 *   P(H|E) = (P(H) * LR) / (P(H) * LR + (1 - P(H)))
 *
 * Where LR = P(E|H) / P(E|not H).
 *
 * @param prior - Current probability estimate P(H)
 * @param likelihoodRatio - The likelihood ratio for the new evidence
 * @returns Updated posterior probability P(H|E)
 */
export function bayesianUpdate(prior: number, likelihoodRatio: number): number {
  const numerator = prior * likelihoodRatio;
  const denominator = numerator + (1 - prior);
  return numerator / denominator;
}

// ═══════════════════════════════════════════════════════════
// POSTERIOR TO INTENSITY MAPPING
// ═══════════════════════════════════════════════════════════

/**
 * Converts a posterior probability to a 1-5 intensity scale.
 *
 * Thresholds calibrated to address underconfidence in downstream predictions.
 * Previous thresholds (0.15/0.25/0.40/0.60) were too conservative, causing
 * strong multi-layer convergence to map to intensity 3 when it should be 4.
 * Lowered thresholds slightly so that genuine convergence reaches higher
 * intensity, which feeds stronger context to the prediction engine.
 *
 * - Intensity 1: posterior below 0.12 (baseline noise)
 * - Intensity 2: 0.12-0.22 (weak single-layer signal)
 * - Intensity 3: 0.22-0.35 (moderate signal, possibly multi-layer)
 * - Intensity 4: 0.35-0.55 (strong multi-layer convergence)
 * - Intensity 5: 0.55+ (very strong, rare, requires multiple reliable layers)
 *
 * @param posterior - The posterior probability (0-1)
 * @returns Intensity score (1-5)
 */
export function posteriorToIntensity(posterior: number): number {
  if (posterior >= 0.55) return 5;
  if (posterior >= 0.35) return 4;
  if (posterior >= 0.22) return 3;
  if (posterior >= 0.12) return 2;
  return 1;
}

// ═══════════════════════════════════════════════════════════
// CORE FUSION FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Performs Bayesian fusion across multiple signal layers.
 *
 * Starting from a prior probability, each layer's evidence is incorporated
 * via sequential Bayesian updating. Layers are processed in order of
 * decreasing reliability (strongest evidence first), which ensures that
 * dependency discounting is applied most aggressively to the weaker,
 * correlated layers.
 *
 * The function tracks each layer's marginal contribution: the absolute
 * change in posterior probability attributable to that layer. This is
 * useful for understanding which signals are driving the overall assessment.
 *
 * @param prior - Starting probability P(event) before any layer evidence
 * @param layers - Array of signal layers with their events and significance
 * @returns Posterior probability, intensity, and per-layer contributions
 */
export function bayesianFusion(
  prior: number,
  layers: LayerEvidence[]
): BayesianFusionResult {
  // Sort layers by reliability (strongest first) for optimal dependency discounting
  const sortedLayers = [...layers].sort((a, b) => {
    const relA = LAYER_RELIABILITY[a.type] ?? 0.50;
    const relB = LAYER_RELIABILITY[b.type] ?? 0.50;
    return relB - relA;
  });

  let posterior = prior;
  const processedLayers: string[] = [];
  const layerContributions: Record<string, number> = {};

  for (const layer of sortedLayers) {
    // Aggregate significance across all events in this layer
    const totalSignificance = layer.events.reduce(
      (sum, e) => sum + (e.significance ?? 0),
      0
    );

    if (totalSignificance === 0) continue;

    // Compute raw likelihood ratio from significance
    const { likelihoodRatio: rawLR } = computeLayerLikelihood(
      totalSignificance,
      layer.type
    );

    // Adjust for conditional dependencies with already-processed layers
    const adjustedLR = adjustForDependency(rawLR, layer.type, processedLayers);

    // Record prior before update to compute marginal contribution
    const priorBeforeUpdate = posterior;

    // Bayesian update
    posterior = bayesianUpdate(posterior, adjustedLR);

    // Track marginal contribution
    layerContributions[layer.type] = posterior - priorBeforeUpdate;
    processedLayers.push(layer.type);
  }

  return {
    posterior,
    intensity: posteriorToIntensity(posterior),
    layerContributions,
  };
}

// ═══════════════════════════════════════════════════════════
// SCENARIO TYPE INFERENCE
// ═══════════════════════════════════════════════════════════

/**
 * Infers the most likely scenario type from the events present in a cluster,
 * used to select the appropriate prior probability.
 *
 * Maps event characteristics to scenario types. Falls back to "default" if
 * no strong signal is detected.
 */
function inferScenarioType(
  geopolitical: GeopoliticalEvent[],
  hebrew: HebrewCalendarSignal[],
  celestial: CelestialEvent[],
  eschatologicalConvergences: EschatologicalConvergence[] = []
): string {
  // If eschatological convergences are active with high significance, that takes priority
  if (eschatologicalConvergences.length > 0 && eschatologicalConvergences[0].significance >= 3) {
    return "eschatological_collision";
  }

  // Check geopolitical event types for scenario cues
  for (const e of geopolitical) {
    const t = e.type.toLowerCase();
    const title = e.title.toLowerCase();

    if (t.includes("military") || t.includes("conflict") || title.includes("war")) {
      return "military_escalation";
    }
    if (t.includes("economic") || t.includes("sanctions") || title.includes("crisis")) {
      return "economic_crisis";
    }
    if (t.includes("diplomatic") || t.includes("summit") || t.includes("election")) {
      return "diplomatic_shift";
    }
    if (t.includes("opec") || t.includes("energy") || title.includes("oil")) {
      return "energy_shock";
    }
    if (t.includes("regime") || t.includes("coup")) {
      return "regime_change";
    }
  }

  // Check sectors for market disruption cues
  const allSectors = geopolitical.flatMap((e) => e.sectors);
  if (allSectors.some((s) => ["equities", "bonds", "forex", "commodities"].includes(s))) {
    return "market_disruption";
  }

  return "default";
}

// ═══════════════════════════════════════════════════════════
// DROP-IN REPLACEMENT FOR scoreConvergences
// ═══════════════════════════════════════════════════════════

const PROXIMITY_DAYS = 3;

/** Maps holiday display names to canonical trigger keys used by the eschatological layer. */
const HOLIDAY_TO_TRIGGER: Record<string, string> = {
  "tish'a b'av": "tisha_bav", "tisha b'av": "tisha_bav", "tisha bav": "tisha_bav",
  "pesach": "pesach", "passover": "pesach",
  "sukkot": "sukkot", "sukkos": "sukkot",
  "purim": "purim",
  "ramadan": "ramadan",
  "quds day": "quds_day", "al-quds day": "quds_day",
  "ashura": "ashura",
  "laylat al-qadr": "laylat_al_qadr", "night of power": "laylat_al_qadr",
  "easter": "easter", "orthodox easter": "orthodox_easter",
  "victory day": "victory_day",
};

/** Resolve a holiday display name to a canonical trigger key. */
function resolveCalendarKey(holiday: string): string | null {
  const normalized = holiday.toLowerCase().trim();
  const exact = HOLIDAY_TO_TRIGGER[normalized];
  if (exact) return exact;
  for (const [name, key] of Object.entries(HOLIDAY_TO_TRIGGER)) {
    if (normalized.includes(name) || name.includes(normalized)) return key;
  }
  return null;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.abs(da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Bayesian replacement for `scoreConvergences` in intensity.ts.
 *
 * Uses the same date-clustering logic and returns the same ConvergenceResult
 * type, but replaces the additive scoring with Bayesian posterior updating.
 *
 * The key differences from the original:
 * 1. Intensity is derived from a calibrated posterior probability, not a sum
 * 2. Correlated layers are discounted to avoid double-counting
 * 3. Different scenario types have different base-rate priors
 * 4. Each layer's contribution is proportional to its reliability and the
 *    strength of its evidence, not just a flat bonus
 *
 * @param celestial - Celestial events (eclipses, retrogrades, etc.)
 * @param hebrew - Hebrew calendar signals (holidays, observances)
 * @param geopolitical - Geopolitical events (summits, conflicts, sanctions)
 * @returns Array of ConvergenceResult sorted by date, scored via Bayesian fusion
 */
export function scoreBayesianConvergences(
  celestial: CelestialEvent[],
  hebrew: HebrewCalendarSignal[],
  geopolitical: GeopoliticalEvent[]
): ConvergenceResult[] {
  const results: ConvergenceResult[] = [];

  // Collect all unique dates across layers
  const allDates = new Set<string>();
  celestial.forEach((e) => allDates.add(e.date));
  hebrew.forEach((e) => allDates.add(e.date));
  geopolitical.forEach((e) => allDates.add(e.date));

  const sortedDates = Array.from(allDates).sort();

  // Cluster nearby dates (within PROXIMITY_DAYS of each other)
  const clusters: string[][] = [];
  let currentCluster: string[] = [];

  for (const date of sortedDates) {
    if (
      currentCluster.length === 0 ||
      daysBetween(currentCluster[currentCluster.length - 1], date) <= PROXIMITY_DAYS
    ) {
      currentCluster.push(date);
    } else {
      clusters.push([...currentCluster]);
      currentCluster = [date];
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  // Detect eschatological convergences once for preflight (used to infer scenario type)
  const allCalendarKeys = hebrew
    .map((h) => resolveCalendarKey(h.holiday))
    .filter((k): k is string => k !== null);
  const eschaConvergences = detectEschatologicalConvergences(allCalendarKeys);

  for (const cluster of clusters) {
    const clusterStart = cluster[0];

    // Find all events in this cluster
    const ce = celestial.filter((e) =>
      cluster.some((d) => daysBetween(e.date, d) <= PROXIMITY_DAYS)
    );
    const he = hebrew.filter((e) =>
      cluster.some((d) => daysBetween(e.date, d) <= PROXIMITY_DAYS)
    );
    const ge = geopolitical.filter((e) =>
      cluster.some((d) => daysBetween(e.date, d) <= PROXIMITY_DAYS)
    );

    // Count active layers
    const layers: string[] = [];
    if (ce.length > 0) layers.push("celestial");
    if (he.length > 0) layers.push("hebrew");
    if (ge.length > 0) layers.push("geopolitical");

    if (layers.length === 0) continue;

    // Cyclical reading for cultural context (does not feed into Bayesian scoring)
    const esoteric = getCyclicalReading(new Date(clusterStart + "T12:00:00Z"));

    // Check if eschatological convergences are relevant to this cluster
    // Only include convergences where this cluster's calendar events match triggers
    const clusterCalendarKeys = he
      .map((h) => resolveCalendarKey(h.holiday))
      .filter((k): k is string => k !== null);
    // Re-detect with only this cluster's calendar keys so significance reflects local context
    const clusterEscha = clusterCalendarKeys.length > 0
      ? detectEschatologicalConvergences(clusterCalendarKeys)
      : [];

    // Infer scenario type and select prior
    const scenarioType = inferScenarioType(ge, he, ce, clusterEscha);
    const prior = SCENARIO_PRIORS[scenarioType] ?? SCENARIO_PRIORS.default;

    // Build layer evidence array for Bayesian fusion
    const layerEvidence: LayerEvidence[] = [];

    if (ce.length > 0) {
      layerEvidence.push({
        type: "celestial",
        significance: ce.reduce((s, e) => s + e.significance, 0),
        events: ce.map((e) => ({ significance: e.significance, title: e.title })),
      });
    }

    if (he.length > 0) {
      layerEvidence.push({
        type: "hebrew",
        significance: he.reduce((s, e) => s + e.significance, 0),
        events: he.map((e) => ({ significance: e.significance, holiday: e.holiday })),
      });
    }

    if (ge.length > 0) {
      layerEvidence.push({
        type: "geopolitical",
        significance: ge.reduce((s, e) => s + e.significance, 0),
        events: ge.map((e) => ({ significance: e.significance, title: e.title })),
      });
    }

    // Eschatological layer: inject if convergences detected and calendar events present
    if (clusterEscha.length > 0) {
      const eschaSignificance = clusterEscha.reduce((s, e) => s + e.significance, 0);
      layerEvidence.push({
        type: "eschatological",
        significance: Math.min(eschaSignificance, 9),
        events: clusterEscha.map((e) => ({
          significance: e.significance,
          title: `${e.programmes.join(" vs ")} [${e.sharedGeography.join(", ")}]`,
          amplification: e.amplificationFactor,
        })),
      });
      if (!layers.includes("eschatological")) layers.push("eschatological");
    }

    // Run Bayesian fusion
    const { intensity, posterior, layerContributions } = bayesianFusion(
      prior,
      layerEvidence
    );

    // Build title and description
    const allTitles = [
      ...ce.map((e) => e.title),
      ...he.map((e) => e.holiday),
      ...ge.map((e) => e.title),
      ...clusterEscha.map((e) => `Eschatological: ${e.programmes.join(" vs ")}`),
    ];

    const title =
      allTitles.length <= 2
        ? allTitles.join(" + ")
        : `${allTitles[0]} + ${allTitles.length - 1} convergent events`;

    const descriptions = [
      ...ce.map((e) => e.description),
      ...he.map((e) => e.description),
      ...ge.map((e) => e.description),
    ];

    const category = layers.length > 1 ? "convergence" : layers[0];

    const sectors = new Set<string>();
    ge.forEach((e) => e.sectors.forEach((s) => sectors.add(s)));
    he.forEach((e) => {
      if (e.marketRelevance.includes("energy")) sectors.add("energy");
      if (e.marketRelevance.includes("defense")) sectors.add("defense");
      if (e.marketRelevance.includes("agricultural")) sectors.add("agriculture");
    });

    results.push({
      date: clusterStart,
      intensity,
      layers,
      celestialEvents: ce,
      hebrewEvents: he,
      geopoliticalEvents: ge,
      esoteric,
      title,
      description: descriptions.join(" | "),
      category,
      marketSectors: Array.from(sectors),
    });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
