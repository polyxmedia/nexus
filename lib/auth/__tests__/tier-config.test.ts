import { describe, it, expect } from "vitest";
import { ROUTE_TIERS, TOOL_TIERS, PAGE_TIERS, type MinTier } from "../tier-config";

const TIER_LEVELS: Record<string, number> = {
  free: 0,
  analyst: 1,
  operator: 2,
  institution: 3,
};

function meetsMinTier(userTier: string, requiredTier: MinTier): boolean {
  return (TIER_LEVELS[userTier] ?? 0) >= (TIER_LEVELS[requiredTier] ?? 1);
}

// ── ROUTE_TIERS ──

describe("ROUTE_TIERS", () => {
  it("has all analyst routes at analyst level", () => {
    const analystRoutes = ["chat", "signals", "predictions", "thesis", "news", "dashboard", "calendar", "timeline", "alerts"];
    for (const route of analystRoutes) {
      expect(ROUTE_TIERS[route]).toBe("analyst");
    }
  });

  it("has war room at operator level", () => {
    expect(ROUTE_TIERS["warroom"]).toBe("operator");
  });

  it("has trading at operator level", () => {
    expect(ROUTE_TIERS["trading212"]).toBe("operator");
    expect(ROUTE_TIERS["coinbase"]).toBe("operator");
  });

  it("has agents at institution level", () => {
    expect(ROUTE_TIERS["agents"]).toBe("institution");
  });

  it("only contains valid tier values", () => {
    const validTiers = new Set(["analyst", "operator", "institution"]);
    for (const [route, tier] of Object.entries(ROUTE_TIERS)) {
      expect(validTiers.has(tier), `Route "${route}" has invalid tier "${tier}"`).toBe(true);
    }
  });
});

// ── TOOL_TIERS ──

describe("TOOL_TIERS", () => {
  it("has base analyst tools accessible at analyst tier", () => {
    const analystTools = [
      "get_signals", "get_market_snapshot", "get_market_sentiment",
      "get_predictions", "get_live_quote", "get_price_history",
      "web_search", "search_knowledge",
    ];
    for (const tool of analystTools) {
      expect(TOOL_TIERS[tool]).toBe("analyst");
    }
  });

  it("has advanced tools gated at operator tier", () => {
    const operatorTools = [
      "get_game_theory", "get_iw_status", "get_market_regime",
      "get_systemic_risk", "monte_carlo_simulation", "get_portfolio",
      "get_osint_events", "get_options_flow",
    ];
    for (const tool of operatorTools) {
      expect(TOOL_TIERS[tool]).toBe("operator");
    }
  });

  it("only contains valid tier values", () => {
    const validTiers = new Set(["analyst", "operator", "institution"]);
    for (const [tool, tier] of Object.entries(TOOL_TIERS)) {
      expect(validTiers.has(tier), `Tool "${tool}" has invalid tier "${tier}"`).toBe(true);
    }
  });
});

// ── PAGE_TIERS ──

describe("PAGE_TIERS", () => {
  it("maps chat and signals to analyst", () => {
    expect(PAGE_TIERS["/chat"]).toBe("analyst");
    expect(PAGE_TIERS["/signals"]).toBe("analyst");
  });

  it("maps warroom and trading to operator", () => {
    expect(PAGE_TIERS["/warroom"]).toBe("operator");
    expect(PAGE_TIERS["/trading"]).toBe("operator");
  });
});

// ── Tier hierarchy logic ──

describe("tier hierarchy", () => {
  it("free cannot access analyst features", () => {
    expect(meetsMinTier("free", "analyst")).toBe(false);
  });

  it("analyst can access analyst features", () => {
    expect(meetsMinTier("analyst", "analyst")).toBe(true);
  });

  it("analyst cannot access operator features", () => {
    expect(meetsMinTier("analyst", "operator")).toBe(false);
  });

  it("operator can access analyst and operator features", () => {
    expect(meetsMinTier("operator", "analyst")).toBe(true);
    expect(meetsMinTier("operator", "operator")).toBe(true);
  });

  it("operator cannot access institution features", () => {
    expect(meetsMinTier("operator", "institution")).toBe(false);
  });

  it("institution can access everything", () => {
    expect(meetsMinTier("institution", "analyst")).toBe(true);
    expect(meetsMinTier("institution", "operator")).toBe(true);
    expect(meetsMinTier("institution", "institution")).toBe(true);
  });

  it("unknown tier defaults to free (level 0)", () => {
    expect(meetsMinTier("garbage", "analyst")).toBe(false);
  });
});

// ── Tool filtering simulation ──

describe("tool filtering by tier", () => {
  function filterTools(userTier: string): string[] {
    const userLevel = TIER_LEVELS[userTier] ?? 0;
    return Object.entries(TOOL_TIERS)
      .filter(([, requiredTier]) => userLevel >= (TIER_LEVELS[requiredTier] ?? 1))
      .map(([name]) => name);
  }

  it("free user gets zero tools", () => {
    const tools = filterTools("free");
    expect(tools.length).toBe(0);
  });

  it("analyst user gets only analyst tools", () => {
    const tools = filterTools("analyst");
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(TOOL_TIERS[tool]).toBe("analyst");
    }
  });

  it("operator user gets analyst + operator tools", () => {
    const tools = filterTools("operator");
    const analystTools = filterTools("analyst");
    expect(tools.length).toBeGreaterThan(analystTools.length);
    // All analyst tools should be included
    for (const t of analystTools) {
      expect(tools).toContain(t);
    }
  });

  it("institution user gets all tools", () => {
    const tools = filterTools("institution");
    expect(tools.length).toBe(Object.keys(TOOL_TIERS).length);
  });
});
