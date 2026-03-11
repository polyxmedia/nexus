import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ──
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockWhere }) }),
    update: () => ({ set: () => ({ where: vi.fn() }) }),
    insert: () => ({ values: vi.fn() }),
    delete: () => ({ where: vi.fn() }),
  },
  schema: {
    settings: { key: "key", value: "value" },
  },
}));

// ── Mock fetch (for positions/market endpoints) ──
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import {
  parseTokenIds,
  getMarketTokenIds,
  getPolymarketAddress,
  isPolymarketConfigured,
  getPolymarketPositions,
  placePolymarketOrder,
  cancelPolymarketOrder,
  getPolymarketOpenOrders,
  getPolymarketTrades,
} from "../polymarket-trading";

describe("polymarket-trading (read-only module)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockResolvedValue([]);
  });

  // ── parseTokenIds ──

  describe("parseTokenIds", () => {
    it("parses valid JSON array with 2+ elements", () => {
      const result = parseTokenIds('["token_yes", "token_no"]');
      expect(result).toEqual({ yes: "token_yes", no: "token_no" });
    });

    it("returns null for array with < 2 elements", () => {
      expect(parseTokenIds('["only_one"]')).toBeNull();
    });

    it("returns null for invalid JSON", () => {
      expect(parseTokenIds("not json")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseTokenIds("")).toBeNull();
    });

    it("handles array with more than 2 elements (takes first two)", () => {
      const result = parseTokenIds('["a", "b", "c"]');
      expect(result).toEqual({ yes: "a", no: "b" });
    });
  });

  // ── getMarketTokenIds ──

  describe("getMarketTokenIds", () => {
    it("fetches token IDs from gamma API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ clobTokenIds: '["yes_token", "no_token"]' }]),
      });

      const result = await getMarketTokenIds("condition_123");
      expect(result).toEqual({ yes: "yes_token", no: "no_token" });
    });

    it("returns null when API returns empty array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await getMarketTokenIds("condition_123");
      expect(result).toBeNull();
    });

    it("returns null on fetch error", async () => {
      mockFetch.mockRejectedValue(new Error("network error"));

      const result = await getMarketTokenIds("condition_123");
      expect(result).toBeNull();
    });
  });

  // ── Wallet address (DB-backed) ──

  describe("getPolymarketAddress", () => {
    it("returns address when stored", async () => {
      mockWhere.mockResolvedValueOnce([{ key: "alice:polymarket_address", value: "0xabc123" }]);
      const address = await getPolymarketAddress("alice");
      expect(address).toBe("0xabc123");
    });

    it("returns null when not stored", async () => {
      mockWhere.mockResolvedValueOnce([]);
      const address = await getPolymarketAddress("nobody");
      expect(address).toBeNull();
    });
  });

  // ── isPolymarketConfigured ──

  describe("isPolymarketConfigured", () => {
    it("returns true when address exists", async () => {
      mockWhere.mockResolvedValueOnce([{ key: "alice:polymarket_address", value: "0xabc" }]);
      const configured = await isPolymarketConfigured("alice");
      expect(configured).toBe(true);
    });

    it("returns false when no address", async () => {
      mockWhere.mockResolvedValueOnce([]);
      const configured = await isPolymarketConfigured("nobody");
      expect(configured).toBe(false);
    });
  });

  // ── getPolymarketPositions ──

  describe("getPolymarketPositions", () => {
    it("fetches positions from data API", async () => {
      mockWhere.mockResolvedValueOnce([{ key: "alice:polymarket_address", value: "0xabc" }]);
      const positions = [{ market: "BTC > 100k", size: 10 }];
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(positions) });

      const result = await getPolymarketPositions("alice");
      expect(result).toEqual(positions);
    });

    it("returns empty array when fetch fails", async () => {
      mockWhere.mockResolvedValueOnce([{ key: "alice:polymarket_address", value: "0xabc" }]);
      mockFetch.mockResolvedValue({ ok: false });

      const result = await getPolymarketPositions("alice");
      expect(result).toEqual([]);
    });

    it("returns empty array when not configured", async () => {
      mockWhere.mockResolvedValueOnce([]);
      const result = await getPolymarketPositions("nobody");
      expect(result).toEqual([]);
    });
  });

  // ── Legacy functions throw ──

  describe("legacy trading functions", () => {
    it("placePolymarketOrder throws directing to client-side", async () => {
      await expect(placePolymarketOrder()).rejects.toThrow("client-side wallet signing");
    });

    it("cancelPolymarketOrder throws directing to client-side", async () => {
      await expect(cancelPolymarketOrder()).rejects.toThrow("client-side wallet signing");
    });

    it("getPolymarketOpenOrders returns empty array", async () => {
      const result = await getPolymarketOpenOrders();
      expect(result).toEqual([]);
    });

    it("getPolymarketTrades returns empty array", async () => {
      const result = await getPolymarketTrades();
      expect(result).toEqual([]);
    });
  });
});
