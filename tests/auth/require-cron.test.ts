import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock next-auth (routes import from "next-auth", not "next-auth/next")
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
    },
    schema: {
      settings: { key: "key", value: "value" },
    },
  };
});

describe("requireCronOrAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.CRON_SECRET;
    mockGetServerSession.mockReset();
  });

  it("authorizes valid CRON_SECRET bearer token", async () => {
    process.env.CRON_SECRET = "test-secret-123";
    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer test-secret-123" },
    });

    const result = await requireCronOrAdmin(request);
    expect(result).toBeNull();
    // Should not even check session
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it("rejects invalid CRON_SECRET and falls to session check", async () => {
    process.env.CRON_SECRET = "test-secret-123";
    mockGetServerSession.mockResolvedValue(null);

    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const result = await requireCronOrAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("rejects missing authorization header when no session", async () => {
    process.env.CRON_SECRET = "test-secret-123";
    mockGetServerSession.mockResolvedValue(null);

    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireCronOrAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("authorizes admin user via session", async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: "adminuser" }, expires: "" });

    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) =>
        resolve([{ key: "user:adminuser", value: JSON.stringify({ role: "admin" }) }]),
      writable: true,
      configurable: true,
    });

    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireCronOrAdmin(request);
    expect(result).toBeNull();
  });

  it("returns 403 for authenticated non-admin user", async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: "regularuser" }, expires: "" });

    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) =>
        resolve([{ key: "user:regularuser", value: JSON.stringify({ role: "user" }) }]),
      writable: true,
      configurable: true,
    });

    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireCronOrAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 401 for unauthenticated request (no session, no token)", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireCronOrAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const body = await result!.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user has no settings entry", async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: "newuser" }, expires: "" });

    // Default mock returns empty array (no settings found)
    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireCronOrAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns 403 when user settings contain invalid JSON", async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: "baduser" }, expires: "" });

    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) =>
        resolve([{ key: "user:baduser", value: "not-valid-json{{{" }]),
      writable: true,
      configurable: true,
    });

    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireCronOrAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("falls through to session check when CRON_SECRET env is not set", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");

    const request = new Request("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer some-token" },
    });

    const result = await requireCronOrAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});
