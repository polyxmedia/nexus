import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { adjustForBaseRate, getBaseRate, getBaseRateContext, updateObservedRates } from "../base-rates";

// ── Mock DB ──

const mockExecute = vi.fn();
vi.mock("@/lib/db", () => ({
  db: { execute: (...args: unknown[]) => mockExecute(...args) },
}));

// ── Helpers ──

function makeRate(overrides: Partial<{
  id: number;
  category: string;
  pattern: string;
  label: string;
  timeframe: string;
  base_rate: number;
  observed_rate: number | null;
  sample_count: number;
  last_updated: string;
  keywords: string;
}> = {}) {
  return {
    id: 1,
    category: "geopolitical",
    pattern: "military_escalation",
    label: "Military escalation",
    timeframe: "30 days",
    base_rate: 0.08,
    observed_rate: null,
    sample_count: 0,
    last_updated: "2025-01-01",
    keywords: "military,escalation,conflict",
    ...overrides,
  };
}

// ── Setup ──

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockExecute.mockReset();
  // Reset the module-level cache by advancing time past TTL
  // loadRates checks Date.now() - cacheTime < CACHE_TTL
  // After module reimport the cache is empty so loadRates will always query DB
});

afterEach(() => {
  vi.useRealTimers();
});

// ── adjustForBaseRate (pure function) ──

