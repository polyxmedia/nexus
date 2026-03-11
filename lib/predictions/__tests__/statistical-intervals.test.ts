import { describe, it, expect } from "vitest";
import { wilsonInterval, bootstrapBrierCI, benjaminiHochberg } from "../feedback";

// ── Wilson Score Interval ──

describe("wilsonInterval", () => {
  it("returns [0, 1] for zero trials", () => {
    const ci = wilsonInterval(0, 0);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(1);
    expect(ci.method).toBe("wilson");
    expect(ci.level).toBe(0.95);
  });

  it("returns a narrow interval for large sample with clear proportion", () => {
    // 900/1000 = 90% success rate, large n → tight CI
    const ci = wilsonInterval(900, 1000);
    expect(ci.lower).toBeGreaterThan(0.87);
    expect(ci.upper).toBeLessThan(0.92);
  });

  it("returns a wide interval for small sample", () => {
    // 3/5 = 60%, small n → wide CI
    const ci = wilsonInterval(3, 5);
    expect(ci.upper - ci.lower).toBeGreaterThan(0.3);
  });

  it("is symmetric around 0.5 for 50% proportion", () => {
    const ci = wilsonInterval(50, 100);
    const center = (ci.lower + ci.upper) / 2;
    expect(center).toBeCloseTo(0.5, 1);
  });

  it("bounds are always within [0, 1]", () => {
    // Edge: 0/10 and 10/10
    const ciZero = wilsonInterval(0, 10);
    expect(ciZero.lower).toBeGreaterThanOrEqual(0);
    expect(ciZero.upper).toBeLessThanOrEqual(1);

    const ciAll = wilsonInterval(10, 10);
    expect(ciAll.lower).toBeGreaterThanOrEqual(0);
    expect(ciAll.upper).toBeLessThanOrEqual(1);
  });

  it("lower < upper for all valid inputs", () => {
    const ci = wilsonInterval(7, 20);
    expect(ci.lower).toBeLessThan(ci.upper);
  });

  it("interval shrinks as sample size increases", () => {
    const ciSmall = wilsonInterval(5, 10);
    const ciLarge = wilsonInterval(50, 100);
    const widthSmall = ciSmall.upper - ciSmall.lower;
    const widthLarge = ciLarge.upper - ciLarge.lower;
    expect(widthLarge).toBeLessThan(widthSmall);
  });

  it("accepts custom z-score for different confidence levels", () => {
    const ci90 = wilsonInterval(50, 100, 1.645); // 90% CI
    const ci95 = wilsonInterval(50, 100, 1.96);  // 95% CI
    const ci99 = wilsonInterval(50, 100, 2.576); // 99% CI

    const width90 = ci90.upper - ci90.lower;
    const width95 = ci95.upper - ci95.lower;
    const width99 = ci99.upper - ci99.lower;

    expect(width90).toBeLessThan(width95);
    expect(width95).toBeLessThan(width99);
  });
});

// ── Bootstrap Brier CI ──

describe("bootstrapBrierCI", () => {
  it("returns fallback for fewer than 5 predictions", () => {
    const preds = [
      { confidence: 0.8, outcome: "confirmed" },
      { confidence: 0.3, outcome: "denied" },
    ];
    const ci = bootstrapBrierCI(preds);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(0.5);
    expect(ci.method).toBe("bootstrap");
  });

  it("filters out expired predictions before bootstrapping", () => {
    // 4 expired + 3 real = only 3 scoreable → below threshold
    const preds = [
      { confidence: 0.8, outcome: "expired" },
      { confidence: 0.7, outcome: "expired" },
      { confidence: 0.6, outcome: "expired" },
      { confidence: 0.5, outcome: "expired" },
      { confidence: 0.9, outcome: "confirmed" },
      { confidence: 0.1, outcome: "denied" },
      { confidence: 0.8, outcome: "confirmed" },
    ];
    const ci = bootstrapBrierCI(preds);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(0.5);
  });

  it("produces valid interval for perfect predictions", () => {
    const preds = Array.from({ length: 20 }, () => ({
      confidence: 1.0,
      outcome: "confirmed",
    }));
    const ci = bootstrapBrierCI(preds);
    expect(ci.lower).toBeCloseTo(0, 1);
    expect(ci.upper).toBeCloseTo(0, 1);
  });

  it("produces wider interval for mixed predictions", () => {
    const preds = [
      ...Array.from({ length: 5 }, () => ({ confidence: 0.9, outcome: "confirmed" })),
      ...Array.from({ length: 5 }, () => ({ confidence: 0.9, outcome: "denied" })),
    ];
    const ci = bootstrapBrierCI(preds);
    // Mixed = high variance in Brier → wider CI
    expect(ci.upper - ci.lower).toBeGreaterThan(0.05);
  });

  it("lower <= upper always holds", () => {
    const preds = [
      { confidence: 0.7, outcome: "confirmed" },
      { confidence: 0.3, outcome: "denied" },
      { confidence: 0.6, outcome: "confirmed" },
      { confidence: 0.4, outcome: "denied" },
      { confidence: 0.8, outcome: "confirmed" },
    ];
    const ci = bootstrapBrierCI(preds);
    expect(ci.lower).toBeLessThanOrEqual(ci.upper);
  });

  it("bounds are within [0, 1] for Brier scores", () => {
    const preds = Array.from({ length: 10 }, (_, i) => ({
      confidence: i % 2 === 0 ? 0.9 : 0.1,
      outcome: i % 2 === 0 ? "confirmed" : "denied",
    }));
    const ci = bootstrapBrierCI(preds);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
    expect(ci.upper).toBeLessThanOrEqual(1);
  });
});

