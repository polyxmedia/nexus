vi.mock("@/lib/db", () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockValues = vi.fn();
  const mockReturning = vi.fn();
  const mockSet = vi.fn();

  const chain = {
    from: mockFrom,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    values: mockValues,
    returning: mockReturning,
    set: mockSet,
  };
  mockSelect.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  mockFrom.mockReturnValue(chain);
  mockWhere.mockReturnValue(chain);
  mockOrderBy.mockReturnValue(chain);
  mockLimit.mockReturnValue(chain);
  mockValues.mockReturnValue(chain);
  mockSet.mockReturnValue(chain);
  mockReturning.mockResolvedValue([]);

  // Make chain thenable so `await db.select().from()` resolves
  const thenHandler = (resolve: (v: unknown) => void) => resolve([]);
  Object.defineProperty(chain, "then", {
    value: thenHandler,
    writable: true,
    configurable: true,
  });

  return {
    db: { select: mockSelect, insert: mockInsert, update: vi.fn().mockReturnValue(chain), delete: vi.fn().mockReturnValue(chain) },
    schema: {
      signals: { id: "id", uuid: "uuid", title: "title", date: "date", intensity: "intensity", category: "category", status: "status", layers: "layers", geopoliticalContext: "geopoliticalContext", marketSectors: "marketSectors", createdAt: "createdAt" },
      predictions: { id: "id", signalId: "signalId" },
      trades: { id: "id", signalId: "signalId" },
    },
  };
});

vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/signals/engine", () => ({
  generateSignals: vi.fn().mockReturnValue({
    signals: [{ id: 1, title: "Test Signal", intensity: 3, category: "GEO", status: "active", date: "2025-01-01" }],
    stats: { total: 1 },
    shmitaInfo: {},
  }),
}));

vi.mock("@/lib/market-data/alpha-vantage", () => ({
  getDailySeries: vi.fn().mockResolvedValue([
    { date: "2025-01-01", close: 100 },
    { date: "2025-01-08", close: 105 },
  ]),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/signals", () => {
  it("returns signals list", async () => {
    const { db } = await import("@/lib/db");
    const signals = [
      { id: 1, title: "Signal 1", intensity: 3, status: "active" },
      { id: 2, title: "Signal 2", intensity: 5, status: "active" },
    ];
    // Override thenable to return signals
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(signals),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals");
    const res = await GET(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("filters by intensity", async () => {
    const { db } = await import("@/lib/db");
    const signals = [
      { id: 1, title: "Signal 1", intensity: 3, status: "active" },
      { id: 2, title: "Signal 2", intensity: 5, status: "active" },
    ];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(signals),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals?intensity=5");
    const res = await GET(req);
    const { status, data } = await parseResponse<Array<{ intensity: number }>>(res);
    expect(status).toBe(200);
    // Filtering happens in-memory after fetch
    expect(data.every((s) => s.intensity === 5)).toBe(true);
  });

  it("filters by status", async () => {
    const { db } = await import("@/lib/db");
    const signals = [
      { id: 1, title: "Signal 1", intensity: 3, status: "active" },
      { id: 2, title: "Signal 2", intensity: 5, status: "expired" },
    ];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(signals),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals?status=active");
    const res = await GET(req);
    const { status, data } = await parseResponse<Array<{ status: string }>>(res);
    expect(status).toBe(200);
    expect(data.every((s) => s.status === "active")).toBe(true);
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const { GET } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 500 on db error", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (_: unknown, reject: (e: Error) => void) => reject(new Error("DB error")),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/signals", () => {
  it("generates signals for a year", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.insert as ReturnType<typeof vi.fn>)();
    // values().then -> resolved
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(undefined),
      writable: true,
      configurable: true,
    });

    const { POST } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals", { method: "POST", body: { year: 2025 } });
    const res = await POST(req);
    const { status, data } = await parseResponse<{ inserted: number }>(res);
    expect(status).toBe(200);
    expect(data.inserted).toBeGreaterThanOrEqual(0);
  });

  it("returns 400 if year is missing", async () => {
    const { POST } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals", { method: "POST", body: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if year is not a number", async () => {
    const { POST } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals", { method: "POST", body: { year: "abc" } });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    const { generateSignals } = await import("@/lib/signals/engine");
    (generateSignals as ReturnType<typeof vi.fn>).mockImplementationOnce(() => { throw new Error("Engine error"); });

    const { POST } = await import("@/app/api/signals/route");
    const req = createRequest("/api/signals", { method: "POST", body: { year: 2025 } });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/signals/[id]", () => {
  it("returns signal by uuid", async () => {
    const { db } = await import("@/lib/db");
    const signal = { id: 1, uuid: "abc-123", title: "Test", intensity: 3 };
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([signal]),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/signals/[id]/route");
    const req = createRequest("/api/signals/abc-123");
    const res = await GET(req, { params: Promise.resolve({ id: "abc-123" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 404 when signal not found", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/signals/[id]/route");
    const req = createRequest("/api/signals/nonexistent");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/signals/[id]/lineage", () => {
  it("returns signal with predictions and trades", async () => {
    const { db } = await import("@/lib/db");
    const signal = { id: 1, uuid: "abc-123", title: "Test" };
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([signal]),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/signals/[id]/lineage/route");
    const req = createRequest("/api/signals/abc-123/lineage");
    const res = await GET(req, { params: Promise.resolve({ id: "abc-123" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
