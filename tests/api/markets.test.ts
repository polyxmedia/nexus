vi.mock("@/lib/market-data/yahoo", () => ({
  getHistoricalData: vi.fn().mockResolvedValue([
    { date: "2025-01-01", open: 100, high: 105, low: 99, close: 103, volume: 5000000 },
  ]),
  getQuoteData: vi.fn().mockResolvedValue({
    symbol: "AAPL", price: 150, change: 2.5, changePercent: 1.7, volume: 50000000,
  }),
}));

vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/auth/auth", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { name: "testuser" } }),
}));

vi.mock("@/lib/regime/detection", () => ({
  detectCurrentRegime: vi.fn().mockResolvedValue({
    label: "Neutral", composite: 0, volatility: "normal", riskAppetite: "neutral", timestamp: "2025-01-01",
  }),
  getLatestShifts: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/regime/store", () => ({
  loadRegimeState: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/gpr", () => ({
  getGPRSnapshot: vi.fn().mockResolvedValue({
    current: { composite: 100, threats: 120, acts: 80 },
    history: [],
    regional: [],
    thresholdCrossings: [],
    lastUpdated: "2025-01-01",
  }),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/markets/chart", () => {
  it("returns chart data with bars and quote", async () => {
    const { GET } = await import("@/app/api/markets/chart/route");
    const req = createRequest("/api/markets/chart?symbol=AAPL");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ symbol: string; bars: unknown[] }>(res);
    expect(status).toBe(200);
    expect(data.symbol).toBe("AAPL");
    expect(data.bars).toBeDefined();
  });

  it("returns 400 if symbol missing", async () => {
    const { GET } = await import("@/app/api/markets/chart/route");
    const req = createRequest("/api/markets/chart");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("accepts period parameter", async () => {
    const { GET } = await import("@/app/api/markets/chart/route");
    const req = createRequest("/api/markets/chart?symbol=AAPL&period=1y");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/regime", () => {
  it("returns regime data", async () => {
    const { GET } = await import("@/app/api/regime/route");
    const res = await GET();
    const { status, data } = await parseResponse<{ regime: unknown }>(res);
    expect(status).toBe(200);
    expect(data).toHaveProperty("regime");
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const { GET } = await import("@/app/api/regime/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/regime", () => {
  it("detects current regime", async () => {
    const { POST } = await import("@/app/api/regime/route");
    const res = await POST();
    const { status, data } = await parseResponse<{ regime: unknown }>(res);
    expect(status).toBe(200);
    expect(data.regime).toBeDefined();
  });

  it("returns 500 on error", async () => {
    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    (detectCurrentRegime as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Detection failed"));

    const { POST } = await import("@/app/api/regime/route");
    const res = await POST();
    expect(res.status).toBe(500);
  });
});

describe("GET /api/gpr", () => {
  it("returns GPR snapshot", async () => {
    const { GET } = await import("@/app/api/gpr/route");
    const req = createRequest("/api/gpr");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
