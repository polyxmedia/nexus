import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all heavy dependencies that tools.ts imports
vi.mock("@/lib/db", () => ({
  db: {},
  schema: {
    signals: {},
    predictions: {},
    settings: {},
    knowledge: {},
  },
}));
vi.mock("@/lib/game-theory/actors", () => ({ SCENARIOS: [] }));
vi.mock("@/lib/game-theory/analysis", () => ({ analyzeScenario: vi.fn() }));
vi.mock("@/lib/game-theory/wartime", () => ({ getWartimeAnalysis: vi.fn() }));
vi.mock("@/lib/game-theory/bayesian", () => ({
  initializeBeliefs: vi.fn(),
  runBayesianAnalysis: vi.fn(),
  createSignalFromOSINT: vi.fn(),
}));
vi.mock("@/lib/game-theory/scenarios-nplayer", () => ({ N_PLAYER_SCENARIOS: [] }));
vi.mock("@/lib/trading212/client", () => ({ Trading212Client: vi.fn() }));
vi.mock("@/lib/market-data/yahoo", () => ({
  getQuoteData: vi.fn(),
  getHistoricalData: vi.fn(),
}));
vi.mock("@/lib/market-data/indicators", () => ({
  computeTechnicalSnapshot: vi.fn(),
}));
vi.mock("@/lib/signals/structural-cycles", () => ({
  getCyclicalReading: vi.fn(),
}));
vi.mock("@/lib/signals/economic-calendar", () => ({
  getEconomicCalendarEvents: vi.fn(),
}));
vi.mock("@/lib/signals/islamic-calendar", () => ({
  getHijriDateInfo: vi.fn(),
}));
vi.mock("@/lib/market-data/options-flow", () => ({
  getPutCallRatio: vi.fn(),
}));
vi.mock("@/lib/osint/entity-extractor", () => ({
  extractEntities: vi.fn(),
}));
vi.mock("@/lib/prompts/loader", () => ({ loadPrompt: vi.fn() }));
vi.mock("@/lib/knowledge/engine", () => ({
  searchKnowledge: vi.fn(),
  getRelevantKnowledge: vi.fn(),
  addKnowledge: vi.fn(),
  getKnowledgeById: vi.fn(),
}));
vi.mock("@/lib/iw/engine", () => ({
  getAllScenarioStatuses: vi.fn(),
  evaluateScenario: vi.fn(),
}));
vi.mock("@/lib/regime/detection", () => ({
  detectCurrentRegime: vi.fn(),
  getLatestShifts: vi.fn(),
}));
vi.mock("@/lib/regime/store", () => ({ loadRegimeState: vi.fn() }));
vi.mock("@/lib/regime/correlations", () => ({
  computeCorrelationMatrix: vi.fn(),
  getLatestCorrelations: vi.fn(),
}));
vi.mock("@/lib/sources/reliability", () => ({
  getSourceProfile: vi.fn(),
  assessInformation: vi.fn(),
  formatAdmiraltyRating: vi.fn(),
}));
vi.mock("@/lib/ach/engine", () => ({
  createAnalysis: vi.fn(),
  addHypothesis: vi.fn(),
  addEvidence: vi.fn(),
  evaluateMatrix: vi.fn(),
}));
vi.mock("@/lib/nowcast/engine", () => ({
  getLatestNowcast: vi.fn(),
  generateNowcast: vi.fn(),
}));
vi.mock("@/lib/nlp/central-bank", () => ({
  analyzeCentralBankText: vi.fn(),
}));
vi.mock("@/lib/intelligence/collection-gaps", () => ({
  assessCoverage: vi.fn(),
}));
vi.mock("@/lib/risk/systemic", () => ({
  getLatestSystemicRisk: vi.fn(),
  computeSystemicRisk: vi.fn(),
}));
vi.mock("@/lib/prediction-markets", () => ({
  getPredictionMarkets: vi.fn(),
}));
vi.mock("@/lib/on-chain", () => ({ getOnChainSnapshot: vi.fn() }));
vi.mock("@/lib/shipping", () => ({ getShippingSnapshot: vi.fn() }));
vi.mock("@/lib/narrative", () => ({ getNarrativeSnapshot: vi.fn() }));
vi.mock("@/lib/bocpd", () => ({ getBOCPDSnapshot: vi.fn() }));
vi.mock("@/lib/short-interest", () => ({
  getShortInterestSnapshot: vi.fn(),
}));
vi.mock("@/lib/gpr", () => ({ getGPRSnapshot: vi.fn() }));
vi.mock("@/lib/gex", () => ({ getGEXSnapshot: vi.fn() }));
vi.mock("@/lib/parallels/engine", () => ({
  findHistoricalParallels: vi.fn(),
}));
vi.mock("@/lib/actors/profiles", () => ({
  getExtendedActorProfile: vi.fn(),
  getAllExtendedProfiles: vi.fn(),
}));
vi.mock("@/lib/reports/narrative", () => ({
  generateNarrativeReport: vi.fn(),
}));
vi.mock("@/lib/memory/engine", () => ({
  recallMemories: vi.fn(),
  saveMemory: vi.fn(),
  deleteMemory: vi.fn(),
}));

