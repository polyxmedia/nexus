vi.mock("@/lib/db", () => {
  const mockChain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "values", "returning", "set"];
  methods.forEach((m) => { mockChain[m] = vi.fn().mockReturnValue(mockChain); });
  mockChain.returning = vi.fn().mockResolvedValue([{ id: 1, name: "Test", position: 0 }]);
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
      watchlists: { id: "id", name: "name", position: "position", createdAt: "createdAt" },
      watchlistItems: { id: "id", watchlistId: "watchlistId", symbol: "symbol", position: "position", addedAt: "addedAt", lastPrice: "lastPrice", lastChange: "lastChange", lastChangePercent: "lastChangePercent", lastVolume: "lastVolume", lastUpdated: "lastUpdated" },
    },
  };
});

vi.mock("@/lib/market-data/yahoo", () => ({
  getQuoteData: vi.fn().mockResolvedValue({
    symbol: "AAPL",
    price: 150,
    change: 2.5,
    changePercent: 1.7,
    volume: 50000000,
  }),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/watchlists", () => {
  it("returns watchlists without quotes", async () => {
    const { db } = await import("@/lib/db");
    const lists = [{ id: 1, name: "Main", position: 0 }];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(lists),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists?quotes=false");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 500 on error", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (_: unknown, reject: (e: Error) => void) => reject(new Error("DB error")),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/watchlists", () => {
  it("creates a watchlist", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true, configurable: true,
    });
    const insertChain = (db.insert as ReturnType<typeof vi.fn>)();
    insertChain.returning = vi.fn().mockResolvedValue([{ id: 1, name: "New List", position: 0 }]);

    const { POST } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "POST",
      body: { name: "New List" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if name missing", async () => {
    const { POST } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", { method: "POST", body: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("adds item to watchlist", async () => {
    const { db } = await import("@/lib/db");
    // No existing items
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true, configurable: true,
    });
    const insertChain = (db.insert as ReturnType<typeof vi.fn>)();
    insertChain.returning = vi.fn().mockResolvedValue([{ id: 1, symbol: "AAPL", position: 0 }]);

    const { POST } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "POST",
      body: { action: "add_item", watchlistId: 1, symbol: "AAPL" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("returns 400 if add_item missing params", async () => {
    const { POST } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "POST",
      body: { action: "add_item" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate symbol", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([{ id: 1, symbol: "AAPL" }]),
      writable: true, configurable: true,
    });

    const { POST } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "POST",
      body: { action: "add_item", watchlistId: 1, symbol: "AAPL" },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/watchlists", () => {
  it("renames a watchlist", async () => {
    const { PATCH } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "PATCH",
      body: { id: 1, name: "Renamed" },
    });
    const res = await PATCH(req);
    const { status, data } = await parseResponse<{ ok: boolean }>(res);
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("returns 400 if id or name missing for rename", async () => {
    const { PATCH } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", { method: "PATCH", body: { id: 1 } });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("reorders items", async () => {
    const { PATCH } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "PATCH",
      body: { action: "reorder_items", watchlistId: 1, itemIds: [3, 1, 2] },
    });
    const res = await PATCH(req);
    const { status, data } = await parseResponse<{ ok: boolean }>(res);
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("reorders lists", async () => {
    const { PATCH } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "PATCH",
      body: { action: "reorder_lists", listIds: [2, 1, 3] },
    });
    const res = await PATCH(req);
    const { status, data } = await parseResponse<{ ok: boolean }>(res);
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });
});

describe("DELETE /api/watchlists", () => {
  it("deletes a watchlist", async () => {
    const { DELETE } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "DELETE",
      body: { id: 1 },
    });
    const res = await DELETE(req);
    const { status, data } = await parseResponse<{ ok: boolean }>(res);
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("returns 400 if id missing", async () => {
    const { DELETE } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", { method: "DELETE", body: {} });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("removes item from watchlist", async () => {
    const { DELETE } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "DELETE",
      body: { action: "remove_item", itemId: 5 },
    });
    const res = await DELETE(req);
    const { status, data } = await parseResponse<{ ok: boolean }>(res);
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("returns 400 if remove_item without itemId", async () => {
    const { DELETE } = await import("@/app/api/watchlists/route");
    const req = createRequest("/api/watchlists", {
      method: "DELETE",
      body: { action: "remove_item" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
