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
      settings: { key: "key", value: "value" },
      subscriptions: { userId: "userId", tierId: "tierId", status: "status" },
      subscriptionTiers: { id: "id", name: "name" },
    },
  };
});

vi.mock("@/lib/auth/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/effective-user", () => ({
  getEffectiveUsername: vi.fn().mockResolvedValue("testuser"),
}));
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { name: "testuser" } }),
}));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { name: "testuser" } }),
  default: vi.fn(),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/subscription", () => {
  it("returns null subscription for user with no subscription", async () => {
    const { GET } = await import("@/app/api/subscription/route");
    const res = await GET();
    const { status, data } = await parseResponse<{ subscription: null; tier: null; isAdmin: boolean }>(res);
    expect(status).toBe(200);
    expect(data.subscription).toBeNull();
    expect(data.tier).toBeNull();
  });

  it("returns 401 when not authenticated", async () => {
    const effectiveUser = await import("@/lib/auth/effective-user");
    (effectiveUser.getEffectiveUsername as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/subscription/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("detects admin user", async () => {
    const { db } = await import("@/lib/db");
    const callCount = { n: 0 };
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      get() {
        return (resolve: (v: unknown) => void) => {
          callCount.n++;
          if (callCount.n === 1) {
            resolve([{ key: "user:testuser", value: JSON.stringify({ role: "admin" }) }]);
          } else {
            resolve([]);
          }
        };
      },
      configurable: true,
    });

    const { GET } = await import("@/app/api/subscription/route");
    const res = await GET();
    const { status, data } = await parseResponse<{ isAdmin: boolean }>(res);
    expect(status).toBe(200);
    expect(data.isAdmin).toBe(true);
  });

  it("returns subscription with tier when exists", async () => {
    const { db } = await import("@/lib/db");
    const callCount = { n: 0 };
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      get() {
        return (resolve: (v: unknown) => void) => {
          callCount.n++;
          if (callCount.n === 1) {
            resolve([{ key: "user:testuser", value: JSON.stringify({ role: "user" }) }]);
          } else if (callCount.n === 2) {
            resolve([{ userId: "testuser", tierId: 1, status: "active" }]);
          } else {
            resolve([{ id: 1, name: "Analyst", price: 29 }]);
          }
        };
      },
      configurable: true,
    });

    const { GET } = await import("@/app/api/subscription/route");
    const res = await GET();
    const { status, data } = await parseResponse<{ subscription: unknown; tier: unknown }>(res);
    expect(status).toBe(200);
    expect(data.subscription).toBeTruthy();
    expect(data.tier).toBeTruthy();
  });
});
