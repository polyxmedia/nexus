vi.mock("@/lib/db", () => {
  const mockChain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "values", "returning", "set", "leftJoin", "innerJoin"];
  methods.forEach((m) => { mockChain[m] = vi.fn().mockReturnValue(mockChain); });
  Object.defineProperty(mockChain, "then", {
    value: (resolve: (v: unknown) => void) => resolve([]),
    writable: true,
    configurable: true,
  });

  return {
    db: {
      select: vi.fn().mockReturnValue(mockChain),
      insert: vi.fn().mockReturnValue(mockChain),
      update: vi.fn().mockReturnValue(mockChain),
      delete: vi.fn().mockReturnValue(mockChain),
    },
    schema: {
      predictions: { id: "id", uuid: "uuid", claim: "claim", deadline: "deadline", confidence: "confidence", outcome: "outcome", score: "score", category: "category", signalId: "signalId", analysisId: "analysisId", resolvedAt: "resolvedAt", createdAt: "createdAt", direction: "direction", priceTarget: "priceTarget", referenceSymbol: "referenceSymbol", createdBy: "createdBy" },
      signals: { id: "id", uuid: "uuid" },
      analyses: { id: "id" },
    },
  };
});

vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/auth/auth", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { name: "testuser" } }),
}));

vi.mock("@/lib/predictions/engine", () => ({
  resolvePredictions: vi.fn().mockResolvedValue({ results: [], count: 0 }),
  generatePredictions: vi.fn().mockResolvedValue([]),
  autoExpirePastDeadline: vi.fn().mockResolvedValue({ expired: 0 }),
  invalidateOnRegimeChange: vi.fn().mockResolvedValue({ invalidated: 0 }),
  resolveByData: vi.fn().mockResolvedValue({ resolved: 0 }),
}));

vi.mock("@/lib/predictions/feedback", () => ({
  computePerformanceReport: vi.fn().mockReturnValue({
    totalResolved: 10,
    brierScore: 0.2,
    logLoss: 0.5,
    binaryAccuracy: 0.7,
    avgConfidence: 0.65,
    calibrationGap: 0.05,
    calibration: [],
    byCategory: [],
  }),
}));

vi.mock("@/lib/predictions/notify", () => ({
  notifyNewPredictions: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/game-theory/wartime", () => ({
  runWartimeCheck: vi.fn().mockResolvedValue({ fired: false }),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/predictions", () => {
  it("returns predictions list", async () => {
    const { db } = await import("@/lib/db");
    const preds = [
      { id: 1, claim: "Test", confidence: 0.7, outcome: null, category: "GEO" },
    ];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(preds),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("filters by status=pending", async () => {
    const { db } = await import("@/lib/db");
    const preds = [
      { id: 1, claim: "Pending", confidence: 0.7, outcome: null },
      { id: 2, claim: "Resolved", confidence: 0.8, outcome: "correct" },
    ];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(preds),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions?status=pending");
    const res = await GET(req);
    const { status, data } = await parseResponse<Array<{ outcome: string | null }>>(res);
    expect(status).toBe(200);
    expect(data.every((p) => !p.outcome)).toBe(true);
  });

  it("filters by status=resolved", async () => {
    const { db } = await import("@/lib/db");
    const preds = [
      { id: 1, outcome: null },
      { id: 2, outcome: "correct" },
    ];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(preds),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions?status=resolved");
    const res = await GET(req);
    const { status, data } = await parseResponse<Array<{ outcome: string | null }>>(res);
    expect(status).toBe(200);
    expect(data.every((p) => !!p.outcome)).toBe(true);
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { GET } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/predictions", () => {
  it("creates a prediction", async () => {
    const { db } = await import("@/lib/db");
    const newPred = { id: 1, claim: "Test prediction", confidence: 0.75, category: "MKT" };
    const chain = (db.insert as ReturnType<typeof vi.fn>)();
    chain.returning = vi.fn().mockResolvedValue([newPred]);

    const { POST } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions", {
      method: "POST",
      body: {
        claim: "Test prediction",
        timeframe: "1w",
        deadline: "2025-12-31",
        confidence: 0.75,
        category: "MKT",
      },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if required fields missing", async () => {
    const { POST } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions", {
      method: "POST",
      body: { claim: "Test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/predictions", () => {
  it("resolves a prediction by uuid", async () => {
    const { db } = await import("@/lib/db");
    const existing = { id: 1, uuid: "abc-123", claim: "Test" };
    const updated = { ...existing, outcome: "correct", score: 0.9 };

    const selectChain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(selectChain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([existing]),
      writable: true,
      configurable: true,
    });

    const updateChain = (db.update as ReturnType<typeof vi.fn>)();
    updateChain.returning = vi.fn().mockResolvedValue([updated]);

    const { PATCH } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions", {
      method: "PATCH",
      body: { uuid: "abc-123", outcome: "correct", score: 0.9 },
    });
    const res = await PATCH(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if no uuid or id", async () => {
    const { PATCH } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions", {
      method: "PATCH",
      body: { outcome: "correct" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if no outcome", async () => {
    const { PATCH } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions", {
      method: "PATCH",
      body: { uuid: "abc-123" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 if prediction not found", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true,
      configurable: true,
    });

    const { PATCH } = await import("@/app/api/predictions/route");
    const req = createRequest("/api/predictions", {
      method: "PATCH",
      body: { uuid: "nonexistent", outcome: "correct" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/predictions/[id]", () => {
  it("returns prediction by uuid", async () => {
    const { db } = await import("@/lib/db");
    const pred = { id: 1, uuid: "abc-123", claim: "Test", signalId: null, analysisId: null };
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([pred]),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/predictions/[id]/route");
    const req = createRequest("/api/predictions/abc-123");
    const res = await GET(req, { params: Promise.resolve({ id: "abc-123" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/predictions/[id]/route");
    const req = createRequest("/api/predictions/nonexistent");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/predictions/resolve", () => {
  it("resolves predictions", async () => {
    const { POST } = await import("@/app/api/predictions/resolve/route");
    const req = createRequest("/api/predictions/resolve", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("GET /api/predictions/recent-resolved", () => {
  it("returns recent resolved predictions", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/predictions/recent-resolved/route");
    const req = createRequest("/api/predictions/recent-resolved");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("GET /api/predictions/feedback", () => {
  it("returns performance report", async () => {
    const { GET } = await import("@/app/api/predictions/feedback/route");
    const req = createRequest("/api/predictions/feedback");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("GET /api/predictions/calibration", () => {
  it("returns calibration analysis", async () => {
    const { GET } = await import("@/app/api/predictions/calibration/route");
    const req = createRequest("/api/predictions/calibration");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("POST /api/predictions/generate", () => {
  it("generates predictions", async () => {
    const { POST } = await import("@/app/api/predictions/generate/route");
    const req = createRequest("/api/predictions/generate", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
