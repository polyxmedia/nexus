import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ──
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: (table: unknown) => ({ where: mockWhere }) }),
  },
  schema: {
    settings: { key: "key", value: "value" },
  },
}));

// ── Mock encryption ──
vi.mock("@/lib/encryption", () => ({
  decrypt: (val: string) => {
    if (val.startsWith("enc:v1:")) return "decrypted_" + val;
    return val;
  },
}));

// ── Mock ClobClient ──
const mockCreateAndPostOrder = vi.fn();
const mockCancelOrder = vi.fn();
const mockGetOpenOrders = vi.fn();
const mockGetTrades = vi.fn();
const mockGetTickSize = vi.fn();
const mockGetNegRisk = vi.fn();
const mockCreateOrDeriveApiKey = vi.fn().mockResolvedValue({ apiKey: "test", secret: "test", passphrase: "test" });

vi.mock("@polymarket/clob-client", () => {
  function MockClobClient(this: Record<string, unknown>) {
    this.createOrDeriveApiKey = mockCreateOrDeriveApiKey;
    this.createAndPostOrder = mockCreateAndPostOrder;
    this.cancelOrder = mockCancelOrder;
    this.getOpenOrders = mockGetOpenOrders;
    this.getTrades = mockGetTrades;
    this.getTickSize = mockGetTickSize;
    this.getNegRisk = mockGetNegRisk;
  }
  return {
    ClobClient: MockClobClient,
    Side: { BUY: 0, SELL: 1 },
    OrderType: { GTC: "GTC", GTD: "GTD" },
  };
});

// ── Mock ethers ──
vi.mock("ethers", () => {
  function MockWallet(this: { address: string }, key: string) {
    this.address = "0xTestAddress_" + key.slice(-4);
  }
  return { Wallet: MockWallet };
});

// ── Mock fetch (for positions endpoint) ──
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import {
  parseTokenIds,
  placePolymarketOrder,
  cancelPolymarketOrder,
  getPolymarketOpenOrders,
  getPolymarketTrades,
  getPolymarketPositions,
  isPolymarketConfigured,
  getPolymarketAddress,
} from "../polymarket-trading";

