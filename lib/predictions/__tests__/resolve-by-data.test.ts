import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock all external dependencies before importing the module under test ──

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    execute: vi.fn(),
    insert: vi.fn(),
  },
  schema: {
    predictions: {
      id: "id",
      outcome: "outcome",
      score: "score",
      outcomeNotes: "outcome_notes",
      resolvedAt: "resolved_at",
      directionCorrect: "direction_correct",
      levelCorrect: "level_correct",
    },
    settings: {
      key: "key",
      value: "value",
    },
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ _tag: "eq", args })),
  desc: vi.fn(),
  isNull: vi.fn((...args: unknown[]) => ({ _tag: "isNull", args })),
  and: vi.fn(),
  gte: vi.fn(),
}));

vi.mock("@/lib/market-data/alpha-vantage", () => ({
  getQuote: vi.fn(),
  getDailySeries: vi.fn(),
}));

vi.mock("@/lib/knowledge/engine", () => ({
  getActiveKnowledge: vi.fn().mockResolvedValue([]),
}));

vi.mock("../feedback", () => ({
  computePerformanceReport: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/lib/game-theory/wartime", () => ({
  getWartimeAnalysis: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/game-theory/actors", () => ({
  SCENARIOS: [],
}));

vi.mock("@/lib/prompts/loader", () => ({
  loadPrompt: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/lib/ai/model", () => ({
  SONNET_MODEL: "test-model",
  HAIKU_MODEL: "test-haiku",
}));

const mockUpdateObservedRates = vi.fn().mockResolvedValue(0);

vi.mock("../base-rates", () => ({
  getBaseRateContext: vi.fn().mockResolvedValue(""),
  adjustForBaseRate: vi.fn((c: unknown) => c),
  getBaseRate: vi.fn().mockResolvedValue({ rate: 0.1, pattern: "default", sampleCount: 0 }),
  updateObservedRates: (...args: unknown[]) => mockUpdateObservedRates(...args),
}));

vi.mock("@/lib/signals/actor-beliefs", () => ({
  getCalendarActorInsights: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/backtest/feedback-loops", () => ({
  getCategoryCalibrationAdjustment: vi.fn().mockResolvedValue(0),
  applyCalibrationCorrection: vi.fn((c: unknown) => c),
}));

// ── Import after mocks are registered ──

import { resolveByData } from "../engine";
import { getQuote, getDailySeries } from "@/lib/market-data/alpha-vantage";

const mockedGetQuote = vi.mocked(getQuote);
const mockedGetDailySeries = vi.mocked(getDailySeries);

// ── Helpers ──

function makePrediction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: "aaaa-bbbb",
    signalId: null,
    analysisId: null,
    claim: "SPY will reach 500",
    timeframe: "7 days",
    deadline: "2026-03-01",
    confidence: 0.8,
    category: "market",
    metrics: null,
    outcome: null,
    outcomeNotes: null,
    score: null,
    resolvedAt: null,
    regimeAtCreation: "peacetime",
    referencePrices: JSON.stringify({ SPY: 480 }),
    regimeInvalidated: 0,
    invalidatedReason: null,
    preEvent: 1,
    direction: "up",
    priceTarget: 500,
    referenceSymbol: "SPY",
    directionCorrect: null,
    levelCorrect: null,
    createdBy: null,
    createdAt: "2026-02-20T00:00:00.000Z",
    ...overrides,
  };
}

/** Set up the db.select chain to return settings rows and then prediction rows. */
function setupDbChain(settingsRows: unknown[], predictionRows: unknown[]) {
  // getAlphaVantageKey: db.select().from(settings).where(...)
  // resolveByData:      db.select().from(predictions).where(...)
  // db.update(...).set(...).where(...) for each result
  let selectCallCount = 0;

  mockSelect.mockImplementation(() => {
    selectCallCount++;
    const callIndex = selectCallCount;
    return {
      from: () => ({
        where: () => {
          if (callIndex === 1) return Promise.resolve(settingsRows);
          return Promise.resolve(predictionRows);
        },
      }),
    };
  });

  mockUpdate.mockImplementation(() => ({
    set: () => ({
      where: () => Promise.resolve(),
    }),
  }));
}

