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
    db: {
      select: vi.fn().mockReturnValue(mockChain),
      insert: vi.fn().mockReturnValue(mockChain),
      update: vi.fn().mockReturnValue(mockChain),
      delete: vi.fn().mockReturnValue(mockChain),
    },
    schema: {
      alerts: { id: "id", enabled: "enabled", type: "type", condition: "condition", dismissed: "dismissed" },
      alertHistory: { id: "id" },
      signals: { id: "id", intensity: "intensity" },
      predictions: { id: "id", deadline: "deadline" },
    },
  };
});

vi.mock("@/lib/alerts/chains", () => ({
  runAlertChain: vi.fn().mockResolvedValue({ triggered: 0 }),
}));

import { createRequest, parseResponse } from "../helpers";

describe("POST /api/alerts/check", () => {
  it("checks alerts and returns results", async () => {
    const { POST } = await import("@/app/api/alerts/check/route");
    const req = createRequest("/api/alerts/check", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { POST } = await import("@/app/api/alerts/check/route");
    const req = createRequest("/api/alerts/check", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/alerts/stream", () => {
  it("returns SSE stream", async () => {
    const { GET } = await import("@/app/api/alerts/stream/route");
    const req = createRequest("/api/alerts/stream");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { GET } = await import("@/app/api/alerts/stream/route");
    const req = createRequest("/api/alerts/stream");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
