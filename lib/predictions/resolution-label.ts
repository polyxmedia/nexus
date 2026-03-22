/**
 * Prediction Resolution Labelling
 *
 * Correct probabilistic labelling for prediction outcomes.
 * A 25% confidence prediction that resolves "denied" is well-calibrated,
 * not a miss. The label should reflect calibration quality, not just
 * binary hit/miss.
 *
 * Rules:
 *   confidence > 50% + confirmed  → HIT
 *   confidence > 50% + denied     → MISS
 *   confidence < 50% + denied     → CORRECT REJECT
 *   confidence < 50% + confirmed  → SURPRISE
 *   confidence = 50%              → label based on Brier quality only
 *   partial                       → PARTIAL (always)
 *   expired                       → EXPIRED (always)
 */

export interface ResolutionLabel {
  label: string;
  color: string; // tailwind text color
  bg: string; // tailwind bg color
  border: string; // tailwind border color
  brierQuality: string; // "Excellent" | "Good" | "Fair" | "Poor"
  brierScore: number;
  calibrationNote: string;
}

function brierQuality(score: number): string {
  if (score <= 0.10) return "Excellent";
  if (score <= 0.20) return "Good";
  if (score <= 0.30) return "Fair";
  return "Poor";
}

function computeBrier(confidence: number, outcome: string): number {
  const actual = outcome === "confirmed" ? 1 : outcome === "partial" ? 0.5 : 0;
  return Math.pow(confidence - actual, 2);
}

export function getResolutionLabel(outcome: string, confidence: number, _score?: number | null): ResolutionLabel {
  // Always compute Brier from confidence + outcome. The DB `score` field is a
  // correctness score (1=right, 0=wrong), NOT a Brier score (0=perfect, 1=worst).
  const brier = computeBrier(confidence, outcome);
  const quality = brierQuality(brier);

  if (outcome === "partial") {
    return {
      label: "PARTIAL",
      color: "text-accent-amber",
      bg: "bg-accent-amber/8",
      border: "border-accent-amber/25",
      brierQuality: quality,
      brierScore: brier,
      calibrationNote: "Direction correct, magnitude or timing off",
    };
  }

  if (outcome === "expired") {
    return {
      label: "EXPIRED",
      color: "text-navy-400",
      bg: "bg-navy-800/40",
      border: "border-navy-700/30",
      brierQuality: quality,
      brierScore: brier,
      calibrationNote: "Prediction window closed without resolution",
    };
  }

  if (outcome === "post_event") {
    return {
      label: "INVALID",
      color: "text-navy-400",
      bg: "bg-navy-800/40",
      border: "border-navy-700/30",
      brierQuality: "N/A",
      brierScore: 0,
      calibrationNote: "Excluded from scoring: target already met at creation",
    };
  }

  // Exact 50% is a coin flip, label by Brier quality only
  if (Math.abs(confidence - 0.5) < 0.005) {
    const isGood = brier <= 0.25;
    return {
      label: outcome === "confirmed" ? "HIT" : "MISS",
      color: isGood ? "text-accent-cyan" : "text-navy-400",
      bg: isGood ? "bg-accent-cyan/8" : "bg-navy-800/40",
      border: isGood ? "border-accent-cyan/25" : "border-navy-700/30",
      brierQuality: quality,
      brierScore: brier,
      calibrationNote: `50/50 call, ${outcome === "confirmed" ? "event occurred" : "event did not occur"}`,
    };
  }

  if (confidence > 0.5) {
    if (outcome === "confirmed") {
      // High confidence + confirmed = HIT
      return {
        label: "HIT",
        color: "text-accent-emerald",
        bg: "bg-accent-emerald/8",
        border: "border-accent-emerald/25",
        brierQuality: quality,
        brierScore: brier,
        calibrationNote: `High-confidence call confirmed`,
      };
    } else {
      // High confidence + denied = MISS
      return {
        label: "MISS",
        color: "text-accent-rose",
        bg: "bg-accent-rose/8",
        border: "border-accent-rose/25",
        brierQuality: quality,
        brierScore: brier,
        calibrationNote: `Overconfident, event did not occur`,
      };
    }
  } else {
    // confidence < 50%
    if (outcome === "denied") {
      // Low confidence + denied = CORRECT REJECT
      return {
        label: "CORRECT REJECT",
        color: "text-accent-emerald",
        bg: "bg-accent-emerald/8",
        border: "border-accent-emerald/25",
        brierQuality: quality,
        brierScore: brier,
        calibrationNote: `Low-confidence denial confirmed`,
      };
    } else {
      // Low confidence + confirmed = SURPRISE
      return {
        label: "SURPRISE",
        color: "text-accent-amber",
        bg: "bg-accent-amber/8",
        border: "border-accent-amber/25",
        brierQuality: quality,
        brierScore: brier,
        calibrationNote: `Underconfident, event occurred despite low probability`,
      };
    }
  }
}
