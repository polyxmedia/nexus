import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ──
const mockWhere = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockWhere }) }),
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

// ── Mock crypto ──
vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return {
    ...actual,
    default: {
      ...actual,
      createSign: () => ({
        update: vi.fn().mockReturnThis(),
        end: vi.fn(),
        sign: () => "mock_signature_base64",
      }),
      randomUUID: () => "test-uuid-1234",
      constants: actual.constants,
    },
  };
});

// ── Mock fetch ──
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import {
  isKalshiConfigured,
  getKalshiBalance,
  getKalshiPositions,
  placeKalshiOrder,
  cancelKalshiOrder,
  getKalshiOrders,
} from "../kalshi-trading";

describe("kalshi-trading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockResolvedValue([]);
    delete process.env.KALSHI_API_KEY_ID;
    delete process.env.KALSHI_PRIVATE_KEY;
    delete process.env.KALSHI_ENVIRONMENT;
  });

  // ── Per-user credential resolution ──

  describe("per-user credential resolution", () => {
    it("uses user-scoped credentials when available", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key_alice" }]) // user key id
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "-----BEGIN RSA PRIVATE KEY-----\nalice" }]) // user priv key
        .mockResolvedValueOnce([]); // demo check

      const configured = await isKalshiConfigured("alice");
      expect(configured).toBe(true);
    });

    it("falls back to global credentials when no user-scoped", async () => {
      mockWhere
        .mockResolvedValueOnce([]) // no user key id
        .mockResolvedValueOnce([]) // no user priv key
        .mockResolvedValueOnce([{ key: "kalshi_api_key_id", value: "key_global" }]) // global key id
        .mockResolvedValueOnce([{ key: "kalshi_private_key", value: "-----BEGIN RSA PRIVATE KEY-----\nglobal" }]) // global priv key
        .mockResolvedValueOnce([]); // demo check

      const configured = await isKalshiConfigured("bob");
      expect(configured).toBe(true);
    });

    it("falls back to env vars when no DB credentials", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      process.env.KALSHI_API_KEY_ID = "env_key";
      process.env.KALSHI_PRIVATE_KEY = "env_private";

      const configured = await isKalshiConfigured("charlie");
      expect(configured).toBe(true);
    });

    it("returns false when no credentials anywhere", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const configured = await isKalshiConfigured("nobody");
      expect(configured).toBe(false);
    });

    it("detects demo environment from user setting", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key_alice" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_environment", value: "demo" }]);

      const configured = await isKalshiConfigured("alice");
      expect(configured).toBe(true);
    });
  });

  // ── getKalshiBalance ──

  describe("getKalshiBalance", () => {
    it("returns balance data", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([]);

      const balance = { available_balance: 5000, portfolio_value: 12000 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(balance),
        text: () => Promise.resolve(""),
      });

      const result = await getKalshiBalance("alice");
      expect(result).toEqual(balance);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/portfolio/balance"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("throws when not configured", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await expect(getKalshiBalance("nobody")).rejects.toThrow("Kalshi API credentials not configured");
    });
  });

  // ── getKalshiPositions ──

  describe("getKalshiPositions", () => {
    it("returns positions", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([]);

      const positions = { market_positions: [{ ticker: "ABC", total_traded: 100 }] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(positions),
        text: () => Promise.resolve(""),
      });

      const result = await getKalshiPositions("alice");
      expect(result.market_positions).toHaveLength(1);
    });
  });

  // ── placeKalshiOrder ──

  describe("placeKalshiOrder", () => {
    it("places order with correct payload", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([]);

      const orderResponse = {
        order: {
          order_id: "ord_123",
          ticker: "BTC-100K",
          status: "resting",
          side: "yes",
          action: "buy",
          count: 5,
          yes_price: 60,
          no_price: 40,
          created_time: "2026-03-09T00:00:00Z",
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(orderResponse),
        text: () => Promise.resolve(""),
      });

      const result = await placeKalshiOrder("alice", {
        ticker: "BTC-100K",
        action: "buy",
        side: "yes",
        count: 5,
        type: "limit",
        yes_price: 60,
      });

      expect(result.order.order_id).toBe("ord_123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/portfolio/orders"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"ticker":"BTC-100K"'),
        })
      );
    });

    it("includes auth headers in requests", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "my_key_id" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ order: {} }),
        text: () => Promise.resolve(""),
      });

      await placeKalshiOrder("alice", {
        ticker: "TEST",
        action: "buy",
        side: "yes",
        count: 1,
        type: "limit",
        yes_price: 50,
      });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers["KALSHI-ACCESS-KEY"]).toBe("my_key_id");
      expect(headers["KALSHI-ACCESS-TIMESTAMP"]).toBeDefined();
      expect(headers["KALSHI-ACCESS-SIGNATURE"]).toBe("mock_signature_base64");
    });

    it("throws on API error response", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([]);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request: invalid ticker"),
      });

      await expect(
        placeKalshiOrder("alice", { ticker: "BAD", action: "buy", side: "yes", count: 1, type: "limit" })
      ).rejects.toThrow("Kalshi API error 400: Bad request: invalid ticker");
    });
  });

  // ── cancelKalshiOrder ──

  describe("cancelKalshiOrder", () => {
    it("sends DELETE request for order", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      });

      await cancelKalshiOrder("alice", "ord_456");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/portfolio/orders/ord_456"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  // ── getKalshiOrders ──

  describe("getKalshiOrders", () => {
    it("returns order list", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([]);

      const orders = { orders: [{ order_id: "1" }, { order_id: "2" }] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(orders),
        text: () => Promise.resolve(""),
      });

      const result = await getKalshiOrders("alice");
      expect(result.orders).toHaveLength(2);
    });
  });

  // ── Demo vs production URL ──

  describe("environment routing", () => {
    it("uses demo URL when demo environment set", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_environment", value: "demo" }]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ available_balance: 0, portfolio_value: 0 }),
        text: () => Promise.resolve(""),
      });

      await getKalshiBalance("alice");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("demo-api.kalshi.co"),
        expect.anything()
      );
    });

    it("uses production URL by default", async () => {
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "privkey" }])
        .mockResolvedValueOnce([]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ available_balance: 0, portfolio_value: 0 }),
        text: () => Promise.resolve(""),
      });

      await getKalshiBalance("alice");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api.elections.kalshi.com"),
        expect.anything()
      );
    });
  });

  // ── User isolation ──

  describe("user isolation", () => {
    it("different users resolve different credentials", async () => {
      // Alice configured
      mockWhere
        .mockResolvedValueOnce([{ key: "alice:kalshi_api_key_id", value: "alice_key" }])
        .mockResolvedValueOnce([{ key: "alice:kalshi_private_key", value: "alice_priv" }])
        .mockResolvedValueOnce([]);
      expect(await isKalshiConfigured("alice")).toBe(true);

      // Bob not configured
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      expect(await isKalshiConfigured("bob")).toBe(false);
    });
  });
});
