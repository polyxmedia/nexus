import { describe, it, expect } from "vitest";
import {
  classifyClaim,
  detectClaimType,
  getTimeframeBucket,
  getMagnitudeBucket,
  wilsonInterval,
  matchesReferenceClass,
  type ReferenceClass,
} from "../reference-class";

// ── detectClaimType ──────────────────────────────────────────────────────

describe("detectClaimType", () => {
  it("detects percentage_threshold from 'drop more than 5%'", () => {
    expect(detectClaimType("SPY will drop more than 5% in 7 days")).toBe("percentage_threshold");
  });

  it("detects percentage_threshold from 'gain at least 2%'", () => {
    expect(detectClaimType("GLD will gain at least 2% within 14 days")).toBe("percentage_threshold");
  });

  it("detects percentage_threshold from 'decline 3.5%'", () => {
    expect(detectClaimType("HYG will decline 3.5% from close")).toBe("percentage_threshold");
  });

  it("detects percentage_threshold from 'by more than 1.5 percentage points'", () => {
    expect(detectClaimType("XLI will underperform SPY by more than 1.5%")).toBe("percentage_threshold");
  });

  it("detects day_count from 'at least 4 trading days'", () => {
    expect(detectClaimType("XLK below $200 on at least 4 trading days")).toBe("day_count");
  });

  it("detects day_count from 'on 6 of 10 trading days'", () => {
    expect(detectClaimType("IEMG below March 6 level on 6 of 10 trading days")).toBe("day_count");
  });

  it("detects day_count from '3 consecutive trading days'", () => {
    expect(detectClaimType("SPY below 500 for 3 consecutive trading days")).toBe("day_count");
  });

  it("detects relative_performance from 'outperform'", () => {
    expect(detectClaimType("XLE will outperform XLK over next 30 days")).toBe("relative_performance");
  });

  it("detects relative_performance from 'underperform'", () => {
    expect(detectClaimType("XLI will underperform SPY")).toBe("relative_performance");
  });

  it("detects price_level from '$2400'", () => {
    expect(detectClaimType("GLD will trade above $2400 within 14 days")).toBe("price_level");
  });

  it("detects price_level from 'close below 510'", () => {
    expect(detectClaimType("SPY will close below 510")).toBe("price_level");
  });

  it("detects policy_action from 'Fed will announce'", () => {
    expect(detectClaimType("Fed will announce rate hold at next FOMC")).toBe("policy_action");
  });

  it("detects policy_action from 'OPEC will announce'", () => {
    expect(detectClaimType("OPEC will announce production cuts within 7 days")).toBe("policy_action");
  });

  it("detects policy_action from 'impose sanctions'", () => {
    expect(detectClaimType("US will impose new sanctions on Iran")).toBe("policy_action");
  });

  it("defaults to binary_event for unclassifiable claims", () => {
    expect(detectClaimType("Tensions between NATO and Russia will escalate")).toBe("binary_event");
  });

  it("defaults to binary_event for vague geopolitical claims", () => {
    expect(detectClaimType("Taiwan will face increased military pressure")).toBe("binary_event");
  });

  // Priority: day_count over price_level when both patterns present
  it("prioritizes day_count when claim has both price and day patterns", () => {
    expect(detectClaimType("SPY below $500 on at least 3 trading days")).toBe("day_count");
  });
});

// ── getTimeframeBucket ───────────────────────────────────────────────────

describe("getTimeframeBucket", () => {
  it("<=7d = short", () => {
    expect(getTimeframeBucket("7 days")).toBe("short");
    expect(getTimeframeBucket("5d")).toBe("short");
    expect(getTimeframeBucket("3 days")).toBe("short");
    expect(getTimeframeBucket("48h")).toBe("short");
    expect(getTimeframeBucket("72 hours")).toBe("short");
  });

  it("8-21d = medium", () => {
    expect(getTimeframeBucket("14 days")).toBe("medium");
    expect(getTimeframeBucket("10d")).toBe("medium");
    expect(getTimeframeBucket("21 days")).toBe("medium");
    expect(getTimeframeBucket("2 weeks")).toBe("medium");
  });

  it("22+d = long", () => {
    expect(getTimeframeBucket("30 days")).toBe("long");
    expect(getTimeframeBucket("60d")).toBe("long");
    expect(getTimeframeBucket("1 month")).toBe("long");
  });

  it("defaults to medium for unparseable timeframe", () => {
    expect(getTimeframeBucket("soon")).toBe("medium");
  });
});

