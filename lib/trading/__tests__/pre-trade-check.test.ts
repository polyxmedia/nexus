import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (no-op in test)
vi.mock("server-only", () => ({}));

// Mock DB for max_order_size check
const mockSelect = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: mockSelect,
      }),
    }),
  },
  schema: {
    settings: { key: "key" },
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import {
  preTradeCheckT212,
  preTradeCheckCoinbase,
  riskBlockResponse,
} from "../pre-trade-check";

// ── T212 mock client factory ──

function makeT212Client(opts: {
  cash?: { free: number };
  positions?: Array<{ ticker: string; quantity: number; currentPrice: number }>;
  cashError?: boolean;
  positionsError?: boolean;
} = {}) {
  return {
    getAccountCash: opts.cashError
      ? vi.fn().mockRejectedValue(new Error("API down"))
      : vi.fn().mockResolvedValue(opts.cash ?? { free: 10000 }),
    getPositions: opts.positionsError
      ? vi.fn().mockRejectedValue(new Error("API down"))
      : vi.fn().mockResolvedValue(opts.positions ?? []),
  };
}

// ── Coinbase mock client factory ──

function makeCoinbaseClient(opts: {
  accounts?: Array<{ currency: { code: string }; available_balance: { value: string } }>;
  product?: { price: string; base_currency_id: string; quote_currency_id: string };
  error?: boolean;
} = {}) {
  const defaultAccounts = [
    { currency: { code: "USD" }, available_balance: { value: "5000.00" } },
    { currency: { code: "BTC" }, available_balance: { value: "1.5" } },
  ];
  const defaultProduct = { price: "67000", base_currency_id: "BTC", quote_currency_id: "USD" };

  return {
    getAccounts: opts.error
      ? vi.fn().mockRejectedValue(new Error("API down"))
      : vi.fn().mockResolvedValue(opts.accounts ?? defaultAccounts),
    getProduct: opts.error
      ? vi.fn().mockRejectedValue(new Error("API down"))
      : vi.fn().mockResolvedValue(opts.product ?? defaultProduct),
  };
}

beforeEach(() => {
  mockSelect.mockResolvedValue([]);
});

// ══════════════════════════════════════════════════════════
// T212 PRE-TRADE CHECKS
// ══════════════════════════════════════════════════════════

describe("preTradeCheckT212", () => {
  describe("cash checks", () => {
    it("allows BUY when cash is sufficient", async () => {
      const client = makeT212Client({ cash: { free: 10000 } });
      const result = await preTradeCheckT212(client, "AAPL", 10, "BUY", 150);

      expect(result.allowed).toBe(true);
      expect(result.accountCash).toBe(10000);
      expect(result.estimatedCost).toBe(1500);
      expect(result.warnings).toHaveLength(0);
    });

    it("blocks BUY when cash is insufficient", async () => {
      const client = makeT212Client({ cash: { free: 1000 } });
      const result = await preTradeCheckT212(client, "AAPL", 10, "BUY", 150);

      expect(result.allowed).toBe(false);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "INSUFFICIENT_CASH", severity: "block" })
      );
    });

    it("warns when order uses >90% of cash", async () => {
      const client = makeT212Client({ cash: { free: 1600 } });
      const result = await preTradeCheckT212(client, "AAPL", 10, "BUY", 150);

      expect(result.allowed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "LOW_CASH_AFTER", severity: "warn" })
      );
    });

    it("uses currentMarketPrice when no limitPrice for market orders", async () => {
      const client = makeT212Client({ cash: { free: 1000 } });
      const result = await preTradeCheckT212(client, "AAPL", 10, "BUY", null, 150);

      expect(result.allowed).toBe(false);
      expect(result.estimatedCost).toBe(1500);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "INSUFFICIENT_CASH" })
      );
    });

    it("warns but proceeds when cash API fails", async () => {
      const client = makeT212Client({ cashError: true });
      const result = await preTradeCheckT212(client, "AAPL", 10, "BUY", 150);

      expect(result.allowed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "CASH_CHECK_FAILED", severity: "warn" })
      );
    });
  });

  describe("sell-side holdings check", () => {
    it("allows SELL when holdings are sufficient", async () => {
      const client = makeT212Client({
        cash: { free: 10000 },
        positions: [{ ticker: "AAPL", quantity: 50, currentPrice: 150 }],
      });
      const result = await preTradeCheckT212(client, "AAPL", 10, "SELL");

      expect(result.allowed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("blocks SELL when holdings are insufficient", async () => {
      const client = makeT212Client({
        cash: { free: 10000 },
        positions: [{ ticker: "AAPL", quantity: 5, currentPrice: 150 }],
      });
      const result = await preTradeCheckT212(client, "AAPL", 10, "SELL");

      expect(result.allowed).toBe(false);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "INSUFFICIENT_HOLDINGS", severity: "block" })
      );
    });

    it("blocks SELL when ticker not in positions", async () => {
      const client = makeT212Client({
        cash: { free: 10000 },
        positions: [{ ticker: "MSFT", quantity: 50, currentPrice: 400 }],
      });
      const result = await preTradeCheckT212(client, "AAPL", 10, "SELL");

      expect(result.allowed).toBe(false);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "INSUFFICIENT_HOLDINGS" })
      );
    });

    it("blocks SELL when no positions exist at all", async () => {
      const client = makeT212Client({ cash: { free: 10000 }, positions: [] });
      const result = await preTradeCheckT212(client, "AAPL", 10, "SELL");

      expect(result.allowed).toBe(false);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "INSUFFICIENT_HOLDINGS" })
      );
    });

    it("ticker match is case-insensitive", async () => {
      const client = makeT212Client({
        cash: { free: 10000 },
        positions: [{ ticker: "aapl", quantity: 50, currentPrice: 150 }],
      });
      const result = await preTradeCheckT212(client, "AAPL", 10, "SELL");

      expect(result.allowed).toBe(true);
    });

    it("warns on SELL when positions API fails", async () => {
      const client = makeT212Client({ cash: { free: 10000 }, positionsError: true });
      const result = await preTradeCheckT212(client, "AAPL", 10, "SELL");

      expect(result.allowed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "HOLDINGS_CHECK_FAILED", severity: "warn" })
      );
    });
  });

  describe("concentration check", () => {
    it("warns when position exceeds 25% of portfolio on BUY", async () => {
      const client = makeT212Client({
        cash: { free: 100000 },
        positions: [
          { ticker: "AAPL", quantity: 100, currentPrice: 150 }, // $15,000
          { ticker: "MSFT", quantity: 50, currentPrice: 400 },  // $20,000
          // AAPL = 15k / 35k = 42.8%
        ],
      });
      const result = await preTradeCheckT212(client, "AAPL", 5, "BUY", 150);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "CONCENTRATION_HIGH", severity: "warn" })
      );
      expect(result.positionPercent).toBeGreaterThan(25);
    });

    it("does not warn about concentration on SELL", async () => {
      const client = makeT212Client({
        cash: { free: 100000 },
        positions: [
          { ticker: "AAPL", quantity: 100, currentPrice: 150 },
          { ticker: "MSFT", quantity: 10, currentPrice: 400 },
        ],
      });
      const result = await preTradeCheckT212(client, "AAPL", 5, "SELL");

      const concentrationWarning = result.warnings.find((w) => w.code === "CONCENTRATION_HIGH");
      expect(concentrationWarning).toBeUndefined();
    });
  });

  describe("max order size", () => {
    it("blocks when quantity exceeds max_order_size setting", async () => {
      mockSelect.mockResolvedValue([{ value: "50" }]);
      const client = makeT212Client({ cash: { free: 100000 } });
      const result = await preTradeCheckT212(client, "AAPL", 100, "BUY", 150);

      expect(result.allowed).toBe(false);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "MAX_SIZE_EXCEEDED", severity: "block" })
      );
    });

    it("allows when no max_order_size is set", async () => {
      mockSelect.mockResolvedValue([]);
      const client = makeT212Client({ cash: { free: 100000 } });
      const result = await preTradeCheckT212(client, "AAPL", 1000, "BUY", 150);

      const maxSizeWarning = result.warnings.find((w) => w.code === "MAX_SIZE_EXCEEDED");
      expect(maxSizeWarning).toBeUndefined();
    });
  });

  describe("type safety", () => {
    it("handles unexpected cash response shape gracefully", async () => {
      const client = {
        getAccountCash: vi.fn().mockResolvedValue({ unexpected: "shape" }),
        getPositions: vi.fn().mockResolvedValue([]),
      };
      const result = await preTradeCheckT212(client, "AAPL", 10, "BUY", 150);

      // accountCash should be undefined since 'free' field is missing
      expect(result.accountCash).toBeUndefined();
      expect(result.allowed).toBe(true);
    });

    it("handles non-array positions response gracefully", async () => {
      const client = {
        getAccountCash: vi.fn().mockResolvedValue({ free: 10000 }),
        getPositions: vi.fn().mockResolvedValue("not an array"),
      };
      const result = await preTradeCheckT212(client, "AAPL", 10, "SELL");

      // Should block because SELL with no valid positions
      expect(result.allowed).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════
// COINBASE PRE-TRADE CHECKS
// ══════════════════════════════════════════════════════════

describe("preTradeCheckCoinbase", () => {
  it("allows BUY when USD balance is sufficient", async () => {
    const client = makeCoinbaseClient();
    const result = await preTradeCheckCoinbase(client, "BTC-USD", "BUY", 1000);

    expect(result.allowed).toBe(true);
    expect(result.accountCash).toBe(5000);
    expect(result.estimatedCost).toBe(1000);
    expect(result.currentPrice).toBe(67000);
  });

  it("blocks BUY when USD balance is insufficient", async () => {
    const client = makeCoinbaseClient({
      accounts: [{ currency: { code: "USD" }, available_balance: { value: "500" } }],
    });
    const result = await preTradeCheckCoinbase(client, "BTC-USD", "BUY", 1000);

    expect(result.allowed).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "INSUFFICIENT_BALANCE", severity: "block" })
    );
  });

  it("allows SELL when base currency balance is sufficient", async () => {
    const client = makeCoinbaseClient();
    const result = await preTradeCheckCoinbase(client, "BTC-USD", "SELL", 0.5);

    expect(result.allowed).toBe(true);
    expect(result.accountCash).toBe(1.5);
    expect(result.estimatedCost).toBe(0.5 * 67000);
  });

  it("blocks SELL when base currency balance is insufficient", async () => {
    const client = makeCoinbaseClient({
      accounts: [
        { currency: { code: "USD" }, available_balance: { value: "5000" } },
        { currency: { code: "BTC" }, available_balance: { value: "0.1" } },
      ],
    });
    const result = await preTradeCheckCoinbase(client, "BTC-USD", "SELL", 0.5);

    expect(result.allowed).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "INSUFFICIENT_BALANCE", severity: "block" })
    );
  });

  it("warns but proceeds when API fails", async () => {
    const client = makeCoinbaseClient({ error: true });
    const result = await preTradeCheckCoinbase(client, "BTC-USD", "BUY", 1000);

    expect(result.allowed).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "BALANCE_CHECK_FAILED", severity: "warn" })
    );
  });

  it("handles missing currency account gracefully", async () => {
    const client = makeCoinbaseClient({
      accounts: [], // no accounts at all
    });
    const result = await preTradeCheckCoinbase(client, "BTC-USD", "BUY", 1000);

    // accountCash is undefined, no block - can't verify
    expect(result.allowed).toBe(true);
    expect(result.accountCash).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════
// RISK BLOCK RESPONSE HELPER
// ══════════════════════════════════════════════════════════

describe("riskBlockResponse", () => {
  it("returns 400 with the first block warning message", async () => {
    const result = riskBlockResponse({
      allowed: false,
      warnings: [
        { code: "WARN_1", message: "just a warning", severity: "warn" },
        { code: "BLOCK_1", message: "this is blocked", severity: "block" },
        { code: "BLOCK_2", message: "also blocked", severity: "block" },
      ],
    });

    expect(result.status).toBe(400);
    const body = await result.json();
    expect(body.error).toBe("this is blocked");
    expect(body.warnings).toHaveLength(3);
  });
});
