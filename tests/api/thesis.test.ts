vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/db", () => {
  const mockChain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "values", "returning", "set"];
  methods.forEach((m) => { mockChain[m] = vi.fn().mockReturnValue(mockChain); });
  Object.defineProperty(mockChain, "then", {
    value: (resolve: (v: unknown) => void) => resolve([]),
    writable: true, configurable: true,
  });
  return {
    db: { select: vi.fn().mockReturnValue(mockChain), insert: vi.fn().mockReturnValue(mockChain), update: vi.fn().mockReturnValue(mockChain) },
    schema: { theses: { id: "id", uuid: "uuid", status: "status", generatedAt: "generatedAt", layers: "layers", sectorRecommendations: "sectorRecommendations", riskFactors: "riskFactors" } },
  };
});

vi.mock("@/lib/thesis/engine", () => ({
  generateThesis: vi.fn().mockResolvedValue({
    id: 1, uuid: "t-123", title: "Test Thesis", status: "active",
  }),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/thesis", () => {
  it("returns theses list", async () => {
    const { db } = await import("@/lib/db");
    const theses = [
      { id: 1, uuid: "t-123", title: "Test", status: "active", layers: "[]", sectorRecommendations: "[]", riskFactors: "[]", tradingActions: "[]", layerInputs: "{}", symbols: '["AAPL"]' },
    ];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(theses),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/thesis/route");
    const req = createRequest("/api/thesis");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { GET } = await import("@/app/api/thesis/route");
    const req = createRequest("/api/thesis");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/thesis", () => {
  it("generates thesis from symbols", async () => {
    const { POST } = await import("@/app/api/thesis/route");
    const req = createRequest("/api/thesis", {
      method: "POST",
      body: { symbols: ["AAPL", "GOOGL"] },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if no symbols", async () => {
    const { POST } = await import("@/app/api/thesis/route");
    const req = createRequest("/api/thesis", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/thesis/[id]", () => {
  it("returns thesis by uuid", async () => {
    const { db } = await import("@/lib/db");
    const thesis = { id: 1, uuid: "t-123", title: "Test", layers: "[]", sectorRecommendations: "[]", riskFactors: "[]", tradingActions: "[]", layerInputs: "{}", symbols: '["AAPL"]' };
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([thesis]),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/thesis/[id]/route");
    const req = createRequest("/api/thesis/t-123");
    const res = await GET(req, { params: Promise.resolve({ id: "t-123" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/thesis/[id]/route");
    const req = createRequest("/api/thesis/nonexistent");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/thesis/[id]", () => {
  it("updates thesis status", async () => {
    const { PATCH } = await import("@/app/api/thesis/[id]/route");
    const req = createRequest("/api/thesis/t-123", {
      method: "PATCH",
      body: { status: "invalidated" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "t-123" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
