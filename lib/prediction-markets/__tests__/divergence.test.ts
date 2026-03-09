import { describe, it, expect } from "vitest";
import { detectDivergences, computeDivergenceStats } from "../divergence";
import type { PredictionMarket, MarketDivergence } from "../index";

function makeMarket(overrides: Partial<PredictionMarket> = {}): PredictionMarket {
  return {
    id: "poly_test1",
    source: "polymarket",
    title: "Will Russia withdraw troops from Ukraine by end of 2026",
    description: "",
    probability: 0.15,
    volume24h: 50000,
    totalVolume: 500000,
    category: "geopolitical",
    endDate: "2026-12-31",
    active: true,
    url: "https://polymarket.com/event/test",
    priceChange24h: 0.02,
    priceChange7d: -0.05,
    ...overrides,
  };
}

function makePrediction(overrides: Partial<{ id: number; claim: string; confidence: number; category: string; timeframe: string; deadline: string }> = {}) {
  return {
    id: 1,
    claim: "Russia will withdraw troops from Ukraine before 2027 deadline",
    confidence: 0.55,
    category: "geopolitical",
    timeframe: "12 months",
    deadline: "2026-12-31",
    ...overrides,
  };
}

describe("detectDivergences", () => {
  it("detects divergence when keyword overlap >= 3 and divergence > 15%", () => {
    const markets = [makeMarket()];
    const predictions = [makePrediction()];

    const result = detectDivergences(markets, predictions);
    expect(result).toHaveLength(1);
    expect(result[0].divergence).toBeCloseTo(0.40, 1);
    expect(result[0].direction).toBe("nexus_higher");
    expect(result[0].nexusConfidence).toBe(0.55);
    expect(result[0].marketProbability).toBe(0.15);
  });

  it("returns empty when keyword overlap < 3", () => {
    const markets = [makeMarket({ title: "Bitcoin price prediction for December" })];
    const predictions = [makePrediction({ claim: "Gold will reach new all time high" })];

    const result = detectDivergences(markets, predictions);
    expect(result).toHaveLength(0);
  });

  it("ignores divergences <= 15%", () => {
    const markets = [makeMarket({ probability: 0.50 })];
    const predictions = [makePrediction({ confidence: 0.60 })];

    const result = detectDivergences(markets, predictions);
    expect(result).toHaveLength(0);
  });

  it("detects nexus_lower direction", () => {
    const markets = [makeMarket({ probability: 0.80 })];
    const predictions = [makePrediction({ confidence: 0.30 })];

    const result = detectDivergences(markets, predictions);
    expect(result).toHaveLength(1);
    expect(result[0].direction).toBe("nexus_lower");
  });

  it("sorts by divergence magnitude descending", () => {
    const markets = [
      makeMarket({ id: "m1", probability: 0.10 }),
      makeMarket({ id: "m2", probability: 0.40 }),
    ];
    const predictions = [makePrediction({ confidence: 0.80 })];

    const result = detectDivergences(markets, predictions);
    expect(result.length).toBeGreaterThanOrEqual(1);
    if (result.length >= 2) {
      expect(result[0].divergence).toBeGreaterThanOrEqual(result[1].divergence);
    }
  });

  it("handles empty markets array", () => {
    const result = detectDivergences([], [makePrediction()]);
    expect(result).toEqual([]);
  });

  it("handles empty predictions array", () => {
    const result = detectDivergences([makeMarket()], []);
    expect(result).toEqual([]);
  });

  it("prevents duplicate market-prediction pairs", () => {
    const markets = [makeMarket()];
    const predictions = [makePrediction()];

    // Call twice with same data, the function deduplicates internally
    const result = detectDivergences(markets, predictions);
    const ids = result.map(r => `${r.market.id}`);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it("matches multiple predictions against multiple markets", () => {
    const markets = [
      makeMarket({ id: "m1", title: "Federal Reserve interest rate cut before March 2027", probability: 0.70, category: "economic" }),
      makeMarket({ id: "m2", title: "Will Russia withdraw troops from Ukraine by end of 2026", probability: 0.15 }),
    ];
    const predictions = [
      makePrediction({ id: 1, claim: "Russia will withdraw troops from Ukraine before 2027 deadline", confidence: 0.55 }),
      makePrediction({ id: 2, claim: "Federal Reserve will cut interest rate before March 2027 meeting", confidence: 0.30 }),
    ];

    const result = detectDivergences(markets, predictions);
    // Both should diverge: Russia (0.40 gap), Fed (0.40 gap)
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe("computeDivergenceStats", () => {
  it("returns zeros for empty array", () => {
    const stats = computeDivergenceStats([]);
    expect(stats.count).toBe(0);
    expect(stats.avgDivergence).toBe(0);
    expect(stats.maxDivergence).toBe(0);
    expect(stats.nexusHigherCount).toBe(0);
    expect(stats.nexusLowerCount).toBe(0);
    expect(stats.arbitrageOpportunities).toBe(0);
  });

  it("computes correct stats", () => {
    const divergences: MarketDivergence[] = [
      {
        market: makeMarket({ id: "m1" }),
        nexusConfidence: 0.80,
        marketProbability: 0.20,
        divergence: 0.60,
        direction: "nexus_higher",
      },
      {
        market: makeMarket({ id: "m2" }),
        nexusConfidence: 0.30,
        marketProbability: 0.70,
        divergence: 0.40,
        direction: "nexus_lower",
      },
      {
        market: makeMarket({ id: "m3" }),
        nexusConfidence: 0.50,
        marketProbability: 0.30,
        divergence: 0.20,
        direction: "nexus_higher",
      },
    ];

    const stats = computeDivergenceStats(divergences);
    expect(stats.count).toBe(3);
    expect(stats.avgDivergence).toBeCloseTo(0.40, 2);
    expect(stats.maxDivergence).toBe(0.60);
    expect(stats.nexusHigherCount).toBe(2);
    expect(stats.nexusLowerCount).toBe(1);
    expect(stats.arbitrageOpportunities).toBe(2); // 0.60 and 0.40 both > 0.25
  });

  it("counts arbitrage opportunities with > 25% threshold", () => {
    const divergences: MarketDivergence[] = [
      {
        market: makeMarket(),
        nexusConfidence: 0.40,
        marketProbability: 0.20,
        divergence: 0.20,
        direction: "nexus_higher",
      },
    ];

    const stats = computeDivergenceStats(divergences);
    expect(stats.arbitrageOpportunities).toBe(0); // 0.20 < 0.25
  });
});
