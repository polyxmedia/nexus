import { describe, it, expect } from "vitest";
import {
  BASE_RATES,
  getBaseRateContext,
  adjustForBaseRate,
} from "../base-rates";

describe("BASE_RATES", () => {
  it("all market rates are between 0 and 1", () => {
    for (const [key, val] of Object.entries(BASE_RATES.market)) {
      expect(val).toBeGreaterThan(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("all geopolitical rates are between 0 and 1", () => {
    for (const [key, val] of Object.entries(BASE_RATES.geopolitical)) {
      expect(val).toBeGreaterThan(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("rare events have lower rates than common ones", () => {
    expect(BASE_RATES.market.spx_weekly_drop_10pct).toBeLessThan(
      BASE_RATES.market.spx_weekly_drop_5pct
    );
    expect(BASE_RATES.geopolitical.coup_attempt_year).toBeLessThan(
      BASE_RATES.geopolitical.election_upset
    );
  });
});

describe("getBaseRateContext", () => {
  it("returns formatted string for valid categories", () => {
    const ctx = getBaseRateContext(["market"]);
    expect(ctx).toContain("EMPIRICAL BASE RATES");
    expect(ctx).toContain("[MARKET]");
    expect(ctx).toContain("base probability");
  });

  it("includes multiple categories", () => {
    const ctx = getBaseRateContext(["market", "geopolitical"]);
    expect(ctx).toContain("[MARKET]");
    expect(ctx).toContain("[GEOPOLITICAL]");
  });

  it("handles empty categories gracefully", () => {
    const ctx = getBaseRateContext([]);
    expect(ctx).toContain("EMPIRICAL BASE RATES");
  });

  it("ignores invalid categories", () => {
    const ctx = getBaseRateContext(["nonexistent"]);
    expect(ctx).toContain("EMPIRICAL BASE RATES");
    expect(ctx).not.toContain("[NONEXISTENT]");
  });

  it("includes anchoring instruction", () => {
    const ctx = getBaseRateContext(["market"]);
    expect(ctx).toContain("starting anchors");
  });
});

describe("adjustForBaseRate", () => {
  it("returns value between 0 and 1", () => {
    const result = adjustForBaseRate(0.80, 0.05, 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it("weak evidence keeps result close to base rate", () => {
    const result = adjustForBaseRate(0.90, 0.05, 1);
    // With evidence strength 1, model weight is only 0.2
    // Result should be much closer to base rate (0.05) than model (0.90)
    expect(result).toBeLessThan(0.30);
  });

  it("strong evidence allows result close to stated confidence", () => {
    const result = adjustForBaseRate(0.80, 0.05, 5);
    // With evidence strength 5, model weight is 0.9
    // Result should be close to stated confidence
    expect(result).toBeGreaterThan(0.50);
  });

  it("result is between base rate and stated confidence", () => {
    const baseRate = 0.05;
    const stated = 0.80;
    const result = adjustForBaseRate(stated, baseRate, 3);
    expect(result).toBeGreaterThan(baseRate);
    expect(result).toBeLessThan(stated);
  });

  it("clamps evidence strength", () => {
    // Should not crash with out-of-range values
    const low = adjustForBaseRate(0.50, 0.10, -5);
    const high = adjustForBaseRate(0.50, 0.10, 100);
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(0);
    expect(low).toBeLessThan(1);
    expect(high).toBeLessThan(1);
  });

  it("identical base rate and stated confidence returns that value", () => {
    const result = adjustForBaseRate(0.30, 0.30, 3);
    expect(result).toBeCloseTo(0.30, 2);
  });
});
