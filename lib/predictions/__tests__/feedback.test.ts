import { describe, it, expect } from "vitest";
import { brierScore, logLoss, outcomeToNumeric, decayWeight, computeBINDecomposition } from "../feedback";

// ── outcomeToNumeric ──

describe("outcomeToNumeric", () => {
  it("maps confirmed to 1", () => {
    expect(outcomeToNumeric("confirmed")).toBe(1);
  });

  it("maps denied to 0", () => {
    expect(outcomeToNumeric("denied")).toBe(0);
  });

  it("maps partial to 0.5", () => {
    expect(outcomeToNumeric("partial")).toBe(0.5);
  });

  it("maps unknown outcomes to 0", () => {
    expect(outcomeToNumeric("expired")).toBe(0);
    expect(outcomeToNumeric("whatever")).toBe(0);
    expect(outcomeToNumeric("")).toBe(0);
  });
});

// ── brierScore ──

describe("brierScore", () => {
  it("returns 0 for perfect predictions", () => {
    const preds = [
      { confidence: 1.0, outcome: "confirmed" },
      { confidence: 0.0, outcome: "denied" },
    ];
    expect(brierScore(preds)).toBeCloseTo(0);
  });

  it("returns 1 for maximally wrong predictions", () => {
    const preds = [
      { confidence: 0.0, outcome: "confirmed" },
      { confidence: 1.0, outcome: "denied" },
    ];
    expect(brierScore(preds)).toBeCloseTo(1);
  });

  it("returns 0.25 for coin-flip predictions", () => {
    // 50% confidence on all outcomes = baseline
    const preds = [
      { confidence: 0.5, outcome: "confirmed" },
      { confidence: 0.5, outcome: "denied" },
    ];
    expect(brierScore(preds)).toBeCloseTo(0.25);
  });

  it("returns 0.25 for empty array (baseline)", () => {
    expect(brierScore([])).toBe(0.25);
  });

  it("filters out expired predictions", () => {
    const preds = [
      { confidence: 1.0, outcome: "confirmed" },
      { confidence: 0.5, outcome: "expired" },
    ];
    // Only the confirmed one counts: (1.0 - 1.0)^2 = 0
    expect(brierScore(preds)).toBeCloseTo(0);
  });

  it("returns 0.25 when all predictions are expired", () => {
    const preds = [
      { confidence: 0.8, outcome: "expired" },
      { confidence: 0.6, outcome: "expired" },
    ];
    expect(brierScore(preds)).toBe(0.25);
  });

  it("handles partial outcomes at 0.5", () => {
    // confidence 0.5, outcome partial (0.5): (0.5 - 0.5)^2 = 0
    const preds = [{ confidence: 0.5, outcome: "partial" }];
    expect(brierScore(preds)).toBeCloseTo(0);
  });

  it("penalizes overconfident wrong predictions", () => {
    // 90% confident but denied: (0.9 - 0)^2 = 0.81
    const preds = [{ confidence: 0.9, outcome: "denied" }];
    expect(brierScore(preds)).toBeCloseTo(0.81);
  });

  it("rewards correct high-confidence predictions", () => {
    // 90% confident and confirmed: (0.9 - 1.0)^2 = 0.01
    const preds = [{ confidence: 0.9, outcome: "confirmed" }];
    expect(brierScore(preds)).toBeCloseTo(0.01);
  });

  it("computes mean across multiple predictions", () => {
    const preds = [
      { confidence: 0.9, outcome: "confirmed" }, // (0.9-1)^2 = 0.01
      { confidence: 0.9, outcome: "denied" },     // (0.9-0)^2 = 0.81
    ];
    // Mean = (0.01 + 0.81) / 2 = 0.41
    expect(brierScore(preds)).toBeCloseTo(0.41);
  });
});

// ── logLoss ──

