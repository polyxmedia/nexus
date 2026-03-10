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
      settings: { key: "key", value: "value", updatedAt: "updatedAt" },
    },
  };
});

vi.mock("@/lib/auth/auth", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { name: "testuser" } }),
}));
vi.mock("@/lib/security/csrf", () => ({
  validateOrigin: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn().mockImplementation((v: string) => `enc_${v}`),
  decrypt: vi.fn().mockImplementation((v: string) => v.replace("enc_", "")),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/settings", () => {
  it("returns settings for authenticated user", async () => {
    const { db } = await import("@/lib/db");
    const settings = [{ key: "trading_environment", value: "demo" }];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(settings),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 401 when not authenticated", async () => {
    const { getServerSession } = await import("next-auth/next");
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("masks sensitive keys", async () => {
    const { db } = await import("@/lib/db");
    const settings = [{ key: "testuser:anthropic_api_key", value: "enc_sk-ant-12345678" }];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(settings),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings");
    const res = await GET(req);
    const { data } = await parseResponse<Array<{ value: string }>>(res);
    expect(data[0].value).toContain("****");
  });
});

describe("POST /api/settings", () => {
  it("creates a setting", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true, configurable: true,
    });

    const { POST } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", {
      method: "POST",
      body: { key: "trading_environment", value: "demo" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse<{ success: boolean }>(res);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 400 if key or value missing", async () => {
    const { POST } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", { method: "POST", body: { key: "test" } });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 on CSRF failure", async () => {
    const { validateOrigin } = await import("@/lib/security/csrf");
    (validateOrigin as ReturnType<typeof vi.fn>).mockReturnValueOnce("Origin not allowed");

    const { POST } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", { method: "POST", body: { key: "test", value: "val" } });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    const { getServerSession } = await import("next-auth/next");
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", { method: "POST", body: { key: "test", value: "val" } });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin writing admin keys", async () => {
    const { db } = await import("@/lib/db");
    // Return non-admin user settings
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([{ key: "user:testuser", value: JSON.stringify({ role: "user", tier: "analyst" }) }]),
      writable: true, configurable: true,
    });

    const { POST } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", {
      method: "POST",
      body: { key: "system_prompt", value: "hacked" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin writing other user keys", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([{ key: "user:testuser", value: JSON.stringify({ role: "user" }) }]),
      writable: true, configurable: true,
    });

    const { POST } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", {
      method: "POST",
      body: { key: "otheruser:api_key", value: "stolen" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/settings", () => {
  it("deletes a setting", async () => {
    const { DELETE } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", {
      method: "DELETE",
      body: { key: "trading_environment" },
    });
    const res = await DELETE(req);
    const { status, data } = await parseResponse<{ success: boolean }>(res);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 400 if key missing", async () => {
    const { DELETE } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", { method: "DELETE", body: {} });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 on CSRF failure", async () => {
    const { validateOrigin } = await import("@/lib/security/csrf");
    (validateOrigin as ReturnType<typeof vi.fn>).mockReturnValueOnce("Origin not allowed");

    const { DELETE } = await import("@/app/api/settings/route");
    const req = createRequest("/api/settings", { method: "DELETE", body: { key: "test" } });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });
});