// ── getMagnitudeBucket ───────────────────────────────────────────────────

describe("getMagnitudeBucket", () => {
  it("<=3% = small from claim text", () => {
    expect(getMagnitudeBucket("SPY drop 2%", null, null)).toBe("small");
    expect(getMagnitudeBucket("gain 1.5%", null, null)).toBe("small");
  });

  it("3-10% = medium from claim text", () => {
    expect(getMagnitudeBucket("SPY drop 7%", null, null)).toBe("medium");
    expect(getMagnitudeBucket("decline 5.5%", null, null)).toBe("medium");
  });

  it(">10% = large from claim text", () => {
    expect(getMagnitudeBucket("SPY crash 15%", null, null)).toBe("large");
    expect(getMagnitudeBucket("UVXY gain 25%", null, null)).toBe("large");
  });

  it("computes magnitude from price target vs reference price", () => {
    // $500 target, $520 current = 3.8% move = medium
    expect(getMagnitudeBucket("SPY below target", 500, 520)).toBe("medium");
    // $510 target, $520 current = 1.9% = small
    expect(getMagnitudeBucket("SPY below target", 510, 520)).toBe("small");
    // $400 target, $520 current = 23% = large
    expect(getMagnitudeBucket("SPY below target", 400, 520)).toBe("large");
  });

  it("returns null when no percentage or price data", () => {
    expect(getMagnitudeBucket("OPEC will announce cuts", null, null)).toBeNull();
  });

  it("returns null when reference price is 0", () => {
    expect(getMagnitudeBucket("below target", 100, 0)).toBeNull();
  });

  it("prefers explicit percentage over computed magnitude", () => {
    // Claim says 2% but price target implies 10% - use the 2% from claim
    expect(getMagnitudeBucket("decline 2% from close", 468, 520)).toBe("small");
  });
});

// ── classifyClaim (integration) ──────────────────────────────────────────

describe("classifyClaim", () => {
  it("classifies a full market percentage prediction", () => {
    const rc = classifyClaim("SPY will drop more than 5% in 7 days", "market", "7 days", "down", null, null);
    expect(rc.claimType).toBe("percentage_threshold");
    expect(rc.category).toBe("market");
    expect(rc.timeframeBucket).toBe("short");
    expect(rc.magnitudeBucket).toBe("medium");
    expect(rc.direction).toBe("down");
  });

  it("classifies a price level prediction with target", () => {
    const rc = classifyClaim("GLD will trade above $2400 within 14 days", "market", "14 days", "up", 2400, 2350);
    expect(rc.claimType).toBe("price_level");
    expect(rc.timeframeBucket).toBe("medium");
    expect(rc.magnitudeBucket).toBe("small"); // ~2.1% move
    expect(rc.direction).toBe("up");
  });

  it("classifies a geopolitical binary event", () => {
    const rc = classifyClaim("Iran will escalate tensions in the Gulf", "geopolitical", "30 days", null, null, null);
    expect(rc.claimType).toBe("binary_event");
    expect(rc.category).toBe("geopolitical");
    expect(rc.timeframeBucket).toBe("long");
    expect(rc.magnitudeBucket).toBeNull();
    expect(rc.direction).toBeNull();
  });

  it("normalizes invalid direction to null", () => {
    const rc = classifyClaim("something", "market", "7 days", "sideways", null, null);
    expect(rc.direction).toBeNull();
  });
});

// ── wilsonInterval ───────────────────────────────────────────────────────