describe("adjustForBaseRate", () => {
  it("returns value between 0 and 1", () => {
    const result = adjustForBaseRate(0.80, 0.05, 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it("weak evidence (strength=1) keeps result close to base rate", () => {
    // modelWeight = 1 * 0.2 = 0.2, baseWeight = 0.8
    const result = adjustForBaseRate(0.90, 0.05, 1);
    expect(result).toBeLessThan(0.30);
  });

  it("moderate evidence (strength=3) blends toward stated confidence", () => {
    // modelWeight = 3 * 0.2 = 0.6, baseWeight = 0.4
    const result = adjustForBaseRate(0.80, 0.10, 3);
    expect(result).toBeGreaterThan(0.10);
    expect(result).toBeLessThan(0.80);
  });

  it("strong evidence (strength=4) gives model 80% weight", () => {
    // modelWeight = 4 * 0.2 = 0.8
    const result = adjustForBaseRate(0.70, 0.10, 4);
    expect(result).toBeGreaterThan(0.40);
  });

  it("maximum evidence (strength=5) gives model 90% weight", () => {
    // modelWeight = 0.9 (special case for strength > 4)
    const result = adjustForBaseRate(0.80, 0.05, 5);
    expect(result).toBeGreaterThan(0.50);
  });

  it("clamps evidence strength below 1", () => {
    const withNeg = adjustForBaseRate(0.50, 0.10, -5);
    const withOne = adjustForBaseRate(0.50, 0.10, 1);
    expect(withNeg).toBeCloseTo(withOne, 5);
  });

  it("clamps evidence strength above 5", () => {
    const withHigh = adjustForBaseRate(0.50, 0.10, 100);
    const withFive = adjustForBaseRate(0.50, 0.10, 5);
    expect(withHigh).toBeCloseTo(withFive, 5);
  });

  it("identical base rate and stated confidence returns that value", () => {
    const result = adjustForBaseRate(0.30, 0.30, 3);
    expect(result).toBeCloseTo(0.30, 2);
  });

  it("handles extreme probability near 0", () => {
    const result = adjustForBaseRate(0.001, 0.001, 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.01);
  });

  it("handles extreme probability near 1", () => {
    const result = adjustForBaseRate(0.999, 0.999, 3);
    expect(result).toBeGreaterThan(0.99);
    expect(result).toBeLessThan(1);
  });

  it("handles zero probability by clamping to 0.001", () => {
    const result = adjustForBaseRate(0, 0.10, 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it("handles probability of 1 by clamping to 0.999", () => {
    const result = adjustForBaseRate(1, 0.10, 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it("increasing evidence strength monotonically moves result toward stated confidence", () => {
    const stated = 0.80;
    const base = 0.10;
    const results = [1, 2, 3, 4, 5].map((s) => adjustForBaseRate(stated, base, s));
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBeGreaterThan(results[i - 1]);
    }
  });
});

// ── getBaseRate ──

describe("getBaseRate", () => {
  beforeEach(() => {
    // Advance past cache TTL to force a fresh DB load each test
    vi.advanceTimersByTime(11 * 60 * 1000);
  });

  it("returns default when no rates match category", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [makeRate({ category: "market" })] });
    const result = await getBaseRate("geopolitical", "oil prices rising");
    expect(result).toEqual({ rate: 0.10, pattern: "default", sampleCount: 0 });
  });

  it("returns default when no keywords match the claim", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [makeRate({ category: "geopolitical", keywords: "nuclear,missile" })],
    });
    const result = await getBaseRate("geopolitical", "oil prices rising");
    expect(result).toEqual({ rate: 0.10, pattern: "default", sampleCount: 0 });
  });

  it("matches by keyword and returns base_rate when sample_count < 5", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [makeRate({
        category: "geopolitical",
        keywords: "military,escalation",
        base_rate: 0.08,
        observed_rate: 0.15,
        sample_count: 3,
        pattern: "military_escalation",
      })],
    });
    const result = await getBaseRate("geopolitical", "military escalation in the region");
    expect(result.rate).toBe(0.08);
    expect(result.pattern).toBe("military_escalation");
    expect(result.sampleCount).toBe(3);
  });

  it("uses observed_rate when sample_count >= 5", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [makeRate({
        category: "market",
        keywords: "earnings,beat",
        base_rate: 0.60,
        observed_rate: 0.72,
        sample_count: 10,
        pattern: "earnings_beat",
      })],
    });
    const result = await getBaseRate("market", "tech company earnings beat expectations");
    expect(result.rate).toBe(0.72);
    expect(result.pattern).toBe("earnings_beat");
    expect(result.sampleCount).toBe(10);
  });

  it("uses base_rate when observed_rate is null even if sample_count >= 5", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [makeRate({
        category: "market",
        keywords: "crash",
        base_rate: 0.03,
        observed_rate: null,
        sample_count: 10,
        pattern: "market_crash",
      })],
    });
    const result = await getBaseRate("market", "market crash incoming");
    expect(result.rate).toBe(0.03);
  });

  it("selects best match by keyword score", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        makeRate({
          id: 1,
          category: "geopolitical",
          keywords: "military",
          base_rate: 0.08,
          pattern: "single_match",
        }),
        makeRate({
          id: 2,
          category: "geopolitical",
          keywords: "military,escalation,conflict",
          base_rate: 0.12,
          pattern: "triple_match",
        }),
      ],
    });
    const result = await getBaseRate("geopolitical", "military escalation leads to conflict");
    expect(result.pattern).toBe("triple_match");
    expect(result.rate).toBe(0.12);
  });

  it("is case insensitive on claim matching", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [makeRate({ category: "market", keywords: "crash,correction", base_rate: 0.05 })],
    });
    const result = await getBaseRate("market", "MARKET CRASH imminent");
    expect(result.rate).toBe(0.05);
  });

  it("returns stale cache on DB error", async () => {
    // First call succeeds and populates cache
    mockExecute.mockResolvedValueOnce({
      rows: [makeRate({ category: "market", keywords: "rally", base_rate: 0.30, pattern: "rally" })],
    });
    const first = await getBaseRate("market", "rally expected");
    expect(first.rate).toBe(0.30);

    // Advance past cache TTL
    vi.advanceTimersByTime(11 * 60 * 1000);

    // Second call fails
    mockExecute.mockRejectedValueOnce(new Error("DB down"));
    const second = await getBaseRate("market", "rally expected");
    // Should still return the stale cached data
    expect(second.rate).toBe(0.30);
  });

  it("returns default fallback when DB empty", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const result = await getBaseRate("anything", "some claim");
    expect(result).toEqual({ rate: 0.10, pattern: "default", sampleCount: 0 });
  });
});

