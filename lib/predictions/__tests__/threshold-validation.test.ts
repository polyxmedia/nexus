import { describe, it, expect } from "vitest";
import {
  computeMovePercentile,
  percentileToDiscount,
  validateThreshold,
} from "../threshold-validation";

// ── percentileToDiscount ─────────────────────────────────────────────────

describe("percentileToDiscount", () => {
  it("returns 1.0 for percentile <= 75", () => {
    expect(percentileToDiscount(0)).toBe(1.0);
    expect(percentileToDiscount(50)).toBe(1.0);
    expect(percentileToDiscount(75)).toBe(1.0);
  });

  it("returns 0.30 for percentile >= 99", () => {
    expect(percentileToDiscount(99)).toBeCloseTo(0.30, 1);
    expect(percentileToDiscount(100)).toBe(0.30);
  });

  it("returns intermediate value between 75 and 99", () => {
    const mid = percentileToDiscount(87);
    expect(mid).toBeGreaterThan(0.30);
    expect(mid).toBeLessThan(1.0);
  });

  it("is monotonically decreasing", () => {
    const values = [75, 80, 85, 90, 95, 99].map(percentileToDiscount);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  });

  it("is smooth (no single-point jump > 10%)", () => {
    for (let p = 76; p <= 98; p++) {
      const diff = Math.abs(percentileToDiscount(p) - percentileToDiscount(p + 1));
      expect(diff).toBeLessThan(0.10);
    }
  });
});

// ── computeMovePercentile ────────────────────────────────────────────────

describe("computeMovePercentile", () => {
  it("zero move = 0th percentile", () => {
    expect(computeMovePercentile("equity_index", 0, 7)).toBe(0);
  });

  it("median move ≈ 50th percentile", () => {
    // equity_index 7d median = 1.5%
    const pct = computeMovePercentile("equity_index", 1.5, 7);
    expect(pct).toBeCloseTo(50, 0);
  });

  it("p90 move ≈ 90th percentile", () => {
    // equity_index 7d p90 = 4.0%
    const pct = computeMovePercentile("equity_index", 4.0, 7);
    expect(pct).toBeCloseTo(90, 0);
  });

  it("p99 move ≈ 99th percentile", () => {
    // equity_index 7d p99 = 8.0%
    const pct = computeMovePercentile("equity_index", 8.0, 7);
    expect(pct).toBeCloseTo(99, 0);
  });

  it("beyond p99 > 99", () => {
    const pct = computeMovePercentile("equity_index", 15.0, 7);
    expect(pct).toBeGreaterThan(99);
  });

  it("caps at 100", () => {
    const pct = computeMovePercentile("equity_index", 100.0, 7);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("leveraged ETFs have wider distributions", () => {
    // leveraged 7d p90 = 20%, so 15% should be well below p90
    const pct = computeMovePercentile("leveraged", 15.0, 7);
    expect(pct).toBeLessThan(90);
  });

  it("interpolates between median and p90", () => {
    // equity_index 7d: median=1.5, p90=4.0
    // 2.75% is midpoint between median and p90 → should be ~70th percentile
    const pct = computeMovePercentile("equity_index", 2.75, 7);
    expect(pct).toBeGreaterThan(50);
    expect(pct).toBeLessThan(90);
    expect(pct).toBeCloseTo(70, -1); // within 10
  });

  it("uses closest timeframe", () => {
    // 10 days should use 7d profile (closer than 14d)
    const pct7 = computeMovePercentile("equity_index", 3.0, 7);
    const pct10 = computeMovePercentile("equity_index", 3.0, 10);
    // 10d is closer to 7d, so should use same profile
    expect(pct10).toBe(pct7);
  });

  it("handles unknown asset class (falls back to stock)", () => {
    const pct = computeMovePercentile("unknown_asset", 5.0, 14);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });

  it("negative moves use absolute value", () => {
    const pos = computeMovePercentile("equity_index", 3.0, 7);
    const neg = computeMovePercentile("equity_index", -3.0, 7);
    expect(neg).toBe(pos);
  });
});

// ── validateThreshold ────────────────────────────────────────────────────

describe("validateThreshold", () => {
  it("returns no discount for achievable percentage threshold", () => {
    // 2% move in SPY over 14 days = ~45th percentile (well within normal)
    const result = validateThreshold("SPY will decline 2% within 14 days", "SPY", null, null, 14);
    expect(result.discountMultiplier).toBe(1.0);
    expect(result.percentileRank).toBeLessThan(75);
  });

  it("returns moderate discount for aggressive threshold", () => {
    // 5% move in SPY over 7 days = ~92nd percentile (above p90 of 4%)
    const result = validateThreshold("SPY will crash 5% in 7 days", "SPY", null, null, 7);
    expect(result.discountMultiplier).toBeLessThan(1.0);
    expect(result.discountMultiplier).toBeGreaterThan(0.30);
    expect(result.percentileRank).toBeGreaterThan(85);
  });

  it("returns strong discount for extreme threshold", () => {
    // 15% move in SPY over 7 days = ~99th+ percentile
    const result = validateThreshold("SPY will crash 15% in 7 days", "SPY", null, null, 7);
    expect(result.discountMultiplier).toBeLessThan(0.50);
    expect(result.percentileRank).toBeGreaterThan(95);
  });

  it("computes from price target vs reference price", () => {
    // $500 target from $520 current = 3.8% move
    const result = validateThreshold("SPY below target", "SPY", 500, 520, 14);
    expect(result.percentileRank).toBeGreaterThan(0);
    expect(result.discountMultiplier).toBeLessThanOrEqual(1.0);
  });

  it("returns no discount when no quantifiable threshold", () => {
    const result = validateThreshold("OPEC will announce production cuts", null, null, null, 14);
    expect(result.discountMultiplier).toBe(1.0);
    expect(result.reason).toContain("No quantifiable threshold");
  });

  it("handles missing reference data gracefully", () => {
    const result = validateThreshold("something moves 3%", null, null, null, 14);
    expect(result.discountMultiplier).toBeLessThanOrEqual(1.0);
    expect(result.percentileRank).toBeGreaterThanOrEqual(0);
  });

  it("leveraged ETFs get appropriate treatment", () => {
    // 15% for UVXY over 7d is normal (median is 8%)
    const result = validateThreshold("UVXY will gain 15% in 7 days", "UVXY", null, null, 7);
    expect(result.discountMultiplier).toBe(1.0); // within normal range
  });

  it("hasBeenAchieved is false for beyond-p99 moves", () => {
    // 20% move in equity_index over 7 days (p99 is 8%)
    const result = validateThreshold("SPY will crash 20% in 7 days", "SPY", null, null, 7);
    expect(result.hasBeenAchieved).toBe(false);
  });

  it("hasBeenAchieved is true for within-p99 moves", () => {
    const result = validateThreshold("SPY will decline 3% in 14 days", "SPY", null, null, 14);
    expect(result.hasBeenAchieved).toBe(true);
  });
});
