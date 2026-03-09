import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock fetch ──
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Use fake timers to bust the module-level cache between tests
// shouldAdvanceTime: true prevents AbortSignal.timeout from hanging
vi.useFakeTimers({ shouldAdvanceTime: true });

import { getPredictionMarkets, detectDivergences } from "../index";

function makePolyEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    title: "Test Event",
    description: "A test event",
    slug: "test-event",
    active: true,
    closed: false,
    volume: 100000,
    volume24hr: 5000,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    tags: [{ id: "1", label: "geopolitics", slug: "geopolitics" }],
    markets: [
      {
        id: "mkt_1",
        question: "Will this happen?",
        outcomePrices: '["0.65","0.35"]',
        clobTokenIds: '["token_yes_1","token_no_1"]',
        volume: "50000",
        volumeNum: 50000,
        volume24hr: 2500,
        active: true,
        closed: false,
        lastTradePrice: 0.65,
        oneDayPriceChange: 0.05,
        oneWeekPriceChange: -0.02,
        slug: "test-market",
        endDate: "2026-12-31",
      },
    ],
    ...overrides,
  };
}

function makeKalshiEvent(overrides: Record<string, unknown> = {}) {
  return {
    event_ticker: "BTC-100K",
    title: "Bitcoin above 100K by end of year",
    category: "Economics",
    markets: [
      {
        ticker: "BTC-100K-DEC",
        yes_sub_title: "December",
        status: "active",
        last_price: 45,
        yes_bid: 44,
        yes_ask: 46,
        volume: 10000,
        volume_24h: 500,
        close_time: "2026-12-31T23:59:59Z",
      },
    ],
    ...overrides,
  };
}