describe("logLoss", () => {
  it("returns low loss for correct confident predictions", () => {
    const preds = [
      { confidence: 0.95, outcome: "confirmed" },
      { confidence: 0.05, outcome: "denied" },
    ];
    const loss = logLoss(preds);
    expect(loss).toBeLessThan(0.1);
  });

  it("returns high loss for wrong confident predictions", () => {
    const preds = [
      { confidence: 0.95, outcome: "denied" },
      { confidence: 0.05, outcome: "confirmed" },
    ];
    const loss = logLoss(preds);
    expect(loss).toBeGreaterThan(2);
  });

  it("returns ~0.693 for coin-flip predictions", () => {
    // -[1*log(0.5) + 0*log(0.5)] = log(2) ≈ 0.693
    const preds = [
      { confidence: 0.5, outcome: "confirmed" },
      { confidence: 0.5, outcome: "denied" },
    ];
    const loss = logLoss(preds);
    expect(loss).toBeCloseTo(0.693, 2);
  });

  it("returns 1 for empty array", () => {
    expect(logLoss([])).toBe(1);
  });

  it("filters out expired predictions", () => {
    const preds = [
      { confidence: 0.95, outcome: "confirmed" },
      { confidence: 0.5, outcome: "expired" },
    ];
    const loss = logLoss(preds);
    expect(loss).toBeLessThan(0.1);
  });

  it("handles edge case confidence near 0 or 1", () => {
    // Should not return NaN or Infinity due to epsilon clamping
    const preds = [
      { confidence: 0.0, outcome: "denied" },
      { confidence: 1.0, outcome: "confirmed" },
    ];
    const loss = logLoss(preds);
    expect(Number.isFinite(loss)).toBe(true);
    expect(loss).toBeLessThan(0.001);
  });
});

// ── decayWeight ──

describe("decayWeight", () => {
  it("returns 1.0 for predictions resolved just now", () => {
    const now = new Date();
    const weight = decayWeight(now.toISOString(), now);
    expect(weight).toBeCloseTo(1.0, 2);
  });

  it("returns 0.5 for predictions resolved one half-life ago (60 days)", () => {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const weight = decayWeight(sixtyDaysAgo.toISOString(), now);
    expect(weight).toBeCloseTo(0.5, 1);
  });

  it("returns ~0.25 for predictions resolved two half-lives ago (120 days)", () => {
    const now = new Date();
    const oneHundredTwentyDaysAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    const weight = decayWeight(oneHundredTwentyDaysAgo.toISOString(), now);
    expect(weight).toBeCloseTo(0.25, 1);
  });

  it("returns 0.5 for null resolvedAt", () => {
    expect(decayWeight(null, new Date())).toBe(0.5);
  });

  it("decays monotonically (older = lower weight)", () => {
    const now = new Date();
    const w30 = decayWeight(new Date(now.getTime() - 30 * 86400000).toISOString(), now);
    const w60 = decayWeight(new Date(now.getTime() - 60 * 86400000).toISOString(), now);
    const w90 = decayWeight(new Date(now.getTime() - 90 * 86400000).toISOString(), now);
    expect(w30).toBeGreaterThan(w60);
    expect(w60).toBeGreaterThan(w90);
  });
});

// ── computeBINDecomposition (Satopaa et al. 2021) ──