// ── Benjamini-Hochberg ──

describe("benjaminiHochberg", () => {
  it("returns empty array for empty input", () => {
    expect(benjaminiHochberg([])).toEqual([]);
  });

  it("correctly identifies significant results", () => {
    const pValues = [
      { label: "A", pValue: 0.001 },
      { label: "B", pValue: 0.01 },
      { label: "C", pValue: 0.04 },
      { label: "D", pValue: 0.50 },
    ];
    const results = benjaminiHochberg(pValues, 0.05);

    // A and B should be significant, D should not
    const mapByLabel = Object.fromEntries(results.map(r => [r.label, r]));
    expect(mapByLabel.A.significant).toBe(true);
    expect(mapByLabel.D.significant).toBe(false);
  });

  it("is more conservative than raw p-values", () => {
    const pValues = [
      { label: "A", pValue: 0.03 },
      { label: "B", pValue: 0.04 },
      { label: "C", pValue: 0.05 },
    ];
    const results = benjaminiHochberg(pValues, 0.05);

    // All adjusted p-values should be >= raw p-values
    for (const r of results) {
      expect(r.adjusted).toBeGreaterThanOrEqual(r.pValue);
    }
  });

  it("adjusted p-values are capped at 1", () => {
    const pValues = [
      { label: "A", pValue: 0.80 },
      { label: "B", pValue: 0.90 },
    ];
    const results = benjaminiHochberg(pValues);
    for (const r of results) {
      expect(r.adjusted).toBeLessThanOrEqual(1);
    }
  });

  it("maintains monotonicity of adjusted p-values", () => {
    const pValues = [
      { label: "A", pValue: 0.001 },
      { label: "B", pValue: 0.010 },
      { label: "C", pValue: 0.030 },
      { label: "D", pValue: 0.040 },
      { label: "E", pValue: 0.500 },
    ];
    const results = benjaminiHochberg(pValues);

    // Sort by original p-value and check adjusted is non-decreasing
    const sorted = [...results].sort((a, b) => a.pValue - b.pValue);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].adjusted).toBeGreaterThanOrEqual(sorted[i - 1].adjusted);
    }
  });

  it("single p-value: adjusted equals raw (capped at 1)", () => {
    const results = benjaminiHochberg([{ label: "only", pValue: 0.03 }]);
    expect(results).toHaveLength(1);
    // m=1, rank=1: adjusted = 0.03 * 1 / 1 = 0.03
    expect(results[0].adjusted).toBeCloseTo(0.03);
    expect(results[0].significant).toBe(true);
  });

  it("all non-significant when p-values are large", () => {
    const pValues = [
      { label: "A", pValue: 0.20 },
      { label: "B", pValue: 0.30 },
      { label: "C", pValue: 0.40 },
    ];
    const results = benjaminiHochberg(pValues, 0.05);
    expect(results.every(r => !r.significant)).toBe(true);
  });

  it("preserves original p-values in output", () => {
    const pValues = [
      { label: "X", pValue: 0.012 },
      { label: "Y", pValue: 0.045 },
    ];
    const results = benjaminiHochberg(pValues);
    const mapByLabel = Object.fromEntries(results.map(r => [r.label, r]));
    expect(mapByLabel.X.pValue).toBe(0.012);
    expect(mapByLabel.Y.pValue).toBe(0.045);
  });
});
