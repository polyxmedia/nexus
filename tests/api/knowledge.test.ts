vi.mock("@/lib/knowledge/engine", () => ({
  addKnowledge: vi.fn().mockResolvedValue({ id: 1, title: "Test", content: "Content", category: "geo" }),
  updateKnowledge: vi.fn().mockResolvedValue({ id: 1, title: "Updated" }),
  archiveKnowledge: vi.fn().mockResolvedValue({ id: 1, status: "archived" }),
  getKnowledgeById: vi.fn().mockResolvedValue({ id: 1, title: "Test" }),
  listKnowledge: vi.fn().mockResolvedValue([{ id: 1, title: "Test" }]),
  getKnowledgeStats: vi.fn().mockResolvedValue({ total: 10, active: 8, archived: 2 }),
}));

vi.mock("@/lib/knowledge/seed", () => ({
  seedKnowledge: vi.fn().mockResolvedValue({ seeded: 5 }),
}));

vi.mock("@/lib/knowledge/embeddings", () => ({
  embedAllKnowledge: vi.fn().mockResolvedValue({ embedded: 10, errors: 0 }),
}));

vi.mock("@/lib/knowledge/ingest-deterministic", () => ({
  ingestDeterministicKnowledge: vi.fn().mockResolvedValue({ count: 5 }),
  DETERMINISTIC_ENTRY_COUNT: 5,
}));
vi.mock("@/lib/knowledge/ingest-advanced", () => ({
  ingestAdvancedKnowledge: vi.fn().mockResolvedValue({ count: 3 }),
  ADVANCED_ENTRY_COUNT: 3,
}));
vi.mock("@/lib/knowledge/ingest-final", () => ({
  ingestFinalKnowledge: vi.fn().mockResolvedValue({ count: 2 }),
  FINAL_ENTRY_COUNT: 2,
}));
vi.mock("@/lib/knowledge/ingest-epstein-network", () => ({
  ingestEpsteinNetwork: vi.fn().mockResolvedValue({ count: 4 }),
}));
vi.mock("@/lib/knowledge/ingest-geopolitical-deep", () => ({
  ingestDeepGeopolitical: vi.fn().mockResolvedValue({ count: 6 }),
  DEEP_GEOPOLITICAL_ENTRY_COUNT: 6,
}));
vi.mock("@/lib/knowledge/ingest-structural", () => ({
  ingestStructuralKnowledge: vi.fn().mockResolvedValue({ count: 1 }),
  STRUCTURAL_ENTRY_COUNT: 1,
}));
vi.mock("@/lib/knowledge/live-ingest", () => ({
  refreshLiveKnowledge: vi.fn().mockResolvedValue({ refreshed: 5 }),
  expireStaleKnowledge: vi.fn().mockResolvedValue({ expired: 2 }),
}));
vi.mock("@/lib/auth/require-cron", () => ({
  requireCronOrAdmin: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/security/csrf", () => ({
  validateOrigin: vi.fn().mockReturnValue(null),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/knowledge", () => {
  it("returns knowledge list with stats", async () => {
    const { GET } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ entries: unknown[]; stats: unknown }>(res);
    expect(status).toBe(200);
    expect(data.entries).toBeDefined();
    expect(data.stats).toBeDefined();
  });

  it("returns single entry by id", async () => {
    const { GET } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge?id=1");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ entry: { id: number } }>(res);
    expect(status).toBe(200);
    expect(data.entry).toBeDefined();
  });

  it("returns 404 when entry not found", async () => {
    const { getKnowledgeById } = await import("@/lib/knowledge/engine");
    (getKnowledgeById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge?id=999");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns stats view", async () => {
    const { GET } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge?view=stats");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ stats: { total: number } }>(res);
    expect(status).toBe(200);
    expect(data.stats.total).toBe(10);
  });

  it("seeds on first access if empty", async () => {
    const { getKnowledgeStats } = await import("@/lib/knowledge/engine");
    const { seedKnowledge } = await import("@/lib/knowledge/seed");
    (getKnowledgeStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ total: 0, active: 0, archived: 0 });

    const { GET } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge?view=stats");
    await GET(req);
    expect(seedKnowledge).toHaveBeenCalled();
  });

  it("filters by category, status, search, tags", async () => {
    const { listKnowledge } = await import("@/lib/knowledge/engine");
    const { GET } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge?category=geo&status=active&search=test&tags=tag1,tag2");
    await GET(req);
    expect(listKnowledge).toHaveBeenCalledWith({
      category: "geo",
      status: "active",
      search: "test",
      tags: ["tag1", "tag2"],
    });
  });
});

describe("POST /api/knowledge", () => {
  it("creates a knowledge entry", async () => {
    const { POST } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "POST",
      body: { title: "Test", content: "Content", category: "geo" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse<{ entry: { id: number } }>(res);
    expect(status).toBe(200);
    expect(data.entry).toBeDefined();
  });

  it("returns 400 if required fields missing", async () => {
    const { POST } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "POST",
      body: { title: "Test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if title too long", async () => {
    const { POST } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "POST",
      body: { title: "x".repeat(501), content: "Content", category: "geo" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if content too long", async () => {
    const { POST } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "POST",
      body: { title: "Test", content: "x".repeat(100_001), category: "geo" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 on CSRF failure", async () => {
    const { validateOrigin } = await import("@/lib/security/csrf");
    (validateOrigin as ReturnType<typeof vi.fn>).mockReturnValueOnce("Origin not allowed");

    const { POST } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "POST",
      body: { title: "Test", content: "Content", category: "geo" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when tier check fails", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const { POST } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "POST",
      body: { title: "Test", content: "Content", category: "geo" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("handles seed action", async () => {
    const { POST } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge?action=seed", { method: "POST", body: {} });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("PUT /api/knowledge", () => {
  it("updates a knowledge entry", async () => {
    const { PUT } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "PUT",
      body: { id: 1, title: "Updated" },
    });
    const res = await PUT(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if id missing", async () => {
    const { PUT } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "PUT",
      body: { title: "Updated" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 if not found", async () => {
    const { updateKnowledge } = await import("@/lib/knowledge/engine");
    (updateKnowledge as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { PUT } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", {
      method: "PUT",
      body: { id: 999, title: "Updated" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/knowledge", () => {
  it("archives a knowledge entry", async () => {
    const { DELETE } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge?id=1", { method: "DELETE" });
    const res = await DELETE(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if id missing", async () => {
    const { DELETE } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 if not found", async () => {
    const { archiveKnowledge } = await import("@/lib/knowledge/engine");
    (archiveKnowledge as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { DELETE } = await import("@/app/api/knowledge/route");
    const req = createRequest("/api/knowledge?id=999", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/knowledge/embed", () => {
  it("embeds all knowledge", async () => {
    const { POST } = await import("@/app/api/knowledge/embed/route");
    const req = createRequest("/api/knowledge/embed", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("POST /api/knowledge/ingest", () => {
  it("ingests all packs when no pack specified", async () => {
    const { POST } = await import("@/app/api/knowledge/ingest/route");
    const req = createRequest("/api/knowledge/ingest", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("ingests specific pack", async () => {
    const { POST } = await import("@/app/api/knowledge/ingest/route");
    const req = createRequest("/api/knowledge/ingest?pack=deterministic", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("POST /api/knowledge/refresh", () => {
  it("refreshes live knowledge", async () => {
    const { POST } = await import("@/app/api/knowledge/refresh/route");
    const req = createRequest("/api/knowledge/refresh", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