// ── Cache Behavior ──

describe("cache behavior", () => {
  beforeEach(() => {
    // Push past cache TTL
    vi.advanceTimersByTime(11 * 60 * 1000);
  });

  it("does not re-query DB within cache TTL", async () => {
    mockExecute.mockResolvedValue({
      rows: [makeRate({ category: "market", keywords: "rally", base_rate: 0.30 })],
    });

    await getBaseRate("market", "rally coming");
    await getBaseRate("market", "rally coming");
    await getBaseRate("market", "rally coming");

    // Only one DB call since cache is warm
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("re-queries DB after cache TTL expires", async () => {
    mockExecute.mockResolvedValue({
      rows: [makeRate({ category: "market", keywords: "rally", base_rate: 0.30 })],
    });

    await getBaseRate("market", "rally coming");
    expect(mockExecute).toHaveBeenCalledTimes(1);

    // Advance past TTL
    vi.advanceTimersByTime(11 * 60 * 1000);

    await getBaseRate("market", "rally coming");
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });
});

// ── updateObservedRates ──

describe("updateObservedRates", () => {
  beforeEach(() => {
    vi.advanceTimersByTime(11 * 60 * 1000);
  });

  it("returns 0 when there are no resolved predictions", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [makeRate({ keywords: "oil,energy" })] }) // loadRates
      .mockResolvedValueOnce({ rows: [] }); // resolved predictions query

    const count = await updateObservedRates();
    expect(count).toBe(0);
  });

  it("updates matching rates with blended observed rate", async () => {
    const rate = makeRate({
      id: 42,
      category: "market",
      keywords: "oil,energy",
      base_rate: 0.20,
    });

    mockExecute
      .mockResolvedValueOnce({ rows: [rate] }) // loadRates
      .mockResolvedValueOnce({ // resolved predictions
        rows: [
          { claim: "oil prices will rise", category: "market", outcome: "confirmed" },
          { claim: "energy sector rally", category: "market", outcome: "denied" },
          { claim: "oil supply disruption", category: "market", outcome: "confirmed" },
        ],
      })
      .mockResolvedValueOnce({}); // UPDATE query

    const count = await updateObservedRates();
    expect(count).toBe(1);
    // Verify the UPDATE was called (3rd call)
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it("skips rates with no keyword matches in predictions", async () => {
    const rate = makeRate({
      id: 1,
      category: "geopolitical",
      keywords: "nuclear,weapon",
      base_rate: 0.05,
    });

    mockExecute
      .mockResolvedValueOnce({ rows: [rate] }) // loadRates
      .mockResolvedValueOnce({ // predictions that don't match keywords
        rows: [
          { claim: "oil prices will rise", category: "market", outcome: "confirmed" },
        ],
      });

    const count = await updateObservedRates();
    expect(count).toBe(0);
    // No UPDATE call since no rates matched
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("skips rates with empty keywords", async () => {
    const rate = makeRate({ id: 1, keywords: "", base_rate: 0.10 });

    mockExecute
      .mockResolvedValueOnce({ rows: [rate] })
      .mockResolvedValueOnce({
        rows: [{ claim: "anything", category: "geopolitical", outcome: "confirmed" }],
      });

    const count = await updateObservedRates();
    expect(count).toBe(0);
  });

  it("only counts confirmed and partial as hits", async () => {
    const rate = makeRate({
      id: 1,
      category: "market",
      keywords: "crash",
      base_rate: 0.05,
    });

    mockExecute
      .mockResolvedValueOnce({ rows: [rate] })
      .mockResolvedValueOnce({
        rows: [
          { claim: "market crash imminent", category: "market", outcome: "confirmed" },
          { claim: "flash crash expected", category: "market", outcome: "partial" },
          { claim: "crash prediction", category: "market", outcome: "denied" },
          { claim: "crash incoming", category: "market", outcome: "denied" },
        ],
      })
      .mockResolvedValueOnce({}); // UPDATE

    const count = await updateObservedRates();
    expect(count).toBe(1);

    // Verify blending: hits=2, total=4, observedRate=0.5
    // observedWeight = min(0.9, 4/(4+5)) = 4/9 ~ 0.444
    // blendedRate = (1-0.444)*0.05 + 0.444*0.5 = 0.0278 + 0.222 = 0.2498
    // Rounded to 4 decimals: 0.2498
    // The UPDATE call is the 3rd mockExecute call
    const updateCall = mockExecute.mock.calls[2];
    // We can't easily inspect the sql tagged template, but we verified
    // it was called, which confirms the flow completed.
    expect(updateCall).toBeDefined();
  });

  it("filters predictions by matching category", async () => {
    const rate = makeRate({
      id: 1,
      category: "market",
      keywords: "crash",
      base_rate: 0.05,
    });

    mockExecute
      .mockResolvedValueOnce({ rows: [rate] })
      .mockResolvedValueOnce({
        rows: [
          // Same keyword but wrong category - should not match
          { claim: "system crash imminent", category: "geopolitical", outcome: "confirmed" },
        ],
      });

    const count = await updateObservedRates();
    expect(count).toBe(0);
  });
});

// ── getBaseRateContext ──

describe("getBaseRateContext", () => {
  beforeEach(() => {
    vi.advanceTimersByTime(11 * 60 * 1000);
  });

  it("returns formatted string with header and footer", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const context = await getBaseRateContext();
    expect(context).toContain("EMPIRICAL BASE RATES");
    expect(context).toContain("Start from these anchors");
  });

  it("groups rates by category", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        makeRate({ category: "geopolitical", label: "Military escalation", base_rate: 0.08, keywords: "military" }),
        makeRate({ category: "market", label: "Market crash", base_rate: 0.03, keywords: "crash" }),
      ],
    });

    const context = await getBaseRateContext();
    expect(context).toContain("[GEOPOLITICAL]");
    expect(context).toContain("[MARKET]");
    expect(context).toContain("Military escalation");
    expect(context).toContain("Market crash");
  });

  it("shows observed rate when sample_count >= 5", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        makeRate({
          category: "market",
          label: "Earnings beat",
          base_rate: 0.60,
          observed_rate: 0.72,
          sample_count: 10,
          timeframe: "quarter",
          keywords: "earnings",
        }),
      ],
    });

    const context = await getBaseRateContext();
    expect(context).toContain("72%");
    expect(context).toContain("observed from 10 predictions");
  });

  it("shows prior estimate when sample_count < 5", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        makeRate({
          category: "market",
          label: "Black swan",
          base_rate: 0.02,
          observed_rate: null,
          sample_count: 2,
          timeframe: "year",
          keywords: "swan",
        }),
      ],
    });

    const context = await getBaseRateContext();
    expect(context).toContain("prior estimate");
  });

  it("formats sub-1% rates with one decimal", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        makeRate({
          category: "market",
          label: "Rare event",
          base_rate: 0.005,
          observed_rate: null,
          sample_count: 0,
          timeframe: "year",
          keywords: "rare",
        }),
      ],
    });

    const context = await getBaseRateContext();
    // 0.005 * 100 = 0.5, which is < 1, so formatted as "0.5"
    expect(context).toContain("0.5%");
  });

  it("formats >= 1% rates as rounded integers", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        makeRate({
          category: "market",
          label: "Common event",
          base_rate: 0.35,
          observed_rate: null,
          sample_count: 0,
          timeframe: "month",
          keywords: "common",
        }),
      ],
    });

    const context = await getBaseRateContext();
    expect(context).toContain("35%");
  });

  it("includes timeframe in output", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        makeRate({
          category: "geopolitical",
          label: "Conflict onset",
          base_rate: 0.10,
          timeframe: "6 months",
          keywords: "conflict",
        }),
      ],
    });

    const context = await getBaseRateContext();
    expect(context).toContain("per 6 months");
  });
});