describe("polymarket-trading", () => {
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

  // ── Per-user credential lookup ──

  describe("per-user credential resolution", () => {
    it("returns true when user-scoped key exists", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xUserKey" }]);

      const configured = await isPolymarketConfigured("alice");
      expect(configured).toBe(true);
    });

    it("falls back to global key when no user-scoped key", async () => {
      mockWhere
        .mockResolvedValueOnce([]) // no user-scoped key
        .mockResolvedValueOnce([{ key: "polymarket_private_key", value: "0xGlobalKey" }]);

      const configured = await isPolymarketConfigured("bob");
      expect(configured).toBe(true);
    });

    it("falls back to env var when no DB keys", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      process.env.POLYMARKET_PRIVATE_KEY = "0xEnvKey";
      const configured = await isPolymarketConfigured("charlie");
      expect(configured).toBe(true);
      delete process.env.POLYMARKET_PRIVATE_KEY;
    });

    it("returns false when no credentials anywhere", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      delete process.env.POLYMARKET_PRIVATE_KEY;
      const configured = await isPolymarketConfigured("nobody");
      expect(configured).toBe(false);
    });

    it("decrypts encrypted values from DB", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "enc:v1:some_encrypted_data" }]);

      const configured = await isPolymarketConfigured("alice");
      expect(configured).toBe(true);
    });
  });

  // ── getPolymarketAddress ──

  describe("getPolymarketAddress", () => {
    it("returns wallet address when configured", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xabcdef1234" }]);

      const address = await getPolymarketAddress("alice");
      expect(address).toContain("0xTestAddress_");
    });

    it("returns null when not configured", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      delete process.env.POLYMARKET_PRIVATE_KEY;

      const address = await getPolymarketAddress("nobody");
      expect(address).toBeNull();
    });
  });

  // ── placePolymarketOrder ──

  describe("placePolymarketOrder", () => {
    it("places order with correct parameters", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xTestPrivateKey123" }]);

      mockGetTickSize.mockResolvedValue("0.01");
      mockGetNegRisk.mockResolvedValue(false);
      mockCreateAndPostOrder.mockResolvedValue({ orderID: "order_123", status: "live" });

      const result = await placePolymarketOrder("alice", {
        tokenId: "token_abc",
        price: 0.65,
        size: 10,
        side: "buy",
      });

      expect(result.success).toBe(true);
      expect(result.orderID).toBe("order_123");
      expect(result.status).toBe("live");
      expect(mockCreateAndPostOrder).toHaveBeenCalledOnce();
    });

    it("throws when wallet not configured", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      delete process.env.POLYMARKET_PRIVATE_KEY;

      await expect(
        placePolymarketOrder("nobody", { tokenId: "t", price: 0.5, size: 1, side: "buy" })
      ).rejects.toThrow("Polymarket wallet not configured");
    });

    it("uses default tick size when fetch fails", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "user1:polymarket_private_key", value: "0xKey1" }]);

      mockGetTickSize.mockRejectedValue(new Error("API error"));
      mockGetNegRisk.mockRejectedValue(new Error("API error"));
      mockCreateAndPostOrder.mockResolvedValue({ orderID: "order_456" });

      const result = await placePolymarketOrder("user1", {
        tokenId: "token_xyz",
        price: 0.30,
        size: 5,
        side: "sell",
      });

      expect(result.success).toBe(true);
    });
  });

  // ── cancelPolymarketOrder ──

  describe("cancelPolymarketOrder", () => {
    it("cancels order by ID", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xKey" }]);

      mockCancelOrder.mockResolvedValue(undefined);

      await cancelPolymarketOrder("alice", "order_789");
      expect(mockCancelOrder).toHaveBeenCalledWith({ orderID: "order_789" });
    });

    it("throws when not configured", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      delete process.env.POLYMARKET_PRIVATE_KEY;

      await expect(cancelPolymarketOrder("nobody", "order_1")).rejects.toThrow("Polymarket wallet not configured");
    });
  });

  // ── getPolymarketOpenOrders ──

  describe("getPolymarketOpenOrders", () => {
    it("returns orders when configured", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xKey" }]);

      const orders = [{ id: "1" }, { id: "2" }];
      mockGetOpenOrders.mockResolvedValue(orders);

      const result = await getPolymarketOpenOrders("alice");
      expect(result).toEqual(orders);
    });

    it("returns empty array when not configured", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      delete process.env.POLYMARKET_PRIVATE_KEY;

      const result = await getPolymarketOpenOrders("nobody");
      expect(result).toEqual([]);
    });

    it("returns empty array on API error", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xKey" }]);

      mockGetOpenOrders.mockRejectedValue(new Error("API down"));

      const result = await getPolymarketOpenOrders("alice");
      expect(result).toEqual([]);
    });
  });

  // ── getPolymarketTrades ──

  describe("getPolymarketTrades", () => {
    it("returns trades when configured", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xKey" }]);

      mockGetTrades.mockResolvedValue([{ tradeId: "t1" }]);

      const result = await getPolymarketTrades("alice");
      expect(result).toEqual([{ tradeId: "t1" }]);
    });

    it("returns empty array on failure", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xKey" }]);

      mockGetTrades.mockRejectedValue(new Error("fail"));

      const result = await getPolymarketTrades("alice");
      expect(result).toEqual([]);
    });
  });

  // ── getPolymarketPositions ──

  describe("getPolymarketPositions", () => {
    it("fetches positions from data API", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xKey" }]);

      const positions = [{ market: "BTC > 100k", size: 10 }];
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(positions) });

      const result = await getPolymarketPositions("alice");
      expect(result).toEqual(positions);
    });

    it("returns empty array when fetch fails", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xKey" }]);

      mockFetch.mockResolvedValue({ ok: false });

      const result = await getPolymarketPositions("alice");
      expect(result).toEqual([]);
    });

    it("returns empty array when not configured", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      delete process.env.POLYMARKET_PRIVATE_KEY;

      const result = await getPolymarketPositions("nobody");
      expect(result).toEqual([]);
    });
  });

  // ── User isolation ──

  describe("user isolation", () => {
    it("different users get different credential lookups", async () => {
      // User A configured
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:polymarket_private_key", value: "0xAliceKey" }]);
      const aliceConfigured = await isPolymarketConfigured("alice");

      // User B not configured
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      delete process.env.POLYMARKET_PRIVATE_KEY;
      const bobConfigured = await isPolymarketConfigured("bob");

      expect(aliceConfigured).toBe(true);
      expect(bobConfigured).toBe(false);
    });
  });
});
