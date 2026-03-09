/**
 * Comprehensive API route tests for the NEXUS platform.
 *
 * Strategy: mock auth helpers (getServerSession, requireTier, creditGate,
 * getEffectiveUsername) and the database layer so tests run fast and offline.
 * Each test validates:
 *   - Auth / tier gating returns the correct status code
 *   - Input validation rejects bad payloads
 *   - Happy-path returns expected shape
 *   - Ownership checks prevent cross-user access
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// ── Shared mock state ──────────────────────────────────────────────

let mockSession: { user: { name: string } } | null = null;
let mockTierResult: Record<string, unknown> | null = null;
let mockTierResponse: { status: number; json: unknown } | null = null;
let mockCreditGateResult: Record<string, unknown> | null = null;
let mockCreditGateResponse: { status: number; json: unknown } | null = null;
let mockEffectiveUsername: string | null = null;
let mockIsAdmin = false;

// ── Mock next-auth ─────────────────────────────────────────────────

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// ── Mock auth helpers ──────────────────────────────────────────────

vi.mock("@/lib/auth/auth", () => ({
  authOptions: {},
  hashPassword: vi.fn((p: string) => Promise.resolve(`hashed_${p}`)),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth/require-tier", () => ({
  requireTier: vi.fn((_minTier: string) => {
    if (mockTierResponse) {
      const { NextResponse } = require("next/server");
      return Promise.resolve({
        response: NextResponse.json(mockTierResponse.json, { status: mockTierResponse.status }),
      });
    }
    return Promise.resolve({ result: mockTierResult });
  }),
}));

vi.mock("@/lib/credits/gate", () => ({
  creditGate: vi.fn(() => {
    if (mockCreditGateResponse) {
      const { NextResponse } = require("next/server");
      return Promise.resolve({
        response: NextResponse.json(mockCreditGateResponse.json, { status: mockCreditGateResponse.status }),
        username: "",
        tier: "free",
        isAdmin: false,
        debit: vi.fn(),
      });
    }
    return Promise.resolve({
      ...mockCreditGateResult,
      debit: vi.fn(),
    });
  }),
}));

vi.mock("@/lib/auth/effective-user", () => ({
  getEffectiveUsername: vi.fn(() => Promise.resolve(mockEffectiveUsername)),
}));

// ── Mock database ──────────────────────────────────────────────────

const mockDbRows: Record<string, unknown[]> = {};

function setDbRows(table: string, rows: unknown[]) {
  mockDbRows[table] = rows;
}

function getDbRows(table: string): unknown[] {
  return mockDbRows[table] || [];
}

// Track inserts for assertion
const insertedRows: Record<string, unknown[]> = {};
const updatedRows: Record<string, unknown[]> = {};
const deletedTables: string[] = [];

const chainableQuery = (tableName: string) => {
  const rows = () => getDbRows(tableName);
  const chain: Record<string, unknown> = {
    where: vi.fn().mockImplementation(() => chain),
    orderBy: vi.fn().mockImplementation(() => chain),
    limit: vi.fn().mockImplementation(() => chain),
    groupBy: vi.fn().mockImplementation(() => chain),
    then: (resolve: (val: unknown) => void) => resolve(rows()),
    [Symbol.toStringTag]: "Promise",
  };
  // Make it thenable
  Object.defineProperty(chain, "then", {
    value: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) => {
      try {
        return Promise.resolve(rows()).then(resolve, reject);
      } catch (e) {
        return reject ? reject(e) : Promise.reject(e);
      }
    },
  });
  return chain;
};

const mockDb = {
  select: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation((table: { _name?: string } | unknown) => {
      const name = (table as Record<string, string>)?._name || "unknown";
      return chainableQuery(name);
    }),
  })),
  insert: vi.fn().mockImplementation((table: { _name?: string } | unknown) => {
    const name = (table as Record<string, string>)?._name || "unknown";
    return {
      values: vi.fn().mockImplementation((vals: unknown) => {
        if (!insertedRows[name]) insertedRows[name] = [];
        insertedRows[name].push(vals);
        return {
          returning: vi.fn().mockResolvedValue([{ id: 1, uuid: "test-uuid", ...vals as object }]),
          then: (resolve: (val: unknown) => void) => resolve(undefined),
          [Symbol.toStringTag]: "Promise",
        };
      }),
    };
  }),
  update: vi.fn().mockImplementation((table: { _name?: string } | unknown) => {
    const name = (table as Record<string, string>)?._name || "unknown";
    return {
      set: vi.fn().mockImplementation((vals: unknown) => {
        if (!updatedRows[name]) updatedRows[name] = [];
        updatedRows[name].push(vals);
        return {
          where: vi.fn().mockImplementation(() => ({
            returning: vi.fn().mockResolvedValue([{ id: 1, ...vals as object }]),
            then: (resolve: (val: unknown) => void) => resolve(undefined),
            [Symbol.toStringTag]: "Promise",
          })),
        };
      }),
    };
  }),
  delete: vi.fn().mockImplementation((table: { _name?: string } | unknown) => {
    const name = (table as Record<string, string>)?._name || "unknown";
    deletedTables.push(name);
    return {
      where: vi.fn().mockResolvedValue(undefined),
    };
  }),
};

// Proxy the schema to return objects with _name for table identification
const schemaProxy = new Proxy({}, {
  get(_target, prop) {
    return { _name: String(prop) };
  },
});

vi.mock("@/lib/db", () => ({
  db: mockDb,
  schema: schemaProxy,
}));

// ── Mock remaining deps ────────────────────────────────────────────

vi.mock("@/lib/security/csrf", () => ({
  validateOrigin: vi.fn(() => null), // no CSRF error by default
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => `enc_${v}`),
  decrypt: vi.fn((v: string) => v.replace("enc_", "")),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  getUserEmail: vi.fn().mockResolvedValue("test@example.com"),
}));

vi.mock("@/lib/email/templates", () => ({
  welcomeEmail: vi.fn(() => ({ subject: "Welcome", html: "<p>Welcome</p>" })),
  ticketOpenedEmail: vi.fn(() => ({ subject: "Ticket", html: "<p>Ticket</p>" })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ allowed: true, remaining: 4, resetAt: Date.now() + 3600000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/gex", () => ({
  getGEXSnapshot: vi.fn(() =>
    Promise.resolve({
      summaries: [{ flowDivergence: { detected: false } }],
      aggregateRegime: "dampening",
      opex: { daysUntil: 10 },
      lastUpdated: new Date().toISOString(),
    })
  ),
}));

vi.mock("@/lib/bocpd", () => ({
  getBOCPDSnapshot: vi.fn(() =>
    Promise.resolve({
      streams: [],
      recentChangePoints: [],
      coincidences: [],
      activeRegimes: 0,
      generatedAt: new Date().toISOString(),
    })
  ),
}));

vi.mock("@/lib/analysis/claude", () => ({
  analyzeSignal: vi.fn(() =>
    Promise.resolve({
      signalId: 1,
      summary: "Test analysis",
      assessment: "neutral",
      createdAt: new Date().toISOString(),
    })
  ),
}));

vi.mock("@/lib/analysis/red-team", () => ({
  runRedTeamAssessment: vi.fn().mockResolvedValue({ challenged: false }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: "https://checkout.stripe.com/test",
          client_secret: "cs_test_123",
        }),
      },
    },
  })),
}));

vi.mock("@/lib/news/feeds", () => ({
  getNewsFeed: vi.fn(() => Promise.resolve([])),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Map())),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("@/lib/auth/impersonation", () => ({
  getImpersonationFromCookie: vi.fn().mockResolvedValue(null),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  not: vi.fn((...args: unknown[]) => ({ type: "not", args })),
  like: vi.fn((...args: unknown[]) => ({ type: "like", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  asc: vi.fn((...args: unknown[]) => ({ type: "asc", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  isNotNull: vi.fn((...args: unknown[]) => ({ type: "isNotNull", args })),
  sql: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function jsonBody(data: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function patchBody(data: unknown): RequestInit {
  return {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function deleteBody(data: unknown): RequestInit {
  return {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

// Auth setup helpers
function asUnauthenticated() {
  mockSession = null;
  mockTierResponse = { status: 401, json: { error: "Unauthorized", upgrade: true } };
  mockCreditGateResponse = { status: 401, json: { error: "Unauthorized" } };
  mockEffectiveUsername = null;
  mockIsAdmin = false;
}

function asAnalyst(username = "testuser") {
  mockSession = { user: { name: username } };
  mockTierResult = { authorized: true, tier: "analyst", tierLevel: 1, limits: {}, username };
  mockTierResponse = null;
  mockCreditGateResult = { username, tier: "analyst", isAdmin: false };
  mockCreditGateResponse = null;
  mockEffectiveUsername = username;
  mockIsAdmin = false;
}

function asOperator(username = "testuser") {
  mockSession = { user: { name: username } };
  mockTierResult = { authorized: true, tier: "operator", tierLevel: 2, limits: {}, username };
  mockTierResponse = null;
  mockCreditGateResult = { username, tier: "operator", isAdmin: false };
  mockCreditGateResponse = null;
  mockEffectiveUsername = username;
  mockIsAdmin = false;
}

function asAdmin(username = "admin") {
  mockSession = { user: { name: username } };
  mockTierResult = { authorized: true, tier: "institution", tierLevel: 3, limits: {}, username };
  mockTierResponse = null;
  mockCreditGateResult = { username, tier: "institution", isAdmin: true };
  mockCreditGateResponse = null;
  mockEffectiveUsername = username;
  mockIsAdmin = true;
  // Admin role lookup
  setDbRows("settings", [{ key: `user:${username}`, value: JSON.stringify({ role: "admin", tier: "institution" }) }]);
}

function asFreeUser(username = "freeuser") {
  mockSession = { user: { name: username } };
  mockTierResult = null;
  mockTierResponse = { status: 403, json: { error: "Requires analyst", requiredTier: "analyst", currentTier: "free", upgrade: true } };
  mockCreditGateResult = null;
  mockCreditGateResponse = { status: 429, json: { error: "Monthly credits exhausted", upgrade: true, topup: true, creditsRemaining: 0 } };
  mockEffectiveUsername = username;
  mockIsAdmin = false;
}

// Reset state before each test
beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockDbRows).forEach((k) => delete mockDbRows[k]);
  Object.keys(insertedRows).forEach((k) => delete insertedRows[k]);
  Object.keys(updatedRows).forEach((k) => delete updatedRows[k]);
  deletedTables.length = 0;
  asUnauthenticated();
});

// ────────────────────────────────────────────────────────────────────
// AUTH ROUTES
// ────────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/auth/register/route");
    POST = mod.POST;
    setDbRows("settings", []); // no existing users
  });

  it("rejects missing fields", async () => {
    const res = await POST(makeRequest("/api/auth/register", jsonBody({})));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("required");
  });

  it("rejects invalid email", async () => {
    const res = await POST(makeRequest("/api/auth/register", jsonBody({
      username: "testuser",
      password: "securepassword1",
      email: "not-an-email",
    })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("email");
  });

  it("rejects short username", async () => {
    const res = await POST(makeRequest("/api/auth/register", jsonBody({
      username: "ab",
      password: "securepassword1",
      email: "test@example.com",
    })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("3-32 characters");
  });

  it("rejects username with special chars", async () => {
    const res = await POST(makeRequest("/api/auth/register", jsonBody({
      username: "bad user!",
      password: "securepassword1",
      email: "test@example.com",
    })));
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await POST(makeRequest("/api/auth/register", jsonBody({
      username: "testuser",
      password: "short",
      email: "test@example.com",
    })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("10 characters");
  });

  it("rejects duplicate username", async () => {
    setDbRows("settings", [{ key: "user:testuser", value: "{}" }]);
    const res = await POST(makeRequest("/api/auth/register", jsonBody({
      username: "testuser",
      password: "securepassword1",
      email: "test@example.com",
    })));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("already taken");
  });

  it("succeeds with valid input", async () => {
    const res = await POST(makeRequest("/api/auth/register", jsonBody({
      username: "newuser",
      password: "securepassword1",
      email: "new@example.com",
    })));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────
// SETTINGS ROUTES
// ────────────────────────────────────────────────────────────────────

describe("/api/settings", () => {
  let GET: (req: NextRequest) => Promise<Response>;
  let POST: (req: NextRequest) => Promise<Response>;
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/settings/route");
    GET = mod.GET;
    POST = mod.POST;
    DELETE = mod.DELETE;
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await GET(makeRequest("/api/settings"));
      expect(res.status).toBe(401);
    });

    it("returns settings for authenticated user", async () => {
      asAnalyst("alice");
      setDbRows("settings", [
        { key: "alice:theme", value: "dark" },
        { key: "system_prompt", value: "You are an analyst" },
      ]);
      const res = await GET(makeRequest("/api/settings"));
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await POST(makeRequest("/api/settings", jsonBody({ key: "foo", value: "bar" })));
      expect(res.status).toBe(401);
    });

    it("rejects missing key", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/settings", jsonBody({ value: "bar" })));
      expect(res.status).toBe(400);
    });

    it("rejects missing value", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/settings", jsonBody({ key: "foo" })));
      expect(res.status).toBe(400);
    });

    it("prevents non-admin from writing admin keys", async () => {
      asAnalyst("alice");
      setDbRows("settings", []);
      const res = await POST(makeRequest("/api/settings", jsonBody({ key: "system_prompt", value: "hacked" })));
      expect(res.status).toBe(403);
    });

    it("prevents non-admin from writing other user's keys", async () => {
      asAnalyst("alice");
      setDbRows("settings", []);
      const res = await POST(makeRequest("/api/settings", jsonBody({ key: "bob:theme", value: "light" })));
      expect(res.status).toBe(403);
    });

    it("allows user to write own scoped key", async () => {
      asAnalyst("alice");
      setDbRows("settings", []);
      const res = await POST(makeRequest("/api/settings", jsonBody({ key: "alice:theme", value: "dark" })));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await DELETE(makeRequest("/api/settings", deleteBody({ key: "foo" })));
      expect(res.status).toBe(401);
    });

    it("rejects missing key", async () => {
      asAnalyst();
      const res = await DELETE(makeRequest("/api/settings", deleteBody({})));
      expect(res.status).toBe(400);
    });

    it("prevents non-admin from deleting user keys", async () => {
      asAnalyst("alice");
      const res = await DELETE(makeRequest("/api/settings", deleteBody({ key: "user:bob" })));
      expect(res.status).toBe(403);
    });

    it("prevents non-admin from deleting other user's keys", async () => {
      asAnalyst("alice");
      const res = await DELETE(makeRequest("/api/settings", deleteBody({ key: "bob:theme" })));
      expect(res.status).toBe(403);
    });

    it("allows user to delete own key", async () => {
      asAnalyst("alice");
      const res = await DELETE(makeRequest("/api/settings", deleteBody({ key: "alice:theme" })));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// PREDICTIONS ROUTES
// ────────────────────────────────────────────────────────────────────

describe("/api/predictions", () => {
  let GET: (req: NextRequest) => Promise<Response>;
  let POST: (req: NextRequest) => Promise<Response>;
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/predictions/route");
    GET = mod.GET;
    POST = mod.POST;
    PATCH = mod.PATCH;
  });

  describe("GET", () => {
    it("returns 401/403 when unauthenticated (tier-gated)", async () => {
      asUnauthenticated();
      const res = await GET(makeRequest("/api/predictions"));
      expect([401, 403]).toContain(res.status);
    });

    it("returns predictions for analyst tier", async () => {
      asAnalyst();
      setDbRows("predictions", [
        { id: 1, claim: "Test prediction", outcome: null },
        { id: 2, claim: "Resolved prediction", outcome: "correct" },
      ]);
      const res = await GET(makeRequest("/api/predictions"));
      expect(res.status).toBe(200);
    });

    it("filters by status=pending", async () => {
      asAnalyst();
      setDbRows("predictions", [
        { id: 1, claim: "Pending", outcome: null },
        { id: 2, claim: "Resolved", outcome: "correct" },
      ]);
      const res = await GET(makeRequest("/api/predictions?status=pending"));
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("rejects missing required fields", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/predictions", jsonBody({ claim: "Test" })));
      expect(res.status).toBe(400);
    });

    it("creates prediction with valid input", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/predictions", jsonBody({
        claim: "Oil will rise 10%",
        timeframe: "1 month",
        deadline: "2026-04-09",
        confidence: 75,
        category: "commodity",
      })));
      expect(res.status).toBe(200);
    });
  });

  describe("PATCH", () => {
    it("rejects missing uuid/id", async () => {
      asAnalyst();
      const res = await PATCH(makeRequest("/api/predictions", patchBody({ outcome: "correct" })));
      expect(res.status).toBe(400);
    });

    it("rejects missing outcome", async () => {
      asAnalyst();
      const res = await PATCH(makeRequest("/api/predictions", patchBody({ uuid: "test-uuid" })));
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent prediction", async () => {
      asAnalyst();
      setDbRows("predictions", []);
      const res = await PATCH(makeRequest("/api/predictions", patchBody({ uuid: "no-such-uuid", outcome: "correct" })));
      expect(res.status).toBe(404);
    });

    it("resolves prediction with valid input", async () => {
      asAnalyst();
      setDbRows("predictions", [{ id: 1, uuid: "test-uuid" }]);
      const res = await PATCH(makeRequest("/api/predictions", patchBody({
        uuid: "test-uuid",
        outcome: "correct",
        outcomeNotes: "As predicted",
      })));
      expect(res.status).toBe(200);
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// CHAT SESSIONS ROUTES
// ────────────────────────────────────────────────────────────────────

describe("/api/chat/sessions", () => {
  let GET: (req: NextRequest) => Promise<Response>;
  let POST: (req: NextRequest) => Promise<Response>;
  let PATCH: (req: NextRequest) => Promise<Response>;
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/chat/sessions/route");
    GET = mod.GET;
    POST = mod.POST;
    PATCH = mod.PATCH;
    DELETE = mod.DELETE;
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await GET(makeRequest("/api/chat/sessions"));
      expect(res.status).toBe(401);
    });

    it("returns sessions for authenticated user", async () => {
      asAnalyst("alice");
      setDbRows("chatSessions", [
        { id: 1, title: "Test Chat", userId: "alice", updatedAt: new Date().toISOString(), tags: null, projectId: null },
      ]);
      const res = await GET(makeRequest("/api/chat/sessions"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sessions).toBeDefined();
    });
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await POST(makeRequest("/api/chat/sessions", jsonBody({})));
      expect(res.status).toBe(401);
    });

    it("creates new chat session", async () => {
      asAnalyst("alice");
      const res = await POST(makeRequest("/api/chat/sessions", jsonBody({})));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.session).toBeDefined();
    });
  });

  describe("PATCH", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await PATCH(makeRequest("/api/chat/sessions", patchBody({ id: 1, title: "Updated" })));
      expect(res.status).toBe(401);
    });

    it("rejects missing ID", async () => {
      asAnalyst();
      const res = await PATCH(makeRequest("/api/chat/sessions", patchBody({ title: "Updated" })));
      expect(res.status).toBe(400);
    });

    it("prevents editing other user's session (ownership check)", async () => {
      asAnalyst("alice");
      setDbRows("chatSessions", [{ id: 1, userId: "bob", title: "Bob's Chat" }]);
      const res = await PATCH(makeRequest("/api/chat/sessions", patchBody({ id: 1, title: "Hacked" })));
      expect(res.status).toBe(403);
    });

    it("updates own session", async () => {
      asAnalyst("alice");
      setDbRows("chatSessions", [{ id: 1, userId: "alice", title: "My Chat" }]);
      const res = await PATCH(makeRequest("/api/chat/sessions", patchBody({ id: 1, title: "Updated Chat" })));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await DELETE(makeRequest("/api/chat/sessions", deleteBody({ id: 1 })));
      expect(res.status).toBe(401);
    });

    it("rejects missing ID", async () => {
      asAnalyst();
      const res = await DELETE(makeRequest("/api/chat/sessions", deleteBody({})));
      expect(res.status).toBe(400);
    });

    it("prevents deleting other user's session", async () => {
      asAnalyst("alice");
      setDbRows("chatSessions", [{ id: 1, userId: "bob" }]);
      const res = await DELETE(makeRequest("/api/chat/sessions", deleteBody({ id: 1 })));
      expect(res.status).toBe(403);
    });

    it("deletes own session (cascades to messages)", async () => {
      asAnalyst("alice");
      setDbRows("chatSessions", [{ id: 1, userId: "alice" }]);
      const res = await DELETE(makeRequest("/api/chat/sessions", deleteBody({ id: 1 })));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// DASHBOARD WIDGETS ROUTES
// ────────────────────────────────────────────────────────────────────

describe("/api/dashboard/widgets", () => {
  let GET: () => Promise<Response>;
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/dashboard/widgets/route");
    GET = mod.GET;
    POST = mod.POST;
  });

  describe("GET", () => {
    it("returns 401/403 for free user", async () => {
      asFreeUser();
      const res = await GET();
      expect([401, 403]).toContain(res.status);
    });

    it("returns widgets for analyst", async () => {
      asAnalyst();
      setDbRows("dashboardWidgets", [
        { id: 1, userId: "default", widgetType: "metric", title: "Threat Level", position: 0 },
      ]);
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.widgets).toBeDefined();
    });
  });

  describe("POST", () => {
    it("returns 401/403 for free user", async () => {
      asFreeUser();
      const res = await POST(makeRequest("/api/dashboard/widgets", jsonBody({ action: "add", widgetType: "metric", title: "Test" })));
      expect([401, 403]).toContain(res.status);
    });

    it("adds a widget", async () => {
      asAnalyst();
      setDbRows("dashboardWidgets", []);
      const res = await POST(makeRequest("/api/dashboard/widgets", jsonBody({
        action: "add",
        widgetType: "chart",
        title: "My Chart",
        config: { symbol: "AAPL" },
      })));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBeDefined();
    });

    it("removes a widget", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/dashboard/widgets", jsonBody({ action: "remove", id: 1 })));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("reorders widgets", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/dashboard/widgets", jsonBody({ action: "reorder", order: [3, 1, 2] })));
      expect(res.status).toBe(200);
    });

    it("updates a widget", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/dashboard/widgets", jsonBody({ action: "update", id: 1, title: "Updated" })));
      expect(res.status).toBe(200);
    });

    it("resets widgets to default", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/dashboard/widgets", jsonBody({ action: "reset" })));
      expect(res.status).toBe(200);
    });

    it("rejects invalid action", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/dashboard/widgets", jsonBody({ action: "invalid" })));
      expect(res.status).toBe(400);
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// ANALYSIS ROUTES
// ────────────────────────────────────────────────────────────────────

describe("/api/analysis", () => {
  let GET: (req: NextRequest) => Promise<Response>;
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/analysis/route");
    GET = mod.GET;
    POST = mod.POST;
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated (credit-gated)", async () => {
      asUnauthenticated();
      const res = await POST(makeRequest("/api/analysis", jsonBody({ signalId: 1 })));
      expect(res.status).toBe(401);
    });

    it("returns 429 when credits exhausted", async () => {
      asFreeUser();
      const res = await POST(makeRequest("/api/analysis", jsonBody({ signalId: 1 })));
      expect(res.status).toBe(429);
    });

    it("rejects missing signalId", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/analysis", jsonBody({})));
      expect(res.status).toBe(400);
    });

    it("rejects non-numeric signalId", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/analysis", jsonBody({ signalId: "abc" })));
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent signal", async () => {
      asAnalyst();
      setDbRows("signals", []);
      const res = await POST(makeRequest("/api/analysis", jsonBody({ signalId: 999 })));
      expect(res.status).toBe(404);
    });

    it("creates analysis for valid signal", async () => {
      asAnalyst();
      setDbRows("signals", [{ id: 1, title: "Test Signal" }]);
      setDbRows("settings", [{ key: "anthropic_api_key", value: "sk-test" }]);
      const res = await POST(makeRequest("/api/analysis", jsonBody({ signalId: 1 })));
      expect(res.status).toBe(200);
    });
  });

  describe("GET", () => {
    it("returns analyses", async () => {
      setDbRows("analyses", [{ id: 1, signalId: 1, summary: "Analysis" }]);
      const res = await GET(makeRequest("/api/analysis"));
      expect(res.status).toBe(200);
    });

    it("filters by signalId", async () => {
      setDbRows("analyses", [{ id: 1, signalId: 1 }]);
      const res = await GET(makeRequest("/api/analysis?signalId=1"));
      expect(res.status).toBe(200);
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// GEX ROUTE (operator tier)
// ────────────────────────────────────────────────────────────────────

describe("GET /api/gex", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/gex/route");
    GET = mod.GET;
  });

  it("returns 401/403 for unauthenticated user", async () => {
    asUnauthenticated();
    const res = await GET(makeRequest("/api/gex"));
    expect([401, 403]).toContain(res.status);
  });

  it("returns 401/403 for analyst tier (requires operator)", async () => {
    // Analyst trying to access operator endpoint
    mockSession = { user: { name: "testuser" } };
    mockTierResponse = { status: 403, json: { error: "Requires operator", requiredTier: "operator", currentTier: "analyst", upgrade: true } };
    const res = await GET(makeRequest("/api/gex"));
    expect(res.status).toBe(403);
  });

  it("rejects invalid ticker", async () => {
    asOperator();
    setDbRows("signals", []);
    const res = await GET(makeRequest("/api/gex?ticker=INVALID"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid ticker");
  });

  it("returns GEX snapshot for operator", async () => {
    asOperator();
    setDbRows("signals", []);
    const res = await GET(makeRequest("/api/gex?ticker=SPY"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fragility).toBeDefined();
    expect(data.fragility.score).toBeGreaterThanOrEqual(0);
    expect(data.fragility.level).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────
// BOCPD ROUTE (operator tier)
// ────────────────────────────────────────────────────────────────────

describe("GET /api/bocpd", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/bocpd/route");
    GET = mod.GET;
  });

  it("returns 401/403 for unauthenticated user", async () => {
    asUnauthenticated();
    const res = await GET(makeRequest("/api/bocpd"));
    expect([401, 403]).toContain(res.status);
  });

  it("rejects invalid stream", async () => {
    asOperator();
    const res = await GET(makeRequest("/api/bocpd?stream=invalid"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid stream");
  });

  it("returns BOCPD snapshot for operator", async () => {
    asOperator();
    const res = await GET(makeRequest("/api/bocpd?stream=vix"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.streams).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────
// SUPPORT TICKETS ROUTES
// ────────────────────────────────────────────────────────────────────

describe("/api/support/tickets", () => {
  let GET: () => Promise<Response>;
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/support/tickets/route");
    GET = mod.GET;
    POST = mod.POST;
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns user's tickets", async () => {
      asAnalyst("alice");
      setDbRows("supportTickets", [
        { id: 1, userId: "user:alice", title: "Help", status: "open" },
      ]);
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tickets).toBeDefined();
    });
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      asUnauthenticated();
      const res = await POST(makeRequest("/api/support/tickets", jsonBody({ title: "Help", description: "Need help" })));
      expect(res.status).toBe(401);
    });

    it("rejects missing title", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/support/tickets", jsonBody({ description: "Need help" })));
      expect(res.status).toBe(400);
    });

    it("rejects missing description", async () => {
      asAnalyst();
      const res = await POST(makeRequest("/api/support/tickets", jsonBody({ title: "Help" })));
      expect(res.status).toBe(400);
    });

    it("creates ticket with valid input", async () => {
      asAnalyst("alice");
      const res = await POST(makeRequest("/api/support/tickets", jsonBody({
        title: "Login issue",
        description: "Cannot log in to my account",
        category: "bug",
        priority: "high",
      })));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ticket).toBeDefined();
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// STRIPE CHECKOUT ROUTE
// ────────────────────────────────────────────────────────────────────

describe("POST /api/stripe/checkout", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/stripe/checkout/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    asUnauthenticated();
    const res = await POST(makeRequest("/api/stripe/checkout", jsonBody({ tierId: 1 })));
    expect(res.status).toBe(401);
  });

  it("rejects missing tierId", async () => {
    asAnalyst();
    const res = await POST(makeRequest("/api/stripe/checkout", jsonBody({})));
    expect(res.status).toBe(400);
  });

  it("rejects invalid tier", async () => {
    asAnalyst();
    setDbRows("subscriptionTiers", []);
    const res = await POST(makeRequest("/api/stripe/checkout", jsonBody({ tierId: 999 })));
    expect(res.status).toBe(400);
  });

  it("creates checkout session for valid tier", async () => {
    asAnalyst("alice");
    setDbRows("subscriptionTiers", [{ id: 1, name: "analyst", stripePriceId: "price_test123" }]);
    setDbRows("settings", [{ key: "user:alice", value: JSON.stringify({ email: "alice@test.com" }) }]);
    setDbRows("subscriptions", []);
    const res = await POST(makeRequest("/api/stripe/checkout", jsonBody({ tierId: 1 })));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBeDefined();
  });

  it("returns clientSecret for embedded mode", async () => {
    asAnalyst("alice");
    setDbRows("subscriptionTiers", [{ id: 1, name: "analyst", stripePriceId: "price_test123" }]);
    setDbRows("settings", [{ key: "user:alice", value: JSON.stringify({ email: "alice@test.com" }) }]);
    setDbRows("subscriptions", []);
    const res = await POST(makeRequest("/api/stripe/checkout", jsonBody({ tierId: 1, embedded: true })));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.clientSecret).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────
// ADMIN ANALYTICS ROUTE
// ────────────────────────────────────────────────────────────────────

describe("GET /api/admin/analytics", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/admin/analytics/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    asUnauthenticated();
    const res = await GET(makeRequest("/api/admin/analytics"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin user", async () => {
    asAnalyst("alice");
    setDbRows("settings", [{ key: "user:alice", value: JSON.stringify({ role: "user" }) }]);
    const res = await GET(makeRequest("/api/admin/analytics"));
    expect(res.status).toBe(403);
  });
});

// ────────────────────────────────────────────────────────────────────
// TIER GATING PATTERN TESTS
// ────────────────────────────────────────────────────────────────────

describe("tier gating patterns", () => {
  it("free users are blocked from analyst endpoints", async () => {
    asFreeUser();
    const predMod = await import("@/app/api/predictions/route");
    const res = await predMod.GET(makeRequest("/api/predictions"));
    expect([401, 403]).toContain(res.status);
  });

  it("free users are blocked from operator endpoints", async () => {
    asFreeUser();
    // Override tier response for operator level
    mockTierResponse = { status: 403, json: { error: "Requires operator", requiredTier: "operator", currentTier: "free", upgrade: true } };
    const gexMod = await import("@/app/api/gex/route");
    const res = await gexMod.GET(makeRequest("/api/gex"));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.upgrade).toBe(true);
  });

  it("analyst users are blocked from operator endpoints", async () => {
    asAnalyst();
    mockTierResponse = { status: 403, json: { error: "Requires operator", requiredTier: "operator", currentTier: "analyst", upgrade: true } };
    const gexMod = await import("@/app/api/gex/route");
    const res = await gexMod.GET(makeRequest("/api/gex"));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.currentTier).toBe("analyst");
    expect(data.requiredTier).toBe("operator");
  });

  it("credit-gated routes return 429 when credits exhausted", async () => {
    asFreeUser();
    const analysisMod = await import("@/app/api/analysis/route");
    const res = await analysisMod.POST(makeRequest("/api/analysis", jsonBody({ signalId: 1 })));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.topup).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────
// INPUT VALIDATION PATTERNS
// ────────────────────────────────────────────────────────────────────

describe("input validation patterns", () => {
  it("registration validates email format", async () => {
    const mod = await import("@/app/api/auth/register/route");
    const badEmails = ["@no-user.com", "no-at-sign", "spaces in@email.com"];
    for (const email of badEmails) {
      const res = await mod.POST(makeRequest("/api/auth/register", jsonBody({
        username: "testuser",
        password: "securepassword1",
        email,
      })));
      expect(res.status).toBe(400);
    }
  });

  it("registration validates username format", async () => {
    const mod = await import("@/app/api/auth/register/route");
    const badUsernames = ["ab", "a".repeat(33), "user name", "user@name", "user.name"];
    for (const username of badUsernames) {
      const res = await mod.POST(makeRequest("/api/auth/register", jsonBody({
        username,
        password: "securepassword1",
        email: "test@example.com",
      })));
      expect(res.status).toBe(400);
    }
  });

  it("GEX validates ticker parameter", async () => {
    asOperator();
    setDbRows("signals", []);
    const mod = await import("@/app/api/gex/route");
    const badTickers = ["AAPL", "TSLA", "BTC"];
    for (const ticker of badTickers) {
      const res = await mod.GET(makeRequest(`/api/gex?ticker=${ticker}`));
      expect(res.status).toBe(400);
    }
  });

  it("BOCPD validates stream parameter", async () => {
    asOperator();
    const mod = await import("@/app/api/bocpd/route");
    const badStreams = ["bitcoin", "nasdaq", "temperature"];
    for (const stream of badStreams) {
      const res = await mod.GET(makeRequest(`/api/bocpd?stream=${stream}`));
      expect(res.status).toBe(400);
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// GRACEFUL FALLBACK PATTERN TESTS
// ────────────────────────────────────────────────────────────────────

describe("graceful fallback patterns", () => {
  it("support tickets GET returns empty array on DB error", async () => {
    asAnalyst("alice");
    // Force the DB to throw
    mockDb.select.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.reject(new Error("DB down")),
          then: (_res: unknown, rej: (e: Error) => void) => rej(new Error("DB down")),
        }),
      }),
    }));
    const mod = await import("@/app/api/support/tickets/route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tickets).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
// RESPONSE SHAPE VALIDATION
// ────────────────────────────────────────────────────────────────────

describe("response shapes", () => {
  it("chat sessions GET returns { sessions: [...] }", async () => {
    asAnalyst("alice");
    setDbRows("chatSessions", []);
    setDbRows("chatMessages", []);
    const mod = await import("@/app/api/chat/sessions/route");
    const res = await mod.GET(makeRequest("/api/chat/sessions"));
    const data = await res.json();
    expect(data).toHaveProperty("sessions");
    expect(Array.isArray(data.sessions)).toBe(true);
  });

  it("chat sessions POST returns { session: {...} }", async () => {
    asAnalyst("alice");
    const mod = await import("@/app/api/chat/sessions/route");
    const res = await mod.POST(makeRequest("/api/chat/sessions", jsonBody({})));
    const data = await res.json();
    expect(data).toHaveProperty("session");
    expect(typeof data.session).toBe("object");
  });

  it("dashboard widgets GET returns { widgets: [...] }", async () => {
    asAnalyst();
    setDbRows("dashboardWidgets", [{ id: 1, position: 0 }]);
    const mod = await import("@/app/api/dashboard/widgets/route");
    const res = await mod.GET();
    const data = await res.json();
    expect(data).toHaveProperty("widgets");
    expect(Array.isArray(data.widgets)).toBe(true);
  });

  it("support tickets GET returns { tickets: [...] }", async () => {
    asAnalyst("alice");
    setDbRows("supportTickets", []);
    const mod = await import("@/app/api/support/tickets/route");
    const res = await mod.GET();
    const data = await res.json();
    expect(data).toHaveProperty("tickets");
  });

  it("error responses include error field", async () => {
    asUnauthenticated();
    const mod = await import("@/app/api/settings/route");
    const res = await mod.GET(makeRequest("/api/settings"));
    const data = await res.json();
    expect(data).toHaveProperty("error");
    expect(typeof data.error).toBe("string");
  });

  it("tier-gated errors include upgrade flag", async () => {
    asFreeUser();
    const mod = await import("@/app/api/predictions/route");
    const res = await mod.GET(makeRequest("/api/predictions"));
    const data = await res.json();
    expect(data.upgrade).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────
// SECURITY TESTS
// ────────────────────────────────────────────────────────────────────

describe("security patterns", () => {
  it("CSRF protection is called on POST settings", async () => {
    const { validateOrigin } = await import("@/lib/security/csrf");
    asAnalyst();
    const mod = await import("@/app/api/settings/route");
    await mod.POST(makeRequest("/api/settings", jsonBody({ key: "testuser:theme", value: "dark" })));
    expect(validateOrigin).toHaveBeenCalled();
  });

  it("CSRF protection blocks invalid origin on settings POST", async () => {
    const csrf = await import("@/lib/security/csrf");
    (csrf.validateOrigin as Mock).mockReturnValueOnce("Origin not allowed");
    asAnalyst();
    const mod = await import("@/app/api/settings/route");
    const res = await mod.POST(makeRequest("/api/settings", jsonBody({ key: "testuser:theme", value: "dark" })));
    expect(res.status).toBe(403);
  });

  it("CSRF protection blocks invalid origin on settings DELETE", async () => {
    const csrf = await import("@/lib/security/csrf");
    (csrf.validateOrigin as Mock).mockReturnValueOnce("Origin not allowed");
    asAnalyst();
    const mod = await import("@/app/api/settings/route");
    const res = await mod.DELETE(makeRequest("/api/settings", deleteBody({ key: "testuser:theme" })));
    expect(res.status).toBe(403);
  });

  it("settings POST encrypts sensitive keys", async () => {
    const { encrypt } = await import("@/lib/encryption");
    asAnalyst("alice");
    setDbRows("settings", []);
    const mod = await import("@/app/api/settings/route");
    await mod.POST(makeRequest("/api/settings", jsonBody({
      key: "alice:anthropic_api_key",
      value: "sk-ant-test-key",
    })));
    expect(encrypt).toHaveBeenCalledWith("sk-ant-test-key");
  });

  it("registration rate limits are applied for non-localhost IPs", async () => {
    const rl = await import("@/lib/rate-limit");
    (rl.getClientIp as Mock).mockReturnValue("192.168.1.100");
    const mod = await import("@/app/api/auth/register/route");
    await mod.POST(makeRequest("/api/auth/register", jsonBody({
      username: "ratelimited",
      password: "securepassword1",
      email: "rl@example.com",
    })));
    expect(rl.rateLimit).toHaveBeenCalled();
  });
});