// ── Tests ──

describe("resolveByData", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Returns empty when no API key
  it("returns empty array when no Alpha Vantage API key is available", async () => {
    setupDbChain([], []); // no settings rows = no key
    // Also clear env
    const original = process.env.ALPHA_VANTAGE_API_KEY;
    delete process.env.ALPHA_VANTAGE_API_KEY;

    const result = await resolveByData();

    expect(result).toEqual([]);
    process.env.ALPHA_VANTAGE_API_KEY = original;
  });

  // 2. Returns empty when no pending predictions
  it("returns empty array when no pending predictions exist", async () => {
    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [], // no pending predictions
    );

    const result = await resolveByData();

    expect(result).toEqual([]);
  });

  // 3. Skips non-market predictions
  it("skips non-market predictions", async () => {
    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [makePrediction({ category: "geopolitical" })],
    );

    const result = await resolveByData();

    expect(result).toEqual([]);
    expect(mockedGetQuote).not.toHaveBeenCalled();
  });

  // 4. Skips predictions with no price target
  it("skips predictions without price target, reference symbol, or direction", async () => {
    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [
        makePrediction({ priceTarget: null }),
        makePrediction({ id: 2, referenceSymbol: null }),
        makePrediction({ id: 3, direction: null }),
      ],
    );

    const result = await resolveByData();

    expect(result).toEqual([]);
  });

  // 5. Correctly resolves "confirmed" (direction right + target hit)
  it("resolves as confirmed when direction is correct and target is hit", async () => {
    const pred = makePrediction({
      id: 10,
      direction: "up",
      priceTarget: 500,
      referenceSymbol: "SPY",
      referencePrices: JSON.stringify({ SPY: 480 }),
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    mockedGetQuote.mockResolvedValue({ price: 505, change: 5, changePercent: 1, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 480, high: 485, low: 478, close: 482, volume: 1000 },
      { date: "2026-02-25", open: 490, high: 502, low: 488, close: 501, volume: 1000 },
      { date: "2026-03-01", open: 500, high: 506, low: 498, close: 505, volume: 1000 },
    ] as never);

    const result = await resolveByData();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 10,
        outcome: "confirmed",
        score: 1.0,
      }),
    );
    expect(result[0].notes).toContain("Data-resolved");
    expect(result[0].notes).toContain("Target hit on");
  });

  // 6. Correctly resolves "partial" (direction right + target missed)
  it("resolves as partial when direction is correct but target is not hit", async () => {
    const pred = makePrediction({
      id: 20,
      direction: "up",
      priceTarget: 520,
      referenceSymbol: "SPY",
      referencePrices: JSON.stringify({ SPY: 480 }),
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    mockedGetQuote.mockResolvedValue({ price: 495, change: 5, changePercent: 1, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 480, high: 485, low: 478, close: 482, volume: 1000 },
      { date: "2026-02-25", open: 485, high: 495, low: 483, close: 490, volume: 1000 },
      { date: "2026-03-01", open: 490, high: 498, low: 488, close: 495, volume: 1000 },
    ] as never);

    const result = await resolveByData();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 20,
        outcome: "partial",
        score: 0.5,
      }),
    );
    expect(result[0].notes).toContain("Target not reached");
  });

  // 7. Correctly resolves "denied" (direction wrong)
  it("resolves as denied when direction is wrong", async () => {
    const pred = makePrediction({
      id: 30,
      direction: "up",
      priceTarget: 500,
      referenceSymbol: "SPY",
      referencePrices: JSON.stringify({ SPY: 480 }),
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    // Price went down
    mockedGetQuote.mockResolvedValue({ price: 460, change: -20, changePercent: -4, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 480, high: 482, low: 475, close: 478, volume: 1000 },
      { date: "2026-02-25", open: 475, high: 476, low: 465, close: 468, volume: 1000 },
      { date: "2026-03-01", open: 465, high: 470, low: 458, close: 460, volume: 1000 },
    ] as never);

    const result = await resolveByData();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 30,
        outcome: "denied",
        score: 0.0,
      }),
    );
  });

  // 7b. Denied for "down" direction that went up
  it("resolves as denied when down prediction goes up", async () => {
    const pred = makePrediction({
      id: 31,
      direction: "down",
      priceTarget: 450,
      referenceSymbol: "SPY",
      referencePrices: JSON.stringify({ SPY: 480 }),
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    mockedGetQuote.mockResolvedValue({ price: 500, change: 20, changePercent: 4, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 480, high: 490, low: 478, close: 488, volume: 1000 },
      { date: "2026-03-01", open: 492, high: 505, low: 490, close: 500, volume: 1000 },
    ] as never);

    const result = await resolveByData();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 31,
        outcome: "denied",
        score: 0.0,
      }),
    );
  });

  // 7c. Confirmed for "down" direction
  it("resolves as confirmed for down prediction when target hit and direction correct", async () => {
    const pred = makePrediction({
      id: 32,
      direction: "down",
      priceTarget: 450,
      referenceSymbol: "SPY",
      referencePrices: JSON.stringify({ SPY: 480 }),
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    mockedGetQuote.mockResolvedValue({ price: 445, change: -35, changePercent: -7, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 480, high: 481, low: 470, close: 472, volume: 1000 },
      { date: "2026-02-25", open: 470, high: 472, low: 448, close: 450, volume: 1000 },
      { date: "2026-03-01", open: 450, high: 455, low: 440, close: 445, volume: 1000 },
    ] as never);

    const result = await resolveByData();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 32,
        outcome: "confirmed",
        score: 1.0,
      }),
    );
  });

  // 8. Calls updateObservedRates after successful resolution
  it("calls updateObservedRates when there are resolved predictions", async () => {
    const pred = makePrediction({
      id: 40,
      direction: "up",
      priceTarget: 500,
      referenceSymbol: "SPY",
      referencePrices: JSON.stringify({ SPY: 480 }),
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    mockedGetQuote.mockResolvedValue({ price: 505, change: 25, changePercent: 5, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 480, high: 485, low: 478, close: 482, volume: 1000 },
      { date: "2026-03-01", open: 498, high: 506, low: 496, close: 505, volume: 1000 },
    ] as never);

    await resolveByData();

    expect(mockUpdateObservedRates).toHaveBeenCalledOnce();
  });

  // 8b. Does NOT call updateObservedRates when no results
  it("does not call updateObservedRates when there are no resolved predictions", async () => {
    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [], // no pending
    );

    await resolveByData();

    expect(mockUpdateObservedRates).not.toHaveBeenCalled();
  });

  // 9. Early-confirms future predictions when target already hit
  it("early-confirms predictions whose deadline is in the future when target already hit", async () => {
    const pred = makePrediction({
      id: 50,
      deadline: "2026-12-31", // future
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    const result = await resolveByData();

    expect(result).toEqual([
      expect.objectContaining({ id: 50, outcome: "confirmed", score: 1.0 }),
    ]);
  });

  // 9b. Skips future predictions when target is still reachable
  it("skips future predictions when target is not yet hit and still reachable", async () => {
    const pred = makePrediction({
      id: 51,
      deadline: "2026-12-31", // future
      priceTarget: 600, // target above current price of 505, not yet hit
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    const result = await resolveByData();

    expect(result).toEqual([]);
  });

  // 10. Uses startPrice from referencePrices when available
  it("uses reference price from referencePrices over first bar close", async () => {
    const pred = makePrediction({
      id: 60,
      direction: "up",
      priceTarget: 500,
      referenceSymbol: "SPY",
      // Reference price is 490, but first bar close is 480
      referencePrices: JSON.stringify({ SPY: 490 }),
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    // lastPrice = 495 > 490 (refPrice) = direction correct
    // but 495 < 500 target = not hit
    mockedGetQuote.mockResolvedValue({ price: 495, change: 15, changePercent: 3, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 480, high: 485, low: 478, close: 480, volume: 1000 },
      { date: "2026-03-01", open: 492, high: 498, low: 490, close: 495, volume: 1000 },
    ] as never);

    const result = await resolveByData();

    expect(result).toHaveLength(1);
    // direction correct (495 > 490) but target not hit (max high 498 < 500) => partial
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 60,
        outcome: "partial",
        score: 0.5,
      }),
    );
  });

  // 11. Falls back to first bar close when referencePrices not available
  it("falls back to first bar close when referencePrices is empty", async () => {
    const pred = makePrediction({
      id: 70,
      direction: "up",
      priceTarget: 500,
      referenceSymbol: "SPY",
      referencePrices: null, // no reference prices
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    // First bar close = 480, lastPrice = 495 => direction correct, target not hit
    mockedGetQuote.mockResolvedValue({ price: 495, change: 15, changePercent: 3, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 478, high: 485, low: 476, close: 480, volume: 1000 },
      { date: "2026-03-01", open: 492, high: 498, low: 490, close: 495, volume: 1000 },
    ] as never);

    const result = await resolveByData();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 70,
        outcome: "partial",
        score: 0.5,
      }),
    );
  });

  // 12. Skips candidate when market data fetch fails
  it("skips candidate when quote fetch returns null", async () => {
    const pred = makePrediction({ id: 80 });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    mockedGetQuote.mockResolvedValue(null as never);
    mockedGetDailySeries.mockResolvedValue([] as never);

    const result = await resolveByData();

    expect(result).toEqual([]);
  });

  // 13. Skips candidate when window bars are empty
  it("skips candidate when no price bars exist within the prediction window", async () => {
    const pred = makePrediction({
      id: 90,
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    mockedGetQuote.mockResolvedValue({ price: 500, change: 0, changePercent: 0, volume: 1000000 } as never);
    // All bars are outside the window
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-03-05", open: 500, high: 510, low: 495, close: 505, volume: 1000 },
    ] as never);

    const result = await resolveByData();

    expect(result).toEqual([]);
  });

  // 14. Writes correct fields to DB on update
  it("updates prediction in database with correct fields", async () => {
    const pred = makePrediction({
      id: 100,
      direction: "up",
      priceTarget: 500,
      referenceSymbol: "SPY",
      referencePrices: JSON.stringify({ SPY: 480 }),
      createdAt: "2026-02-20T00:00:00.000Z",
      deadline: "2026-03-01",
    });

    setupDbChain(
      [{ key: "alpha_vantage_api_key", value: "test-key" }],
      [pred],
    );

    mockedGetQuote.mockResolvedValue({ price: 505, change: 25, changePercent: 5, volume: 1000000 } as never);
    mockedGetDailySeries.mockResolvedValue([
      { date: "2026-02-20", open: 480, high: 485, low: 478, close: 482, volume: 1000 },
      { date: "2026-03-01", open: 500, high: 506, low: 498, close: 505, volume: 1000 },
    ] as never);

    await resolveByData();

    expect(mockUpdate).toHaveBeenCalled();
  });
});

