import { describe, it, expect } from "vitest";
import type { CongressionalTrade, TopTrader } from "../index";

// Extract aggregation logic for testing (same implementation as index.ts)
function aggregateTopTraders(trades: CongressionalTrade[]): TopTrader[] {
  const byMember = new Map<string, CongressionalTrade[]>();
  for (const t of trades) {
    const existing = byMember.get(t.name) || [];
    existing.push(t);
    byMember.set(t.name, existing);
  }

  const traders: TopTrader[] = [];

  for (const [name, memberTrades] of byMember) {
    if (memberTrades.length < 2) continue;

    const withReturn = memberTrades.filter((t) => t.excessReturn !== undefined);
    const purchases = memberTrades.filter((t) => t.transactionType === "purchase").length;
    const sales = memberTrades.filter((t) => t.transactionType === "sale").length;

    const totalExcessReturn = withReturn.reduce((sum, t) => sum + (t.excessReturn || 0), 0);
    const avgExcessReturn = withReturn.length > 0 ? totalExcessReturn / withReturn.length : 0;

    let bestTrade: TopTrader["bestTrade"] = null;
    let worstTrade: TopTrader["worstTrade"] = null;
    for (const t of withReturn) {
      const er = t.excessReturn || 0;
      if (!bestTrade || er > bestTrade.excessReturn) bestTrade = { ticker: t.ticker, excessReturn: er };
      if (!worstTrade || er < worstTrade.excessReturn) worstTrade = { ticker: t.ticker, excessReturn: er };
    }

    const recentTickers = [...new Set(memberTrades.slice(0, 5).map((t) => t.ticker))];
    const first = memberTrades[0];

    traders.push({
      name,
      party: first.party || "",
      chamber: first.chamber,
      bioguideId: first.bioguideId,
      totalTrades: memberTrades.length,
      purchases,
      sales,
      avgExcessReturn,
      totalExcessReturn,
      bestTrade,
      worstTrade,
      recentTickers,
    });
  }

  return traders.sort((a, b) => b.avgExcessReturn - a.avgExcessReturn);
}

function makeTrade(overrides: Partial<CongressionalTrade> = {}): CongressionalTrade {
  return {
    id: "test_1",
    name: "Sen. Test",
    chamber: "senate",
    party: "Democrat",
    ticker: "AAPL",
    asset: "Apple Inc",
    transactionType: "purchase",
    amount: "$1,001 - $15,000",
    transactionDate: "2025-01-15",
    filingDate: "2025-01-20",
    owner: "Self",
    ...overrides,
  };
}

describe("aggregateTopTraders", () => {
  it("returns empty array for no trades", () => {
    expect(aggregateTopTraders([])).toEqual([]);
  });

  it("excludes members with only 1 trade", () => {
    const trades = [makeTrade({ name: "Solo Trader" })];
    expect(aggregateTopTraders(trades)).toEqual([]);
  });

  it("includes members with 2+ trades", () => {
    const trades = [
      makeTrade({ id: "1", name: "Active Trader", excessReturn: 5 }),
      makeTrade({ id: "2", name: "Active Trader", excessReturn: 3 }),
    ];
    const result = aggregateTopTraders(trades);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Active Trader");
    expect(result[0].totalTrades).toBe(2);
  });

  it("correctly calculates average excess return", () => {
    const trades = [
      makeTrade({ id: "1", name: "Trader A", excessReturn: 10 }),
      makeTrade({ id: "2", name: "Trader A", excessReturn: -2 }),
      makeTrade({ id: "3", name: "Trader A", excessReturn: 4 }),
    ];
    const result = aggregateTopTraders(trades);
    expect(result[0].avgExcessReturn).toBe(4); // (10 + -2 + 4) / 3 = 4
    expect(result[0].totalExcessReturn).toBe(12);
  });

  it("sorts by average excess return descending", () => {
    const trades = [
      makeTrade({ id: "1", name: "Bad Trader", excessReturn: -5 }),
      makeTrade({ id: "2", name: "Bad Trader", excessReturn: -3 }),
      makeTrade({ id: "3", name: "Good Trader", excessReturn: 10 }),
      makeTrade({ id: "4", name: "Good Trader", excessReturn: 8 }),
    ];
    const result = aggregateTopTraders(trades);
    expect(result[0].name).toBe("Good Trader");
    expect(result[1].name).toBe("Bad Trader");
  });

  it("identifies best and worst trades", () => {
    const trades = [
      makeTrade({ id: "1", name: "Trader", ticker: "AAPL", excessReturn: 15 }),
      makeTrade({ id: "2", name: "Trader", ticker: "TSLA", excessReturn: -8 }),
      makeTrade({ id: "3", name: "Trader", ticker: "MSFT", excessReturn: 3 }),
    ];
    const result = aggregateTopTraders(trades);
    expect(result[0].bestTrade).toEqual({ ticker: "AAPL", excessReturn: 15 });
    expect(result[0].worstTrade).toEqual({ ticker: "TSLA", excessReturn: -8 });
  });

  it("counts purchases and sales separately", () => {
    const trades = [
      makeTrade({ id: "1", name: "Trader", transactionType: "purchase" }),
      makeTrade({ id: "2", name: "Trader", transactionType: "purchase" }),
      makeTrade({ id: "3", name: "Trader", transactionType: "sale" }),
    ];
    const result = aggregateTopTraders(trades);
    expect(result[0].purchases).toBe(2);
    expect(result[0].sales).toBe(1);
  });

  it("handles trades with no excess return data", () => {
    const trades = [
      makeTrade({ id: "1", name: "Trader" }), // no excessReturn
      makeTrade({ id: "2", name: "Trader" }),
    ];
    const result = aggregateTopTraders(trades);
    expect(result[0].avgExcessReturn).toBe(0);
    expect(result[0].bestTrade).toBeNull();
    expect(result[0].worstTrade).toBeNull();
  });

  it("deduplicates recent tickers", () => {
    const trades = [
      makeTrade({ id: "1", name: "Trader", ticker: "AAPL" }),
      makeTrade({ id: "2", name: "Trader", ticker: "AAPL" }),
      makeTrade({ id: "3", name: "Trader", ticker: "MSFT" }),
    ];
    const result = aggregateTopTraders(trades);
    expect(result[0].recentTickers).toEqual(["AAPL", "MSFT"]);
  });

  it("preserves party and chamber from first trade", () => {
    const trades = [
      makeTrade({ id: "1", name: "Sen. Smith", party: "Republican", chamber: "senate" }),
      makeTrade({ id: "2", name: "Sen. Smith", party: "Republican", chamber: "senate" }),
    ];
    const result = aggregateTopTraders(trades);
    expect(result[0].party).toBe("Republican");
    expect(result[0].chamber).toBe("senate");
  });
});
