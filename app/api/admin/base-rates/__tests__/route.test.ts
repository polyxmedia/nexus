import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { execute: vi.fn() } }));
vi.mock("drizzle-orm", () => ({ sql: vi.fn(() => ({})) }));

const mockSession = getServerSession as ReturnType<typeof vi.fn>;
const mockExecute = db.execute as ReturnType<typeof vi.fn>;

function setAdmin(isAdmin: boolean) {
  if (isAdmin) {
    mockSession.mockResolvedValue({ user: { role: "admin" } });
  } else {
    mockSession.mockResolvedValue({ user: { role: "user" } });
  }
}

// Must import handlers after mocks are set up
import { GET, PATCH, POST, DELETE } from "../route";

describe("GET /api/admin/base-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-admin users", async () => {
    setAdmin(false);
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns rates on success", async () => {
    setAdmin(true);
    const fakeRows = [
      { id: 1, category: "geopolitical", pattern: "conflict", base_rate: 0.3 },
    ];
    mockExecute.mockResolvedValue({ rows: fakeRows });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rates).toEqual(fakeRows);
  });

  it("returns 500 on DB error", async () => {
    setAdmin(true);
    mockExecute.mockRejectedValue(new Error("connection failed"));

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch base rates");
  });
});

describe("PATCH /api/admin/base-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/admin/base-rates", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }) as unknown as import("next/server").NextRequest;
  }

  it("returns 403 for non-admin users", async () => {
    setAdmin(false);
    const res = await PATCH(makeRequest({ id: 1, base_rate: 0.5 }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when id is missing", async () => {
    setAdmin(true);
    const res = await PATCH(makeRequest({ base_rate: 0.5 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("id and base_rate required");
  });

  it("returns 400 when base_rate is missing", async () => {
    setAdmin(true);
    const res = await PATCH(makeRequest({ id: 1 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("id and base_rate required");
  });

  it("returns 400 when base_rate is below 0", async () => {
    setAdmin(true);
    const res = await PATCH(makeRequest({ id: 1, base_rate: -0.1 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("base_rate must be between 0 and 1");
  });

  it("returns 400 when base_rate is above 1", async () => {
    setAdmin(true);
    const res = await PATCH(makeRequest({ id: 1, base_rate: 1.5 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("base_rate must be between 0 and 1");
  });

  it("updates successfully with valid data", async () => {
    setAdmin(true);
    mockExecute.mockResolvedValue({ rows: [] });

    const res = await PATCH(
      makeRequest({ id: 1, base_rate: 0.4, label: "Updated label" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockExecute).toHaveBeenCalled();
  });

  it("returns 500 on DB error", async () => {
    setAdmin(true);
    mockExecute.mockRejectedValue(new Error("db failure"));

    const res = await PATCH(makeRequest({ id: 1, base_rate: 0.5 }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to update base rate");
  });
});

describe("POST /api/admin/base-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/admin/base-rates", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }) as unknown as import("next/server").NextRequest;
  }

  const validBody = {
    category: "geopolitical",
    pattern: "conflict_escalation",
    label: "Conflict Escalation",
    base_rate: 0.25,
  };

  it("returns 403 for non-admin users", async () => {
    setAdmin(false);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when category is missing", async () => {
    setAdmin(true);
    const { category, ...rest } = validBody;
    const res = await POST(makeRequest(rest));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("category, pattern, label, and base_rate required");
  });

  it("returns 400 when pattern is missing", async () => {
    setAdmin(true);
    const { pattern, ...rest } = validBody;
    const res = await POST(makeRequest(rest));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("category, pattern, label, and base_rate required");
  });

  it("returns 400 when label is missing", async () => {
    setAdmin(true);
    const { label, ...rest } = validBody;
    const res = await POST(makeRequest(rest));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("category, pattern, label, and base_rate required");
  });

  it("returns 400 when base_rate is missing", async () => {
    setAdmin(true);
    const { base_rate, ...rest } = validBody;
    const res = await POST(makeRequest(rest));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("category, pattern, label, and base_rate required");
  });

  it("returns 400 when base_rate is below 0", async () => {
    setAdmin(true);
    const res = await POST(makeRequest({ ...validBody, base_rate: -0.5 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("base_rate must be between 0 and 1");
  });

  it("returns 400 when base_rate is above 1", async () => {
    setAdmin(true);
    const res = await POST(makeRequest({ ...validBody, base_rate: 2.0 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("base_rate must be between 0 and 1");
  });

  it("creates successfully and returns the new rate", async () => {
    setAdmin(true);
    const newRow = { id: 5, ...validBody };
    mockExecute.mockResolvedValue({ rows: [newRow] });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rate).toEqual(newRow);
    expect(mockExecute).toHaveBeenCalled();
  });

  it("returns 409 on duplicate pattern (unique constraint)", async () => {
    setAdmin(true);
    mockExecute.mockRejectedValue(new Error("unique constraint violation"));

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Pattern already exists for this category");
  });

  it("returns 409 on duplicate key error", async () => {
    setAdmin(true);
    mockExecute.mockRejectedValue(new Error("duplicate key value"));

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Pattern already exists for this category");
  });

  it("returns 500 on generic DB error", async () => {
    setAdmin(true);
    mockExecute.mockRejectedValue(new Error("connection lost"));

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create base rate");
  });
});

describe("DELETE /api/admin/base-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(id?: string) {
    const url = id
      ? `http://localhost/api/admin/base-rates?id=${id}`
      : "http://localhost/api/admin/base-rates";
    return new Request(url, {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;
  }

  it("returns 403 for non-admin users", async () => {
    setAdmin(false);
    const res = await DELETE(makeRequest("1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when id is missing", async () => {
    setAdmin(true);
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("id required");
  });

  it("deletes successfully", async () => {
    setAdmin(true);
    mockExecute.mockResolvedValue({ rows: [] });

    const res = await DELETE(makeRequest("42"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockExecute).toHaveBeenCalled();
  });

  it("returns 500 on DB error", async () => {
    setAdmin(true);
    mockExecute.mockRejectedValue(new Error("db failure"));

    const res = await DELETE(makeRequest("1"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to delete base rate");
  });
});
