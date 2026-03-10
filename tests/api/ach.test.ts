vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn().mockResolvedValue({
    result: { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username: "testuser" },
  }),
}));

vi.mock("@/lib/ach/engine", () => ({
  listAnalyses: vi.fn().mockResolvedValue([{ id: 1, title: "Test Analysis", question: "What if?" }]),
  createAnalysis: vi.fn().mockResolvedValue({ id: 1, title: "New Analysis", question: "Test?" }),
  getAnalysis: vi.fn().mockResolvedValue({ id: 1, title: "Test", hypotheses: [], evidence: [], ratings: [] }),
  deleteAnalysis: vi.fn().mockResolvedValue({ success: true }),
  addHypothesis: vi.fn().mockResolvedValue({ id: 1, label: "H1" }),
  addEvidence: vi.fn().mockResolvedValue({ id: 1, description: "E1" }),
  rateEvidence: vi.fn().mockResolvedValue({ success: true }),
  evaluateMatrix: vi.fn().mockResolvedValue({ rankings: [], inconsistencies: [] }),
  aiAssistAnalysis: vi.fn().mockResolvedValue({ suggestions: [] }),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/ach", () => {
  it("returns analyses list", async () => {
    const { GET } = await import("@/app/api/ach/route");
    const req = createRequest("/api/ach");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ analyses: unknown[] }>(res);
    expect(status).toBe(200);
    expect(data.analyses).toBeDefined();
  });

  it("returns 401 when not authorized", async () => {
    const { requireTier } = await import("@/lib/auth/require-tier");
    (requireTier as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { GET } = await import("@/app/api/ach/route");
    const req = createRequest("/api/ach");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/ach", () => {
  it("creates an analysis", async () => {
    const { POST } = await import("@/app/api/ach/route");
    const req = createRequest("/api/ach", {
      method: "POST",
      body: { title: "New Analysis", question: "What if?" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if title missing", async () => {
    const { POST } = await import("@/app/api/ach/route");
    const req = createRequest("/api/ach", {
      method: "POST",
      body: { question: "What?" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/ach/[analysisId]", () => {
  it("returns analysis with evaluation", async () => {
    const { GET } = await import("@/app/api/ach/[analysisId]/route");
    const req = createRequest("/api/ach/1");
    const res = await GET(req, { params: Promise.resolve({ analysisId: "1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    const { getAnalysis } = await import("@/lib/ach/engine");
    (getAnalysis as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/ach/[analysisId]/route");
    const req = createRequest("/api/ach/999");
    const res = await GET(req, { params: Promise.resolve({ analysisId: "999" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/ach/[analysisId]", () => {
  it("deletes an analysis", async () => {
    const { DELETE } = await import("@/app/api/ach/[analysisId]/route");
    const req = createRequest("/api/ach/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ analysisId: "1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("POST /api/ach/[analysisId]/hypotheses", () => {
  it("adds a hypothesis", async () => {
    const { POST } = await import("@/app/api/ach/[analysisId]/hypotheses/route");
    const req = createRequest("/api/ach/1/hypotheses", {
      method: "POST",
      body: { label: "H1", description: "Hypothesis 1" },
    });
    const res = await POST(req, { params: Promise.resolve({ analysisId: "1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if label missing", async () => {
    const { POST } = await import("@/app/api/ach/[analysisId]/hypotheses/route");
    const req = createRequest("/api/ach/1/hypotheses", {
      method: "POST",
      body: { description: "Missing label" },
    });
    const res = await POST(req, { params: Promise.resolve({ analysisId: "1" }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/ach/[analysisId]/evidence", () => {
  it("adds evidence", async () => {
    const { POST } = await import("@/app/api/ach/[analysisId]/evidence/route");
    const req = createRequest("/api/ach/1/evidence", {
      method: "POST",
      body: { description: "Evidence 1", source: "Reuters", credibility: 0.9, relevance: 0.8 },
    });
    const res = await POST(req, { params: Promise.resolve({ analysisId: "1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if description missing", async () => {
    const { POST } = await import("@/app/api/ach/[analysisId]/evidence/route");
    const req = createRequest("/api/ach/1/evidence", {
      method: "POST",
      body: { source: "Reuters" },
    });
    const res = await POST(req, { params: Promise.resolve({ analysisId: "1" }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/ach/[analysisId]/ratings", () => {
  it("rates evidence against hypothesis", async () => {
    const { POST } = await import("@/app/api/ach/[analysisId]/ratings/route");
    const req = createRequest("/api/ach/1/ratings", {
      method: "POST",
      body: { hypothesisId: 1, evidenceId: 1, rating: "consistent" },
    });
    const res = await POST(req, { params: Promise.resolve({ analysisId: "1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if required fields missing", async () => {
    const { POST } = await import("@/app/api/ach/[analysisId]/ratings/route");
    const req = createRequest("/api/ach/1/ratings", {
      method: "POST",
      body: { hypothesisId: 1 },
    });
    const res = await POST(req, { params: Promise.resolve({ analysisId: "1" }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/ach/[analysisId]/evaluate", () => {
  it("evaluates the matrix", async () => {
    const { POST } = await import("@/app/api/ach/[analysisId]/evaluate/route");
    const req = createRequest("/api/ach/1/evaluate", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ analysisId: "1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});

describe("POST /api/ach/[analysisId]/ai-assist", () => {
  it("runs AI-assisted analysis", async () => {
    const { POST } = await import("@/app/api/ach/[analysisId]/ai-assist/route");
    const req = createRequest("/api/ach/1/ai-assist", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ analysisId: "1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