import { executeTool } from "@/lib/chat/tools";

describe("calculate tool", () => {
  // ── Basic Arithmetic ──

  describe("basic arithmetic", () => {
    it("handles addition", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "sum", expr: "2 + 3" }],
      });
      expect(result).toEqual({
        results: [{ label: "sum", expression: "2 + 3", result: 5 }],
        variables: { sum: 5 },
      });
    });

    it("handles subtraction", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "diff", expr: "100 - 37" }],
      });
      expect(result).toEqual({
        results: [{ label: "diff", expression: "100 - 37", result: 63 }],
        variables: { diff: 63 },
      });
    });

    it("handles multiplication", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "product", expr: "44 * 64.55" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(2840.2, 1);
    });

    it("handles division", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "quotient", expr: "2590.72 / 44" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(58.88, 2);
    });

    it("handles exponentiation", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "power", expr: "2^10" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(1024);
    });

    it("handles negative numbers", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "neg", expr: "-5 + 3" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(-2);
    });

    it("handles order of operations (PEMDAS)", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "pemdas", expr: "2 + 3 * 4" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(14); // Not 20
    });

    it("handles parentheses correctly", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "parens", expr: "(2 + 3) * 4" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(20);
    });

    it("handles nested parentheses", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "nested", expr: "((2 + 3) * (4 - 1)) / 5" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(3);
    });
  });

  // ── Decimal Precision ──

  describe("decimal precision", () => {
    it("handles decimal arithmetic without floating point drift", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "dec", expr: "0.1 + 0.2" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(0.3, 10);
    });

    it("handles money-like decimals", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "money", expr: "64.55 * 11" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(710.05, 2);
    });

    it("handles very small numbers", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "small", expr: "0.00001 * 0.00001" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(1e-10, 15);
    });

    it("handles very large numbers", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "large", expr: "999999999 * 999999999" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(999999998000000001, 0);
    });
  });

  // ── Financial / Position Calculations ──

  describe("financial calculations", () => {
    it("calculates total position value", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "position_value", expr: "44 * 64.907" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(2855.908, 2);
    });

    it("calculates profit/loss", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "current_value", expr: "44 * 64.907" },
          { label: "entry_cost", expr: "44 * 58.88" },
          { label: "pnl", expr: "current_value - entry_cost" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBeCloseTo(265.188, 1);
    });

    it("calculates percentage gain", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "entry", expr: "2590.72" },
          { label: "current", expr: "2855.91" },
          { label: "pct_gain", expr: "(current - entry) / entry * 100" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBeCloseTo(10.236, 1);
    });

    it("calculates 10% trim sizing", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "total_units", expr: "44" },
          { label: "trim_units", expr: "round(total_units * 0.1)" },
          { label: "trim_proceeds", expr: "trim_units * 64.55" },
        ],
      });
      const r = result as any;
      expect(r.results[1].result).toBe(4);
      expect(r.results[2].result).toBeCloseTo(258.2, 2);
    });

    it("calculates cost basis per unit", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "cost_per_unit", expr: "2590.72 / 44" },
        ],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(58.88, 2);
    });

    it("calculates currency conversion (GBP to USD)", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "gbp_profit", expr: "265.19" },
          { label: "usd_profit", expr: "gbp_profit * 1.26" },
        ],
      });
      const r = result as any;
      expect(r.results[1].result).toBeCloseTo(334.14, 1);
    });

    it("calculates leveraged ETF decay", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "initial", expr: "64.55" },
          { label: "daily_return", expr: "0.02" },
          { label: "days", expr: "5" },
          { label: "final", expr: "initial * (1 + daily_return)^days" },
        ],
      });
      const r = result as any;
      expect(r.results[3].result).toBeCloseTo(71.27, 1);
    });

    it("calculates profit target price", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "entry_price", expr: "58.88" },
          { label: "target_profit_pct", expr: "15" },
          { label: "target_price", expr: "entry_price * (1 + target_profit_pct / 100)" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBeCloseTo(67.712, 2);
    });

    it("calculates stop loss level", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "entry", expr: "64.55" },
          { label: "stop_loss_pct", expr: "5" },
          { label: "stop_price", expr: "entry * (1 - stop_loss_pct / 100)" },
          { label: "max_loss_per_unit", expr: "entry - stop_price" },
          { label: "total_risk", expr: "max_loss_per_unit * 44" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBeCloseTo(61.3225, 2);
      expect(r.results[4].result).toBeCloseTo(141.9, 0);
    });

    it("calculates portfolio weight", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "position_value", expr: "44 * 64.55" },
          { label: "portfolio_total", expr: "25000" },
          { label: "weight_pct", expr: "position_value / portfolio_total * 100" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBeCloseTo(11.36, 1);
    });

    it("calculates risk-reward ratio", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "entry", expr: "64.55" },
          { label: "target", expr: "80" },
          { label: "stop", expr: "60" },
          { label: "reward", expr: "target - entry" },
          { label: "risk", expr: "entry - stop" },
          { label: "rr_ratio", expr: "reward / risk" },
        ],
      });
      const r = result as any;
      expect(r.results[5].result).toBeCloseTo(3.396, 2);
    });

    it("calculates breakeven after partial sell", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "total_cost", expr: "2590.72" },
          { label: "sold_units", expr: "11" },
          { label: "sell_price", expr: "64.55" },
          { label: "cash_received", expr: "sold_units * sell_price" },
          { label: "remaining_cost", expr: "total_cost - cash_received" },
          { label: "remaining_units", expr: "44 - sold_units" },
          { label: "breakeven", expr: "remaining_cost / remaining_units" },
        ],
      });
      const r = result as any;
      expect(r.results[3].result).toBeCloseTo(710.05, 2);
      expect(r.results[6].result).toBeCloseTo(57, 0);
    });
  });

  // ── Chained Expressions (Variable References) ──

  describe("chained expressions", () => {
    it("later expressions reference earlier labels", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "a", expr: "10" },
          { label: "b", expr: "20" },
          { label: "total", expr: "a + b" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBe(30);
      expect(r.variables).toEqual({ a: 10, b: 20, total: 30 });
    });

    it("handles long chains", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "x", expr: "2" },
          { label: "y", expr: "x * 3" },
          { label: "z", expr: "y + x" },
          { label: "w", expr: "z ^ 2" },
          { label: "final", expr: "w - 10" },
        ],
      });
      const r = result as any;
      expect(r.results[4].result).toBe(54); // ((2*3)+2)^2 - 10 = 64 - 10 = 54
    });

    it("scope accumulates across expressions", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "units", expr: "44" },
          { label: "price", expr: "64.55" },
          { label: "value", expr: "units * price" },
        ],
      });
      const r = result as any;
      expect(r.variables.units).toBe(44);
      expect(r.variables.price).toBe(64.55);
      expect(r.variables.value).toBeCloseTo(2840.2, 1);
    });
  });

  // ── Math Functions ──

  describe("math functions", () => {
    it("handles round", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "r", expr: "round(3.14159, 2)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(3.14);
    });

    it("handles ceil", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "c", expr: "ceil(4.1)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(5);
    });

    it("handles floor", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "f", expr: "floor(4.9)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(4);
    });

    it("handles sqrt", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "s", expr: "sqrt(144)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(12);
    });

    it("handles abs", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "a", expr: "abs(-42.5)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(42.5);
    });

    it("handles log (natural)", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "l", expr: "log(e)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(1, 10);
    });

    it("handles log10", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "l", expr: "log10(1000)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(3, 10);
    });

    it("handles min and max", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "lo", expr: "min(10, 20, 5, 15)" },
          { label: "hi", expr: "max(10, 20, 5, 15)" },
        ],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(5);
      expect(r.results[1].result).toBe(20);
    });

    it("handles exp", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "e_val", expr: "exp(1)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(Math.E, 10);
    });

    it("handles pow", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "p", expr: "pow(2, 8)" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(256);
    });

    it("handles pi constant", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "area", expr: "pi * 5^2" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBeCloseTo(78.5398, 2);
    });
  });

  // ── Edge Cases & Error Handling ──

  describe("edge cases", () => {
    it("returns error for empty expressions array", async () => {
      const result = await executeTool("calculate", {
        expressions: [],
      });
      const r = result as any;
      expect(r.error).toBeTruthy();
    });

    it("returns error for missing expressions", async () => {
      const result = await executeTool("calculate", {});
      const r = result as any;
      expect(r.error).toBeTruthy();
    });

    it("returns error for null expressions", async () => {
      const result = await executeTool("calculate", {
        expressions: null,
      });
      const r = result as any;
      expect(r.error).toBeTruthy();
    });

    it("handles division by zero", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "inf", expr: "1 / 0" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(Infinity);
    });

    it("handles invalid expression gracefully", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "bad", expr: "2 @@ 3" }],
      });
      const r = result as any;
      expect(typeof r.results[0].result).toBe("string");
      expect(r.results[0].result).toContain("ERROR:");
    });

    it("handles undefined variable reference", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "bad", expr: "undefined_var + 1" }],
      });
      const r = result as any;
      expect(typeof r.results[0].result).toBe("string");
      expect(r.results[0].result).toContain("ERROR:");
    });

    it("continues after error in chain — later expressions still run", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "good1", expr: "10" },
          { label: "bad", expr: "2 @@ 3" },
          { label: "good2", expr: "good1 + 5" },
        ],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(10);
      expect(r.results[1].result).toContain("ERROR:");
      expect(r.results[2].result).toBe(15);
    });

    it("handles single expression", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "single", expr: "42" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(42);
    });

    it("handles zero", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "zero", expr: "0" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(0);
    });

    it("handles negative results", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "neg", expr: "10 - 25" }],
      });
      const r = result as any;
      expect(r.results[0].result).toBe(-15);
    });
  });

  // ── The Exact Scenario From The Conversation ──

  describe("real-world scenario: 3OIL position tracking", () => {
    it("correctly calculates the position the user described", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "units", expr: "44" },
          { label: "entry_total", expr: "2590.72" },
          { label: "entry_per_unit", expr: "entry_total / units" },
          { label: "current_price", expr: "64.907" },
          { label: "current_value", expr: "units * current_price" },
          { label: "total_profit", expr: "current_value - entry_total" },
          { label: "profit_pct", expr: "total_profit / entry_total * 100" },
          { label: "usd_profit", expr: "total_profit * 1.26" },
        ],
      });
      const r = result as any;
      // Entry per unit should be ~58.88
      expect(r.results[2].result).toBeCloseTo(58.88, 2);
      // Current value should be ~2855.91
      expect(r.results[4].result).toBeCloseTo(2855.908, 1);
      // Total profit should be ~265.19
      expect(r.results[5].result).toBeCloseTo(265.188, 1);
      // Profit % should be ~10.24%
      expect(r.results[6].result).toBeCloseTo(10.236, 1);
      // USD profit should be ~$334
      expect(r.results[7].result).toBeCloseTo(334.14, 0);
    });

    it("correctly calculates 10% trim proceeds", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "units", expr: "44" },
          { label: "trim_pct", expr: "0.10" },
          { label: "trim_units", expr: "round(units * trim_pct)" },
          { label: "sell_price", expr: "64.55" },
          { label: "trim_proceeds", expr: "trim_units * sell_price" },
          { label: "entry_per_unit", expr: "58.88" },
          { label: "trim_cost", expr: "trim_units * entry_per_unit" },
          { label: "trim_profit", expr: "trim_proceeds - trim_cost" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBe(4); // 10% of 44 = 4.4, rounded = 4
      expect(r.results[4].result).toBeCloseTo(258.2, 2);
      expect(r.results[7].result).toBeCloseTo(22.68, 1); // profit from 4 units
    });

    it("correctly calculates 25% trim proceeds", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "units", expr: "44" },
          { label: "sell_units", expr: "round(units * 0.25)" },
          { label: "sell_price", expr: "64.55" },
          { label: "cash_banked", expr: "sell_units * sell_price" },
          { label: "remaining", expr: "units - sell_units" },
        ],
      });
      const r = result as any;
      expect(r.results[1].result).toBe(11);
      expect(r.results[3].result).toBeCloseTo(710.05, 2);
      expect(r.results[4].result).toBe(33);
    });

    it("calculates what price is needed for a specific profit target", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "entry_total", expr: "2590.72" },
          { label: "target_profit", expr: "200" },
          { label: "units", expr: "44" },
          { label: "target_value", expr: "entry_total + target_profit" },
          { label: "target_price", expr: "target_value / units" },
        ],
      });
      const r = result as any;
      expect(r.results[4].result).toBeCloseTo(63.43, 2);
    });
  });

  // ── Thesis / Conviction Calculations ──

  describe("thesis calculations", () => {
    it("calculates weighted signal convergence", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "geo_score", expr: "4.2" },
          { label: "mkt_score", expr: "3.8" },
          { label: "osi_score", expr: "3.5" },
          { label: "risk_score", expr: "4.0" },
          { label: "geo_weight", expr: "0.30" },
          { label: "mkt_weight", expr: "0.30" },
          { label: "osi_weight", expr: "0.20" },
          { label: "risk_weight", expr: "0.20" },
          { label: "convergence", expr: "geo_score * geo_weight + mkt_score * mkt_weight + osi_score * osi_weight + risk_score * risk_weight" },
        ],
      });
      const r = result as any;
      expect(r.results[8].result).toBeCloseTo(3.9, 2);
    });

    it("calculates Brier score", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "forecast", expr: "0.75" },
          { label: "outcome", expr: "1" },
          { label: "brier", expr: "(forecast - outcome)^2" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBeCloseTo(0.0625, 4);
    });

    it("calculates expected value of a trade", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "win_prob", expr: "0.65" },
          { label: "win_amount", expr: "500" },
          { label: "loss_prob", expr: "1 - win_prob" },
          { label: "loss_amount", expr: "-200" },
          { label: "ev", expr: "win_prob * win_amount + loss_prob * loss_amount" },
        ],
      });
      const r = result as any;
      expect(r.results[4].result).toBeCloseTo(255, 2);
    });

    it("calculates Kelly criterion bet size", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "win_prob", expr: "0.6" },
          { label: "win_ratio", expr: "2" },
          { label: "kelly", expr: "win_prob - (1 - win_prob) / win_ratio" },
          { label: "half_kelly", expr: "kelly / 2" },
          { label: "portfolio", expr: "25000" },
          { label: "position_size", expr: "portfolio * half_kelly" },
        ],
      });
      const r = result as any;
      expect(r.results[2].result).toBeCloseTo(0.4, 2); // kelly = 0.4
      expect(r.results[5].result).toBeCloseTo(5000, 0); // half-kelly = $5000
    });
  });

  // ── Multiple Expressions ──

  describe("multiple independent expressions", () => {
    it("evaluates many expressions in sequence", async () => {
      const result = await executeTool("calculate", {
        expressions: [
          { label: "a", expr: "1 + 1" },
          { label: "b", expr: "2 * 2" },
          { label: "c", expr: "3 ^ 3" },
          { label: "d", expr: "sqrt(16)" },
          { label: "e", expr: "100 / 3" },
        ],
      });
      const r = result as any;
      expect(r.results.length).toBe(5);
      expect(r.results[0].result).toBe(2);
      expect(r.results[1].result).toBe(4);
      expect(r.results[2].result).toBe(27);
      expect(r.results[3].result).toBe(4);
      expect(r.results[4].result).toBeCloseTo(33.333, 2);
    });
  });

  // ── Security ──

  describe("security", () => {
    it("cannot access process or global objects", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "hack", expr: "process.env" }],
      });
      const r = result as any;
      expect(r.results[0].result).toContain("ERROR:");
    });

    it("cannot execute arbitrary code via import", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "hack", expr: "import('fs')" }],
      });
      const r = result as any;
      expect(r.results[0].result).toContain("ERROR:");
    });

    it("cannot use eval", async () => {
      const result = await executeTool("calculate", {
        expressions: [{ label: "hack", expr: "eval('1+1')" }],
      });
      const r = result as any;
      expect(r.results[0].result).toContain("ERROR:");
    });
  });
});
