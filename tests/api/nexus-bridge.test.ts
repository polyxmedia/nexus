vi.mock("@/lib/db", () => {
  const mockChain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "select"];
  methods.forEach((m) => { mockChain[m] = vi.fn().mockReturnValue(mockChain); });
  Object.defineProperty(mockChain, "then", {
    value: (resolve: (v: unknown) => void) => resolve([]),
    writable: true, configurable: true,
  });

  return {
    db: { select: vi.fn().mockReturnValue(mockChain) },
  };
});

vi.mock("@/lib/db/schema", () => ({
  signals: { id: "id", title: "title", category: "category", intensity: "intensity", layers: "layers", status: "status", date: "date", geopoliticalContext: "geopoliticalContext", marketSectors: "marketSectors", createdAt: "createdAt" },
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/nexus-bridge", () => {
  it("returns bridge data with CORS headers", async () => {
    const { db } = await import("@/lib/db");
    const signals = [
      { id: 1, title: "Test Signal", category: "GEO", intensity: 4, layers: "GEO,MKT", status: "active", date: "2025-01-01", geopoliticalContext: "trade war", marketSectors: '["XLF"]' },
    ];
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve(signals),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/nexus-bridge/route");
    const req = createRequest("/api/nexus-bridge?query=trade");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ environmentScore: number; signals: unknown[] }>(res);
    expect(status).toBe(200);
    expect(data.environmentScore).toBeGreaterThanOrEqual(10);
    expect(data.signals).toBeDefined();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns data without query", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve([]),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/nexus-bridge/route");
    const req = createRequest("/api/nexus-bridge");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ query: string }>(res);
    expect(status).toBe(200);
    expect(data.query).toBe("");
  });

  it("returns 500 on error with CORS headers", async () => {
    const { db } = await import("@/lib/db");
    const chain = (db.select as ReturnType<typeof vi.fn>)();
    Object.defineProperty(chain, "then", {
      value: (_: unknown, reject: (e: Error) => void) => reject(new Error("DB error")),
      writable: true, configurable: true,
    });

    const { GET } = await import("@/app/api/nexus-bridge/route");
    const req = createRequest("/api/nexus-bridge");
    const res = await GET(req);
    expect(res.status).toBe(500);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("OPTIONS /api/nexus-bridge", () => {
  it("returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/api/nexus-bridge/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
  });
});