describe("computeBINDecomposition", () => {
  const now = new Date().toISOString();

  function makePred(confidence: number, outcome: string, category = "market") {
    return { confidence, outcome, category, resolvedAt: now };
  }

  it("returns default for fewer than 3 predictions", () => {
    const result = computeBINDecomposition([makePred(0.7, "confirmed"), makePred(0.6, "denied")]);
    expect(result.interpretation).toContain("Insufficient data");
    expect(result.bias).toBe(0);
    expect(result.noise).toBe(0);
    expect(result.information).toBe(0);
    expect(result.brierScore).toBe(0.25);
    expect(result.byCategory).toEqual([]);
  });

  it("filters out expired and post_event predictions", () => {
    const result = computeBINDecomposition([
      makePred(0.7, "confirmed"),
      makePred(0.6, "denied"),
      makePred(0.5, "expired"),
      makePred(0.5, "post_event"),
    ]);
    // Only 2 scoreable -> insufficient
    expect(result.interpretation).toContain("Insufficient data");
  });

  it("computes zero bias for perfectly calibrated predictions", () => {
    // Confidence matches hit rate exactly: 50% confidence, 50% hit rate
    const preds = [
      makePred(0.5, "confirmed"),
      makePred(0.5, "denied"),
      makePred(0.5, "confirmed"),
      makePred(0.5, "denied"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.bias).toBe(0); // meanC = meanO = 0.5
    expect(result.biasDirection).toBe("neutral");
  });

  it("detects overconfidence when mean confidence > mean outcome", () => {
    const preds = [
      makePred(0.8, "denied"),
      makePred(0.8, "denied"),
      makePred(0.8, "denied"),
      makePred(0.8, "confirmed"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.biasDirection).toBe("overconfident");
    expect(result.bias).toBeGreaterThan(0);
  });

  it("detects underconfidence when mean confidence < mean outcome", () => {
    const preds = [
      makePred(0.2, "confirmed"),
      makePred(0.2, "confirmed"),
      makePred(0.2, "confirmed"),
      makePred(0.2, "denied"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.biasDirection).toBe("underconfident");
  });

  it("computes zero noise when all confidences are identical", () => {
    const preds = [
      makePred(0.6, "confirmed"),
      makePred(0.6, "denied"),
      makePred(0.6, "confirmed"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.noise).toBe(0); // var(c) = 0
  });

  it("computes positive noise when confidences vary", () => {
    const preds = [
      makePred(0.3, "denied"),
      makePred(0.7, "confirmed"),
      makePred(0.5, "denied"),
      makePred(0.9, "confirmed"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.noise).toBeGreaterThan(0);
  });

  it("computes positive information when confidence tracks outcomes", () => {
    // High confidence for confirmed, low for denied = positive covariance
    const preds = [
      makePred(0.9, "confirmed"),
      makePred(0.1, "denied"),
      makePred(0.8, "confirmed"),
      makePred(0.2, "denied"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.information).toBeGreaterThan(0);
  });

  it("computes negative information when confidence inversely tracks outcomes", () => {
    // High confidence for denied, low for confirmed = negative covariance
    const preds = [
      makePred(0.1, "confirmed"),
      makePred(0.9, "denied"),
      makePred(0.2, "confirmed"),
      makePred(0.8, "denied"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.information).toBeLessThan(0);
  });

  it("Brier = bias + varC + varO - 2*cov(c,o)", () => {
    const preds = [
      makePred(0.7, "confirmed"),
      makePred(0.3, "denied"),
      makePred(0.6, "confirmed"),
      makePred(0.4, "denied"),
      makePred(0.5, "confirmed"),
    ];
    const result = computeBINDecomposition(preds);
    // Brier should be non-negative
    expect(result.brierScore).toBeGreaterThanOrEqual(0);
    // Check against direct Brier computation
    const directBrier = brierScore(preds);
    expect(result.brierScore).toBeCloseTo(directBrier, 2);
  });

  it("provides per-category breakdown", () => {
    const preds = [
      makePred(0.7, "confirmed", "market"),
      makePred(0.3, "denied", "market"),
      makePred(0.6, "confirmed", "market"),
      makePred(0.8, "confirmed", "geopolitical"),
      makePred(0.2, "denied", "geopolitical"),
      makePred(0.5, "denied", "geopolitical"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.byCategory.length).toBe(2);
    const market = result.byCategory.find((c) => c.category === "market");
    const geo = result.byCategory.find((c) => c.category === "geopolitical");
    expect(market).toBeDefined();
    expect(geo).toBeDefined();
  });

  it("skips categories with fewer than 3 predictions in breakdown", () => {
    const preds = [
      makePred(0.7, "confirmed", "market"),
      makePred(0.3, "denied", "market"),
      makePred(0.6, "confirmed", "market"),
      makePred(0.5, "denied", "geopolitical"), // only 1 geo prediction
    ];
    const result = computeBINDecomposition(preds);
    expect(result.byCategory.length).toBe(1);
    expect(result.byCategory[0].category).toBe("market");
  });

  it("generates non-empty interpretation and recommendation", () => {
    const preds = [
      makePred(0.8, "confirmed"),
      makePred(0.3, "denied"),
      makePred(0.6, "denied"),
      makePred(0.7, "confirmed"),
    ];
    const result = computeBINDecomposition(preds);
    expect(result.interpretation.length).toBeGreaterThan(0);
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  it("handles partial outcomes at 0.5", () => {
    const preds = [
      makePred(0.6, "partial"),
      makePred(0.4, "partial"),
      makePred(0.5, "partial"),
    ];
    const result = computeBINDecomposition(preds);
    expect(Number.isFinite(result.bias)).toBe(true);
    expect(Number.isFinite(result.noise)).toBe(true);
    expect(Number.isFinite(result.information)).toBe(true);
  });
});