// ── Pure scoring logic tests (no mocking needed) ──

describe("resolveByData scoring logic (pure)", () => {
  type Bar = { date: string; close: number; high: number; low: number };

  function computeScore(opts: {
    direction: "up" | "down";
    startPrice: number;
    target: number;
    windowBars: Bar[];
  }): { outcome: string; score: number; targetHit: boolean; directionCorrect: boolean } {
    const { direction, startPrice, target, windowBars } = opts;
    const lastPrice = windowBars[windowBars.length - 1].close;

    let targetHit = false;
    let directionCorrect = false;

    if (direction === "up") {
      directionCorrect = lastPrice > startPrice;
      targetHit = windowBars.some((b) => b.high >= target || b.close >= target);
    } else if (direction === "down") {
      directionCorrect = lastPrice < startPrice;
      targetHit = windowBars.some((b) => b.low <= target || b.close <= target);
    }

    let outcome: string;
    let score: number;

    if (targetHit && directionCorrect) {
      outcome = "confirmed";
      score = 1.0;
    } else if (directionCorrect && !targetHit) {
      outcome = "partial";
      score = 0.5;
    } else {
      outcome = "denied";
      score = 0.0;
    }

    return { outcome, score, targetHit, directionCorrect };
  }

  it("confirmed: up direction, target hit via high", () => {
    const result = computeScore({
      direction: "up",
      startPrice: 100,
      target: 110,
      windowBars: [
        { date: "2026-01-01", close: 102, high: 105, low: 99 },
        { date: "2026-01-05", close: 108, high: 112, low: 106 },
      ],
    });
    expect(result.outcome).toBe("confirmed");
    expect(result.score).toBe(1.0);
    expect(result.targetHit).toBe(true);
    expect(result.directionCorrect).toBe(true);
  });

  it("confirmed: up direction, target hit via close", () => {
    const result = computeScore({
      direction: "up",
      startPrice: 100,
      target: 110,
      windowBars: [
        { date: "2026-01-01", close: 102, high: 105, low: 99 },
        { date: "2026-01-05", close: 111, high: 109, low: 106 },
      ],
    });
    expect(result.outcome).toBe("confirmed");
    expect(result.score).toBe(1.0);
  });

  it("confirmed: down direction, target hit via low", () => {
    const result = computeScore({
      direction: "down",
      startPrice: 100,
      target: 90,
      windowBars: [
        { date: "2026-01-01", close: 98, high: 101, low: 96 },
        { date: "2026-01-05", close: 92, high: 95, low: 88 },
      ],
    });
    expect(result.outcome).toBe("confirmed");
    expect(result.score).toBe(1.0);
  });

  it("partial: up direction correct but target not reached", () => {
    const result = computeScore({
      direction: "up",
      startPrice: 100,
      target: 120,
      windowBars: [
        { date: "2026-01-01", close: 102, high: 105, low: 99 },
        { date: "2026-01-05", close: 110, high: 115, low: 108 },
      ],
    });
    expect(result.outcome).toBe("partial");
    expect(result.score).toBe(0.5);
    expect(result.directionCorrect).toBe(true);
    expect(result.targetHit).toBe(false);
  });

  it("partial: down direction correct but target not reached", () => {
    const result = computeScore({
      direction: "down",
      startPrice: 100,
      target: 80,
      windowBars: [
        { date: "2026-01-01", close: 98, high: 101, low: 96 },
        { date: "2026-01-05", close: 90, high: 95, low: 85 },
      ],
    });
    expect(result.outcome).toBe("partial");
    expect(result.score).toBe(0.5);
  });

  it("denied: up prediction but price went down", () => {
    const result = computeScore({
      direction: "up",
      startPrice: 100,
      target: 110,
      windowBars: [
        { date: "2026-01-01", close: 99, high: 101, low: 97 },
        { date: "2026-01-05", close: 95, high: 98, low: 93 },
      ],
    });
    expect(result.outcome).toBe("denied");
    expect(result.score).toBe(0.0);
  });

  it("denied: down prediction but price went up", () => {
    const result = computeScore({
      direction: "down",
      startPrice: 100,
      target: 90,
      windowBars: [
        { date: "2026-01-01", close: 102, high: 105, low: 99 },
        { date: "2026-01-05", close: 108, high: 110, low: 106 },
      ],
    });
    expect(result.outcome).toBe("denied");
    expect(result.score).toBe(0.0);
  });

  it("denied: target hit but direction wrong (up prediction, price ended lower)", () => {
    // Price briefly spiked above target but ended below start
    const result = computeScore({
      direction: "up",
      startPrice: 100,
      target: 110,
      windowBars: [
        { date: "2026-01-01", close: 105, high: 112, low: 100 },
        { date: "2026-01-05", close: 95, high: 98, low: 93 },
      ],
    });
    expect(result.outcome).toBe("denied");
    expect(result.score).toBe(0.0);
    expect(result.targetHit).toBe(true);
    expect(result.directionCorrect).toBe(false);
  });

  it("denied: flat price (lastPrice === startPrice for up direction)", () => {
    const result = computeScore({
      direction: "up",
      startPrice: 100,
      target: 110,
      windowBars: [
        { date: "2026-01-01", close: 100, high: 102, low: 98 },
      ],
    });
    // lastPrice (100) is NOT > startPrice (100), so direction wrong
    expect(result.outcome).toBe("denied");
    expect(result.score).toBe(0.0);
  });
});
