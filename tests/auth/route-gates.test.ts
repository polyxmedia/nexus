import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Integration tests verifying that all previously-unprotected routes
 * now properly gate via requireCronOrAdmin or session auth.
 */

// Mock next-auth (routes import from "next-auth")
const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
vi.mock("next-auth/next", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
vi.mock("@/lib/auth/auth", () => ({
  authOptions: {},
}));

// Mock DB
vi.mock("@/lib/db", () => {
  const mockChain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "values", "returning", "set"];
  methods.forEach((m) => {
    mockChain[m] = vi.fn().mockReturnValue(mockChain);
  });
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
      settings: { key: "key", value: "value" },
      watchlists: { id: "id", name: "name", position: "position", createdAt: "createdAt" },
      watchlistItems: { id: "id", watchlistId: "watchlistId", symbol: "symbol", position: "position", addedAt: "addedAt", lastPrice: "lastPrice", lastChange: "lastChange", lastChangePercent: "lastChangePercent", lastVolume: "lastVolume", lastUpdated: "lastUpdated" },
      theses: { uuid: "uuid" },
      portfolioSnapshots: { userId: "userId" },
    },
  };
});

// Mock requireCronOrAdmin to deny by default
const mockRequireCronOrAdmin = vi.fn();
vi.mock("@/lib/auth/require-cron", () => ({
  requireCronOrAdmin: (...args: unknown[]) => mockRequireCronOrAdmin(...args),
}));

// Mock heavy dependencies
vi.mock("@/lib/scheduler", () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getJobStatus: vi.fn().mockReturnValue([]),
}));
vi.mock("@/lib/knowledge/embeddings", () => ({
  embedAllKnowledge: vi.fn().mockResolvedValue({ embedded: 0 }),
}));
vi.mock("@/lib/knowledge/ingest", () => ({
  ingestKnowledge: vi.fn().mockResolvedValue({ ingested: 0 }),
}));
vi.mock("@/lib/knowledge/refresh", () => ({
  refreshKnowledge: vi.fn().mockResolvedValue({ refreshed: 0 }),
  getRefreshStatus: vi.fn().mockReturnValue({}),
}));
vi.mock("@/lib/predictions/engine", () => ({
  generatePredictions: vi.fn().mockResolvedValue([]),
  resolvePredictions: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/predictions/notify", () => ({
  notifyNewPredictions: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/lib/alerts/engine", () => ({
  evaluateAlerts: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/lib/agents/coordinator", () => ({
  runIntelligenceCycle: vi.fn().mockResolvedValue({}),
  getAgentStatus: vi.fn().mockReturnValue([]),
}));
vi.mock("@/lib/market-data/yahoo", () => ({
  getQuoteData: vi.fn().mockResolvedValue({ symbol: "AAPL", price: 150, change: 0, changePercent: 0, volume: 0 }),
}));

function createReq(url: string, method = "POST", body?: Record<string, unknown>): NextRequest {
  const init: RequestInit = {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
  };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(`http://localhost:3000${url}`, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: deny access
  const { NextResponse } = require("next/server");
  mockRequireCronOrAdmin.mockResolvedValue(
    NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  );
  mockGetServerSession.mockResolvedValue(null);
});

describe("Routes gated by requireCronOrAdmin", () => {
  const cronRoutes = [
    { path: "/api/scheduler", method: "GET", module: "@/app/api/scheduler/route", handler: "GET" },
    { path: "/api/scheduler", method: "POST", module: "@/app/api/scheduler/route", handler: "POST" },
    { path: "/api/scheduler/monitor", method: "POST", module: "@/app/api/scheduler/monitor/route", handler: "POST" },
    { path: "/api/knowledge/embed", method: "POST", module: "@/app/api/knowledge/embed/route", handler: "POST" },
    { path: "/api/predictions/generate", method: "POST", module: "@/app/api/predictions/generate/route", handler: "POST" },
    { path: "/api/predictions/auto-resolve", method: "POST", module: "@/app/api/predictions/auto-resolve/route", handler: "POST" },
    { path: "/api/agents/cycle", method: "POST", module: "@/app/api/agents/cycle/route", handler: "POST" },
  ];

  for (const route of cronRoutes) {
    it(`${route.method} ${route.path} returns 401 without auth`, async () => {
      const mod = await import(route.module);
      const handler = mod[route.handler];
      const req = createReq(route.path, route.method, route.method === "POST" ? { action: "start" } : undefined);
      const res = await handler(req);
      expect(res.status).toBe(401);
      expect(mockRequireCronOrAdmin).toHaveBeenCalledTimes(1);
    });

    it(`${route.method} ${route.path} proceeds when authorized`, async () => {
      mockRequireCronOrAdmin.mockResolvedValue(null);
      const mod = await import(route.module);
      const handler = mod[route.handler];
      const req = createReq(route.path, route.method, route.method === "POST" ? { action: "start" } : undefined);
      const res = await handler(req);
      expect(res.status).not.toBe(401);
      expect(mockRequireCronOrAdmin).toHaveBeenCalledTimes(1);
    });
  }
});

describe("Routes gated by session auth", () => {
  it("GET /api/watchlists returns 401 without session", async () => {
    const { GET } = await import("@/app/api/watchlists/route");
    const req = createReq("/api/watchlists?quotes=false", "GET");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/watchlists returns 401 without session", async () => {
    const { POST } = await import("@/app/api/watchlists/route");
    const req = createReq("/api/watchlists", "POST", { name: "Test" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("PATCH /api/watchlists returns 401 without session", async () => {
    const { PATCH } = await import("@/app/api/watchlists/route");
    const req = createReq("/api/watchlists", "PATCH", { id: 1, name: "Renamed" });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("DELETE /api/watchlists returns 401 without session", async () => {
    const { DELETE } = await import("@/app/api/watchlists/route");
    const req = createReq("/api/watchlists", "DELETE", { id: 1 });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("PATCH /api/thesis/[id] returns 401 without session", async () => {
    const { PATCH } = await import("@/app/api/thesis/[id]/route");
    const req = createReq("/api/thesis/abc123", "PATCH", { status: "expired" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "abc123" }) });
    expect(res.status).toBe(401);
  });

  it("GET /api/thesis/[id] is publicly accessible (no auth required)", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) =>
        resolve([{
          uuid: "abc123",
          tradingActions: "[]",
          layerInputs: "{}",
          symbols: "[]",
        }]),
      writable: true,
      configurable: true,
    });

    const { GET } = await import("@/app/api/thesis/[id]/route");
    const req = createReq("/api/thesis/abc123", "GET");
    const res = await GET(req, { params: Promise.resolve({ id: "abc123" }) });
    expect(res.status).not.toBe(401);
  });
});
