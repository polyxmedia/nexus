vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/db", () => {
  const mockChain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "select", "values", "returning", "set"];
  methods.forEach((m) => { mockChain[m] = vi.fn().mockReturnValue(mockChain); });
  Object.defineProperty(mockChain, "then", {
    value: (resolve: (v: unknown) => void) => resolve([]),
    writable: true, configurable: true,
  });
  return {
    db: { select: vi.fn().mockReturnValue(mockChain), insert: vi.fn().mockReturnValue(mockChain), update: vi.fn().mockReturnValue(mockChain) },
    schema: { signals: { id: "id" }, predictions: { id: "id" }, scenarioStates: { id: "id" } },
  };
});

vi.mock("@/lib/game-theory/scenarios-nplayer", () => {
  const scenario = {
    id: "s1", title: "Test", name: "Test", description: "Test scenario",
    actors: [{ id: "us", name: "US" }, { id: "cn", name: "China" }],
    possibleOutcomes: [], moveOrder: [], strategies: {}, coalitions: [],
    marketSectors: [], timeHorizon: "1y",
  };
  return {
    N_PLAYER_SCENARIOS: [scenario],
    getNPlayerScenario: vi.fn().mockImplementation((id: string) => id === "s1" ? scenario : null),
  };
});

vi.mock("@/lib/game-theory/bayesian", () => ({
  initializeBeliefs: vi.fn().mockReturnValue({}),
  runBayesianAnalysis: vi.fn().mockReturnValue({ beliefs: {}, convergence: 0.8 }),
  createSignalFromOSINT: vi.fn().mockReturnValue({ description: "test", actorId: "us" }),
}));

vi.mock("@/lib/game-theory/analysis", () => ({
  analyzeScenario: vi.fn().mockReturnValue({ escalationLadder: [], equilibria: [] }),
}));

vi.mock("@/lib/game-theory/actors", () => ({
  ACTORS: [{ id: "us", name: "United States" }, { id: "cn", name: "China" }],
}));

vi.mock("@/lib/game-theory/power-balance", () => ({
  computeTeamPower: vi.fn().mockReturnValue(100),
  computePowerBalance: vi.fn().mockReturnValue({ blue: 55, red: 45, blueAdvantages: [], redAdvantages: [], contested: [], overallBalance: "blue_advantage" }),
}));

vi.mock("@/lib/risk/systemic", () => ({
  getLatestSystemicRisk: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/calendar/actor-beliefs", () => ({
  getCalendarActorInsights: vi.fn().mockResolvedValue([]),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/game-theory/bayesian", () => {
  it("returns all scenario analyses", async () => {
    const { GET } = await import("@/app/api/game-theory/bayesian/route");
    const req = createRequest("/api/game-theory/bayesian");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const { GET } = await import("@/app/api/game-theory/bayesian/route");
    const req = createRequest("/api/game-theory/bayesian");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/game-theory/bayesian", () => {
  it("analyzes specific scenario", async () => {
    const { POST } = await import("@/app/api/game-theory/bayesian/route");
    const req = createRequest("/api/game-theory/bayesian", {
      method: "POST",
      body: { scenarioId: "s1", signals: [{ description: "test", actorId: "us", source: "osint" }] },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 404 for unknown scenario", async () => {
    const { POST } = await import("@/app/api/game-theory/bayesian/route");
    const req = createRequest("/api/game-theory/bayesian", {
      method: "POST",
      body: { scenarioId: "nonexistent" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/game-theory/global", () => {
  it("analyzes global confrontation", async () => {
    const { POST } = await import("@/app/api/game-theory/global/route");
    const req = createRequest("/api/game-theory/global", {
      method: "POST",
      body: { blueTeam: ["us"], redTeam: ["cn"] },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if no teams provided", async () => {
    const { POST } = await import("@/app/api/game-theory/global/route");
    const req = createRequest("/api/game-theory/global", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
