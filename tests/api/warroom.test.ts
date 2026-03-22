vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/db", () => {
  const mockChain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "select"];
  methods.forEach((m) => { mockChain[m] = vi.fn().mockReturnValue(mockChain); });
  Object.defineProperty(mockChain, "then", {
    value: (resolve: (v: unknown) => void) => resolve([]),
    writable: true, configurable: true,
  });

  return {
    db: { select: vi.fn().mockReturnValue(mockChain), insert: vi.fn().mockReturnValue(mockChain), update: vi.fn().mockReturnValue(mockChain) },
    schema: {
      signals: { id: "id", intensity: "intensity", createdAt: "createdAt" },
      theses: { id: "id", status: "status", generatedAt: "generatedAt" },
    },
  };
});

vi.mock("@/lib/db/schema", () => ({
  signals: { id: "id", intensity: "intensity", createdAt: "createdAt" },
  theses: { id: "id", status: "status", generatedAt: "generatedAt" },
}));

vi.mock("@/lib/game-theory/actors", () => ({
  ACTORS: [{ id: "us", name: "United States", type: "state" }],
  SCENARIOS: [{ id: "s1", name: "Test Scenario", actors: ["us"], description: "Test" }],
}));

vi.mock("@/lib/game-theory/analysis", () => ({
  analyzeScenario: vi.fn().mockReturnValue({ escalationLadder: [{ level: 3 }], equilibria: [] }),
}));

vi.mock("@/lib/warroom/geo-constants", () => ({
  ACTOR_COORDS: { us: { lat: 38.9, lng: -77 } },
  ACTOR_COLORS: { us: { color: "#3b82f6", group: "blue" } },
  CONFLICT_ZONES: [],
  STRATEGIC_LOCATIONS: [],
  getAllianceLinks: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/warroom/vessels", () => ({
  generateVessels: vi.fn().mockReturnValue([
    { id: "v1", name: "USS Test", lat: 30, lng: -80, type: "military" },
  ]),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/warroom", () => {
  it("returns war room data", async () => {
    const { GET } = await import("@/app/api/warroom/route");
    const res = await GET();
    const { status, data } = await parseResponse<{ actors: unknown[]; scenarios: unknown[] }>(res);
    expect(status).toBe(200);
    expect(data.actors).toBeDefined();
    expect(data.scenarios).toBeDefined();
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const { GET } = await import("@/app/api/warroom/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/warroom/aircraft", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        states: [
          ["abc123", "UAL123", "US", 1234567890, 1234567890, -77.0, 38.9, 10000, false, 250, 180, 5, null, 10000, "1234", false, 0],
        ],
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns aircraft data", async () => {
    const { GET } = await import("@/app/api/warroom/aircraft/route");
    const req = createRequest("/api/warroom/aircraft");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const { GET } = await import("@/app/api/warroom/aircraft/route");
    const req = createRequest("/api/warroom/aircraft");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns empty array when OpenSky fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const { GET } = await import("@/app/api/warroom/aircraft/route");
    // Use bounding box params to bypass in-memory cache from previous test
    const req = createRequest("/api/warroom/aircraft?lamin=35&lomin=-12&lamax=72&lomax=45");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ aircraft: unknown[]; error?: string }>(res);
    expect(status).toBe(200);
    expect(data.aircraft).toEqual([]);
    expect(data.error).toBe("fetch_failed");
  });
});

describe("GET /api/warroom/vessels", () => {
  it("returns vessel data", async () => {
    const { GET } = await import("@/app/api/warroom/vessels/route");
    const req = createRequest("/api/warroom/vessels");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const { GET } = await import("@/app/api/warroom/vessels/route");
    const req = createRequest("/api/warroom/vessels");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/warroom/osint", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(""),
      json: vi.fn().mockResolvedValue({ features: [] }),
    }));
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns OSINT events", async () => {
    const { GET } = await import("@/app/api/warroom/osint/route");
    const req = createRequest("/api/warroom/osint");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
