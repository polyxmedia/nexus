vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/iw/engine", () => ({
  getAllScenarioStatuses: vi.fn().mockResolvedValue([
    { scenarioId: "s1", name: "Test", status: "monitoring", activatedIndicators: 2 },
  ]),
  evaluateScenario: vi.fn().mockResolvedValue({
    scenarioId: "s1", name: "Test", status: "monitoring", activatedIndicators: 2,
  }),
  activateIndicator: vi.fn().mockResolvedValue({ success: true }),
  deactivateIndicator: vi.fn().mockResolvedValue({ success: true }),
  autoDetectIndicators: vi.fn().mockResolvedValue({ detected: 3, activated: 1 }),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/iw", () => {
  it("returns all scenario statuses", async () => {
    const { GET } = await import("@/app/api/iw/route");
    const req = createRequest("/api/iw");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ scenarios: unknown[] }>(res);
    expect(status).toBe(200);
    expect(data.scenarios).toBeDefined();
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { GET } = await import("@/app/api/iw/route");
    const req = createRequest("/api/iw");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/iw/[scenarioId]", () => {
  it("returns specific scenario", async () => {
    const { GET } = await import("@/app/api/iw/[scenarioId]/route");
    const req = createRequest("/api/iw/s1");
    const res = await GET(req, { params: Promise.resolve({ scenarioId: "s1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 404 for unknown scenario", async () => {
    const { evaluateScenario } = await import("@/lib/iw/engine");
    (evaluateScenario as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/iw/[scenarioId]/route");
    const req = createRequest("/api/iw/unknown");
    const res = await GET(req, { params: Promise.resolve({ scenarioId: "unknown" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/iw/[scenarioId]/indicators", () => {
  it("activates an indicator", async () => {
    const { PATCH } = await import("@/app/api/iw/[scenarioId]/indicators/route");
    const req = createRequest("/api/iw/s1/indicators", {
      method: "PATCH",
      body: { indicatorId: "i1", status: "active", evidence: "Test evidence" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ scenarioId: "s1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if indicatorId missing", async () => {
    const { PATCH } = await import("@/app/api/iw/[scenarioId]/indicators/route");
    const req = createRequest("/api/iw/s1/indicators", {
      method: "PATCH",
      body: { status: "active" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ scenarioId: "s1" }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/iw/evaluate", () => {
  it("auto-detects and evaluates", async () => {
    const { POST } = await import("@/app/api/iw/evaluate/route");
    const req = createRequest("/api/iw/evaluate", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
