vi.mock("@/lib/actors/profiles", () => ({
  getExtendedActorProfile: vi.fn().mockResolvedValue({
    id: "us", name: "United States", type: "state", influence: 10,
  }),
  getAllExtendedProfiles: vi.fn().mockResolvedValue([
    { id: "us", name: "United States" },
    { id: "cn", name: "China" },
  ]),
  searchActors: vi.fn().mockReturnValue([
    { id: "us", name: "United States" },
  ]),
}));

vi.mock("@/lib/actors/auto-update", () => ({
  runActorProfileUpdate: vi.fn().mockResolvedValue({ updated: 5, errors: 0 }),
}));

vi.mock("@/lib/auth/require-cron", () => ({
  requireCronOrAdmin: vi.fn().mockResolvedValue(null),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/actors", () => {
  it("returns all actors", async () => {
    const { GET } = await import("@/app/api/actors/route");
    const req = createRequest("/api/actors");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ actors: unknown[] }>(res);
    expect(status).toBe(200);
    expect(data.actors).toBeDefined();
    expect(data.actors.length).toBe(2);
  });

  it("returns single actor by id", async () => {
    const { GET } = await import("@/app/api/actors/route");
    const req = createRequest("/api/actors?id=us");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ id: string }>(res);
    expect(status).toBe(200);
    expect(data.id).toBe("us");
  });

  it("returns 404 for unknown actor", async () => {
    const { getExtendedActorProfile } = await import("@/lib/actors/profiles");
    (getExtendedActorProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/actors/route");
    const req = createRequest("/api/actors?id=unknown");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("searches actors by query", async () => {
    const { GET } = await import("@/app/api/actors/route");
    const req = createRequest("/api/actors?q=united");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ actors: unknown[] }>(res);
    expect(status).toBe(200);
    expect(data.actors.length).toBe(1);
  });

  it("returns 500 on error", async () => {
    const { getAllExtendedProfiles } = await import("@/lib/actors/profiles");
    (getAllExtendedProfiles as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Error"));

    const { GET } = await import("@/app/api/actors/route");
    const req = createRequest("/api/actors");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/actors/update", () => {
  it("updates actor profiles", async () => {
    const { POST } = await import("@/app/api/actors/update/route");
    const req = createRequest("/api/actors/update", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