describe("getPredictionMarkets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Advance past 5-minute cache TTL to ensure fresh data each test
    vi.advanceTimersByTime(400_000);
  });

  it("fetches and merges markets from both sources", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makePolyEvent()]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: [makeKalshiEvent()] }),
      });

    const snapshot = await getPredictionMarkets();
    expect(snapshot.markets.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.totalMarkets).toBeGreaterThanOrEqual(2);
    expect(snapshot.lastUpdated).toBeDefined();

    const sources = snapshot.markets.map(m => m.source);
    expect(sources).toContain("polymarket");
    expect(sources).toContain("kalshi");
  });

  it("handles Polymarket API failure gracefully", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false }) // polymarket fails
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: [makeKalshiEvent()] }),
      });

    const snapshot = await getPredictionMarkets();
    expect(snapshot.markets.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.markets[0].source).toBe("kalshi");
  });

  it("handles Kalshi API failure gracefully", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makePolyEvent()]),
      })
      .mockResolvedValueOnce({ ok: false }); // kalshi fails

    const snapshot = await getPredictionMarkets();
    expect(snapshot.markets.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.markets[0].source).toBe("polymarket");
  });

  it("handles both APIs failing gracefully", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network down"))
      .mockRejectedValueOnce(new Error("Network down"));

    const snapshot = await getPredictionMarkets();
    expect(snapshot.markets).toEqual([]);
    expect(snapshot.totalMarkets).toBe(0);
  });

  it("categorizes Polymarket events by tags", async () => {
    const geoEvent = makePolyEvent({
      tags: [{ id: "1", label: "geopolitics", slug: "geopolitics" }],
    });
    const econEvent = makePolyEvent({
      id: "evt_2",
      tags: [{ id: "2", label: "economics", slug: "economics" }],
      markets: [
        {
          ...makePolyEvent().markets[0],
          id: "mkt_2",
        },
      ],
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([geoEvent, econEvent]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ events: [] }) });

    const snapshot = await getPredictionMarkets();
    expect(snapshot.geopolitical.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.economic.length).toBeGreaterThanOrEqual(1);
  });

  it("categorizes Kalshi events by keywords and category", async () => {
    const econEvent = makeKalshiEvent({ category: "Economics" });
    const politicalEvent = makeKalshiEvent({
      event_ticker: "PRES-2028",
      title: "Who will win the 2028 presidential election",
      category: "Politics",
      markets: [
        {
          ticker: "PRES-2028-DEM",
          yes_sub_title: "Democrat",
          status: "active",
          last_price: 52,
          yes_bid: 51,
          yes_ask: 53,
          volume: 20000,
          volume_24h: 1000,
          close_time: "2028-11-05T23:59:59Z",
        },
      ],
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: [econEvent, politicalEvent] }),
      });

    const snapshot = await getPredictionMarkets();
    expect(snapshot.economic.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.political.length).toBeGreaterThanOrEqual(1);
  });

  it("parses Polymarket outcome prices correctly", async () => {
    const event = makePolyEvent();
    event.markets[0].outcomePrices = '["0.72","0.28"]';

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([event]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ events: [] }) });

    const snapshot = await getPredictionMarkets();
    const polyMarket = snapshot.markets.find(m => m.source === "polymarket");
    expect(polyMarket?.probability).toBeCloseTo(0.72, 2);
  });

  it("normalizes Kalshi prices from cents to 0-1", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: [makeKalshiEvent()] }),
      });

    const snapshot = await getPredictionMarkets();
    const kalshiMarket = snapshot.markets.find(m => m.source === "kalshi");
    expect(kalshiMarket?.probability).toBeCloseTo(0.45, 2);
  });

  it("sorts markets by 24h volume descending", async () => {
    const event1 = makePolyEvent({
      markets: [{ ...makePolyEvent().markets[0], id: "mkt_high", volume24hr: 10000 }],
    });
    const event2 = makePolyEvent({
      id: "evt_2",
      markets: [{ ...makePolyEvent().markets[0], id: "mkt_low", volume24hr: 100 }],
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([event1, event2]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ events: [] }) });

    const snapshot = await getPredictionMarkets();
    if (snapshot.markets.length >= 2) {
      expect(snapshot.markets[0].volume24h).toBeGreaterThanOrEqual(snapshot.markets[1].volume24h);
    }
  });

  it("includes clobTokenIds for Polymarket markets", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makePolyEvent()]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ events: [] }) });

    const snapshot = await getPredictionMarkets();
    const polyMarket = snapshot.markets.find(m => m.source === "polymarket");
    expect(polyMarket?.clobTokenIds).toBe('["token_yes_1","token_no_1"]');
  });

  it("identifies top movers by absolute price change", async () => {
    const event = makePolyEvent({
      markets: [{ ...makePolyEvent().markets[0], oneDayPriceChange: 0.15 }],
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([event]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ events: [] }) });

    const snapshot = await getPredictionMarkets();
    expect(snapshot.topMovers.length).toBeGreaterThanOrEqual(1);
    expect(Math.abs(snapshot.topMovers[0].priceChange24h)).toBeGreaterThan(0);
  });

  it("skips inactive/closed Polymarket markets", async () => {
    const event = makePolyEvent({
      markets: [
        { ...makePolyEvent().markets[0], id: "active", active: true, closed: false },
        { ...makePolyEvent().markets[0], id: "closed", active: false, closed: true },
      ],
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([event]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ events: [] }) });

    const snapshot = await getPredictionMarkets();
    const polyMarkets = snapshot.markets.filter(m => m.source === "polymarket");
    expect(polyMarkets).toHaveLength(1);
  });

  it("skips empty Kalshi markets (zero price and volume)", async () => {
    const event = makeKalshiEvent({
      markets: [
        { ...makeKalshiEvent().markets[0], ticker: "ACTIVE", last_price: 50, volume: 100 },
        { ...makeKalshiEvent().markets[0], ticker: "EMPTY", last_price: 0, volume: 0 },
      ],
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ events: [event] }) });

    const snapshot = await getPredictionMarkets();
    const kalshiMarkets = snapshot.markets.filter(m => m.source === "kalshi");
    expect(kalshiMarkets).toHaveLength(1);
    expect(kalshiMarkets[0].id).toBe("kalshi_ACTIVE");
  });
});

describe("detectDivergences (from index.ts)", () => {
  it("detects divergences with sufficient keyword overlap", () => {
    const markets = [
      makePolyEvent().markets[0],
    ].map(() => ({
      id: "poly_1",
      source: "polymarket" as const,
      title: "Will Russia withdraw troops from Ukraine by end of 2026",
      description: "",
      probability: 0.15,
      volume24h: 5000,
      totalVolume: 50000,
      category: "geopolitical",
      endDate: "2026-12-31",
      active: true,
      url: "https://polymarket.com/event/test",
      priceChange24h: 0,
      priceChange7d: 0,
    }));

    const predictions = [
      {
        title: "Russia will withdraw troops from Ukraine before 2027 deadline",
        confidence: 0.55,
      },
    ];

    const result = detectDivergences(markets, predictions);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].divergence).toBeGreaterThan(0.15);
  });
});
