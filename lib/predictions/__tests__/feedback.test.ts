import { describe, it, expect } from "vitest";
import { brierScore, logLoss, outcomeToNumeric, decayWeight } from "../feedback";

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