describe("wilsonInterval", () => {
  it("returns full range [0, 1] for zero total", () => {
    const ci = wilsonInterval(0, 0);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(1);
    expect(ci.width).toBe(1);
  });

  it("0 successes out of 10 gives interval near 0", () => {
    const ci = wilsonInterval(0, 10);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBeGreaterThan(0);
    expect(ci.upper).toBeLessThan(0.35);
  });

  it("10 successes out of 10 gives interval near 1", () => {
    const ci = wilsonInterval(10, 10);
    expect(ci.lower).toBeGreaterThan(0.65);
    expect(ci.upper).toBe(1);
  });

  it("5 out of 10 gives interval centered near 0.5", () => {
    const ci = wilsonInterval(5, 10);
    expect(ci.lower).toBeGreaterThan(0.2);
    expect(ci.upper).toBeLessThan(0.8);
    const center = (ci.lower + ci.upper) / 2;
    expect(center).toBeCloseTo(0.5, 0);
  });

  it("wider interval for smaller samples", () => {
    const small = wilsonInterval(3, 5);
    const large = wilsonInterval(30, 50);
    expect(small.width).toBeGreaterThan(large.width);
  });

  it("narrower interval for larger samples", () => {
    const ci = wilsonInterval(50, 100);
    expect(ci.width).toBeLessThan(0.20);
  });

  it("lower <= upper always", () => {
    for (let s = 0; s <= 20; s++) {
      const ci = wilsonInterval(s, 20);
      expect(ci.lower).toBeLessThanOrEqual(ci.upper);
    }
  });

  it("bounds are within [0, 1]", () => {
    for (let s = 0; s <= 10; s++) {
      const ci = wilsonInterval(s, 10);
      expect(ci.lower).toBeGreaterThanOrEqual(0);
      expect(ci.upper).toBeLessThanOrEqual(1);
    }
  });
});

// ── matchesReferenceClass (fallback hierarchy) ───────────────────────────

describe("matchesReferenceClass", () => {
  const target: ReferenceClass = {
    claimType: "percentage_threshold",
    category: "market",
    timeframeBucket: "short",
    magnitudeBucket: "medium",
    direction: "down",
  };

  it("exact match requires all 5 dimensions", () => {
    expect(matchesReferenceClass(target, target, "exact")).toBe(true);
    expect(matchesReferenceClass({ ...target, direction: "up" }, target, "exact")).toBe(false);
    expect(matchesReferenceClass({ ...target, magnitudeBucket: "large" }, target, "exact")).toBe(false);
    expect(matchesReferenceClass({ ...target, timeframeBucket: "long" }, target, "exact")).toBe(false);
    expect(matchesReferenceClass({ ...target, category: "geopolitical" }, target, "exact")).toBe(false);
    expect(matchesReferenceClass({ ...target, claimType: "price_level" }, target, "exact")).toBe(false);
  });

  it("no_magnitude ignores magnitude bucket", () => {
    expect(matchesReferenceClass({ ...target, magnitudeBucket: "large" }, target, "no_magnitude")).toBe(true);
    expect(matchesReferenceClass({ ...target, magnitudeBucket: null }, target, "no_magnitude")).toBe(true);
    // But direction must still match
    expect(matchesReferenceClass({ ...target, direction: "up" }, target, "no_magnitude")).toBe(false);
  });

  it("no_direction ignores direction and magnitude", () => {
    expect(matchesReferenceClass({ ...target, direction: "up", magnitudeBucket: "large" }, target, "no_direction")).toBe(true);
    // But timeframe must match
    expect(matchesReferenceClass({ ...target, timeframeBucket: "long" }, target, "no_direction")).toBe(false);
  });

  it("broad matches only claimType + category", () => {
    expect(matchesReferenceClass({ ...target, timeframeBucket: "long", direction: "up", magnitudeBucket: "large" }, target, "broad")).toBe(true);
    expect(matchesReferenceClass({ ...target, category: "geopolitical" }, target, "broad")).toBe(false);
    expect(matchesReferenceClass({ ...target, claimType: "binary_event" }, target, "broad")).toBe(false);
  });

  it("category matches only category", () => {
    expect(matchesReferenceClass({ ...target, claimType: "binary_event", timeframeBucket: "long", direction: "up" }, target, "category")).toBe(true);
    expect(matchesReferenceClass({ ...target, category: "geopolitical" }, target, "category")).toBe(false);
  });
});
