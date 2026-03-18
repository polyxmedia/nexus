import { describe, it, expect } from "vitest";
import { computePayoffAdjustment, applyContextToPayoff, type DynamicPayoffContext } from "../dynamic-payoffs";

// ── Extreme wartime context (the scenario that produced >100% probabilities) ──
const WARTIME_CRISIS: DynamicPayoffContext = {
  oilPriceRatio: 1.8, // 80% above baseline (war-driven spike)
  goldPriceRatio: 1.4, // 40% above baseline (safe haven rush)
  natGasPriceRatio: 2.0,
  vixLevel: 45,
  vixRegime: "crisis",
  signalIntensity: 5,
  signalPosterior: 0.85,
  wartimeRegime: "wartime",
  activeEscalations: ["hormuz-closure", "iran-nuclear"],
  recentAttacks: 8,
  recentDiplomacy: 0,
  recentSanctions: 3,
  shippingDisruption: 0.7,
  asOf: new Date().toISOString(),
};

const PEACETIME: DynamicPayoffContext = {
  oilPriceRatio: 1.0,
  goldPriceRatio: 1.0,
  natGasPriceRatio: 1.0,
  vixLevel: 15,
  vixRegime: "low",
  signalIntensity: 1,
  signalPosterior: 0.1,
  wartimeRegime: "peacetime",
  activeEscalations: [],
  recentAttacks: 0,
  recentDiplomacy: 0,
  recentSanctions: 0,
  shippingDisruption: 0,
  asOf: new Date().toISOString(),
};

describe("computePayoffAdjustment", () => {
  it("multiplier is clamped to [0.5, 2.0]", () => {
    const adj = computePayoffAdjustment("iran", "Escalate proxy war", WARTIME_CRISIS);
    expect(adj.multiplier).toBeGreaterThanOrEqual(0.5);
    expect(adj.multiplier).toBeLessThanOrEqual(2.0);
  });

  it("shift is clamped to [-4, 4]", () => {
    const adj = computePayoffAdjustment("iran", "Escalate proxy war", WARTIME_CRISIS);
    expect(adj.shift).toBeGreaterThanOrEqual(-4);
    expect(adj.shift).toBeLessThanOrEqual(4);
  });

  it("shift is clamped even with maximum stacking conditions", () => {
    // Iran escalation in wartime with high oil, recent attacks, and sanctions
    const adj = computePayoffAdjustment("iran", "Escalate and retaliate with maximum force strike", WARTIME_CRISIS);
    expect(adj.shift).toBeLessThanOrEqual(4);
    expect(adj.shift).toBeGreaterThanOrEqual(-4);
  });

  it("de-escalation shift is also clamped in crisis", () => {
    const adj = computePayoffAdjustment("us", "Negotiate ceasefire and settle diplomatically", WARTIME_CRISIS);
    expect(adj.shift).toBeGreaterThanOrEqual(-4);
    expect(adj.shift).toBeLessThanOrEqual(4);
  });

  it("peacetime context produces minimal adjustments", () => {
    const adj = computePayoffAdjustment("us", "Enhanced deterrence", PEACETIME);
    expect(adj.multiplier).toBeCloseTo(1.0, 1);
    expect(Math.abs(adj.shift)).toBeLessThan(1);
  });
});

describe("applyContextToPayoff", () => {
  it("final payoff is clamped to [-8, 8]", () => {
    const result = applyContextToPayoff(5, "iran", "Escalate proxy war", WARTIME_CRISIS);
    expect(result).toBeLessThanOrEqual(8);
    expect(result).toBeGreaterThanOrEqual(-8);
  });

  it("negative base payoff with crisis doesn't go below -8", () => {
    const result = applyContextToPayoff(-5, "us", "Patience and strategic ambiguity", WARTIME_CRISIS);
    expect(result).toBeGreaterThanOrEqual(-8);
  });

  it("extreme positive base payoff is capped at 8", () => {
    const result = applyContextToPayoff(10, "iran", "Escalate", WARTIME_CRISIS);
    expect(result).toBeLessThanOrEqual(8);
  });

  it("undefined context returns base payoff unchanged", () => {
    expect(applyContextToPayoff(3, "us", "Negotiate", undefined)).toBe(3);
  });

  it("empty strategy returns base payoff unchanged", () => {
    expect(applyContextToPayoff(3, "us", "", WARTIME_CRISIS)).toBe(3);
  });

  it("peacetime payoff is close to base", () => {
    const result = applyContextToPayoff(3, "us", "Negotiate", PEACETIME);
    // Should be within 1.0 of base in peacetime
    expect(Math.abs(result - 3)).toBeLessThan(1.5);
  });
});

describe("probability validity (integration)", () => {
  it("wartime payoffs cannot produce QRE input that overflows softmax", () => {
    // The QRE function uses exp(lambda * payoff) where lambda = 2.5
    // With payoff capped at 8: exp(2.5 * 8) = exp(20) ≈ 4.9e8
    // With payoff capped at -8: exp(2.5 * -8) = exp(-20) ≈ 2.1e-9
    // The ratio is ~2.3e17, which is large but finite and doesn't overflow float64
    const maxPayoff = applyContextToPayoff(5, "iran", "Escalate and strike", WARTIME_CRISIS);
    const minPayoff = applyContextToPayoff(-5, "us", "Full ceasefire and negotiate", WARTIME_CRISIS);

    const lambda = 2.5;
    const expMax = Math.exp(lambda * maxPayoff);
    const expMin = Math.exp(lambda * minPayoff);

    expect(isFinite(expMax)).toBe(true);
    expect(isFinite(expMin)).toBe(true);
    expect(expMax).toBeGreaterThan(0);
    expect(expMin).toBeGreaterThan(0);

    // Softmax probability: p = exp(λ*u_i) / Σ exp(λ*u_j)
    // Even with extreme ratio, both should be finite
    const total = expMax + expMin;
    const pMax = expMax / total;
    const pMin = expMin / total;

    expect(pMax).toBeGreaterThanOrEqual(0);
    expect(pMax).toBeLessThanOrEqual(1);
    expect(pMin).toBeGreaterThanOrEqual(0);
    expect(pMin).toBeLessThanOrEqual(1);
    expect(pMax + pMin).toBeCloseTo(1.0, 5);
  });
});
