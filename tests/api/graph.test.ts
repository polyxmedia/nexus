vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/graph/engine", () => ({
  syncEntityGraph: vi.fn().mockResolvedValue({ entities: 10, relationships: 5 }),
  getEntityGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
  searchEntities: vi.fn().mockResolvedValue([{ id: 1, name: "Test Entity" }]),
}));

vi.mock("@/lib/graph/traversal", () => ({
  traverseFrom: vi.fn().mockResolvedValue({ nodes: [{ id: 1, name: "Test" }] }),
  findPaths: vi.fn().mockResolvedValue([]),
  exploreEntity: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
  buildContextGraph: vi.fn().mockResolvedValue({ entities: [], relationships: [] }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  sql: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockChain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "values", "returning", "set"];
  methods.forEach((m) => { mockChain[m] = vi.fn().mockReturnValue(mockChain); });
  Object.defineProperty(mockChain, "then", {
    value: (resolve: (v: unknown) => void) => resolve([{ count: 0 }]),
    writable: true, configurable: true,
  });
  return {
    db: { select: vi.fn().mockReturnValue(mockChain), insert: vi.fn().mockReturnValue(mockChain), update: vi.fn().mockReturnValue(mockChain) },
    schema: { entities: { id: "id" }, relationships: { id: "id" }, signals: { id: "id" }, theses: { id: "id" }, predictions: { id: "id" } },
  };
});

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/graph", () => {
  it("returns full graph", async () => {
    const { GET } = await import("@/app/api/graph/route");
    const req = createRequest("/api/graph");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("searches entities", async () => {
    const { GET } = await import("@/app/api/graph/route");
    const req = createRequest("/api/graph?action=search&q=test");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { GET } = await import("@/app/api/graph/route");
    const req = createRequest("/api/graph");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/graph", () => {
  it("syncs entity graph", async () => {
    const { POST } = await import("@/app/api/graph/route");
    const req = createRequest("/api/graph", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("POST /api/graph/auto-link", () => {
  it("auto-links entities from source", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([{ id: 1, title: "Test Signal" }]),
      writable: true, configurable: true,
    });

    const { POST } = await import("@/app/api/graph/auto-link/route");
    const req = createRequest("/api/graph/auto-link", {
      method: "POST",
      body: { sourceType: "signal", sourceId: 1 },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("GET /api/graph/traverse", () => {
  it("traverses from entity", async () => {
    const { GET } = await import("@/app/api/graph/traverse/route");
    const req = createRequest("/api/graph/traverse?entity=test");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if no entity or id", async () => {
    const { GET } = await import("@/app/api/graph/traverse/route");
    const req = createRequest("/api/graph/traverse");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/graph/traverse", () => {
  it("builds context graph from text", async () => {
    const { POST } = await import("@/app/api/graph/traverse/route");
    const req = createRequest("/api/graph/traverse", {
      method: "POST",
      body: { text: "US-China trade relations" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
