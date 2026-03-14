import "server-only";
import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import {
  normalizeT212Symbol,
  normalizeCoinbaseSymbol,
  detectAssetClass,
  type NormalizedPosition,
} from "./normalizer";

export interface AggregatedPortfolio {
  totalValue: number;
  totalCash: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: NormalizedPosition[];
  byBroker: Record<string, { value: number; cash: number; pnl: number; positions: number }>;
  byAssetClass: Record<string, { value: number; pct: number; count: number }>;
  concentrationRisk: Array<{ symbol: string; pct: number; warning: boolean }>;
  lastSyncAt: string;
}

async function fetchT212Positions(userId: string): Promise<{ positions: NormalizedPosition[]; cash: number }> {
  const keyRow = await db.select().from(schema.settings).where(eq(schema.settings.key, "trading212_api_key"));
  if (keyRow.length === 0) return { positions: [], cash: 0 };

  try {
    const { Trading212Client } = await import("@/lib/trading212/client");
    const envRow = await db.select().from(schema.settings).where(eq(schema.settings.key, "trading212_environment"));
    const env = envRow.length > 0 ? envRow[0].value : "demo";
    const client = new Trading212Client(keyRow[0].value, env as "demo" | "live");

    const [rawPositions, cashData] = await Promise.all([
      client.getPositions(),
      client.getAccountCash(),
    ]);

    const cash = typeof (cashData as any)?.free === "number" ? (cashData as any).free : 0;
    const positions: NormalizedPosition[] = (rawPositions as any[]).map(p => {
      const normalized = normalizeT212Symbol(p.ticker);
      const marketValue = Math.abs(p.quantity * p.currentPrice);
      const avgCost = p.averagePrice || p.currentPrice;
      const unrealizedPnl = (p.currentPrice - avgCost) * p.quantity;
      const unrealizedPnlPct = avgCost > 0 ? ((p.currentPrice - avgCost) / avgCost) * 100 : 0;

      return {
        broker: "t212",
        symbol: p.ticker,
        normalizedSymbol: normalized,
        quantity: p.quantity,
        avgCost,
        currentPrice: p.currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct: Math.round(unrealizedPnlPct * 100) / 100,
        currency: "USD",
        assetClass: detectAssetClass(normalized, "t212"),
      };
    });

    return { positions, cash };
  } catch {
    return { positions: [], cash: 0 };
  }
}

async function fetchCoinbasePositions(userId: string): Promise<{ positions: NormalizedPosition[]; cash: number }> {
  const [keyRow, secretRow] = await Promise.all([
    db.select().from(schema.settings).where(eq(schema.settings.key, "coinbase_api_key")),
    db.select().from(schema.settings).where(eq(schema.settings.key, "coinbase_api_secret")),
  ]);

  if (keyRow.length === 0 || secretRow.length === 0) return { positions: [], cash: 0 };

  try {
    const { CoinbaseClient } = await import("@/lib/coinbase/client");
    const client = new CoinbaseClient(keyRow[0].value, secretRow[0].value);
    const accounts = await client.getAccounts();

    let cash = 0;
    const positions: NormalizedPosition[] = [];

    for (const account of accounts) {
      const balance = parseFloat(account.available_balance.value);
      if (balance <= 0) continue;

      const symbol = account.currency.code;

      if (symbol === "USD" || symbol === "USDC" || symbol === "USDT") {
        cash += balance;
        continue;
      }

      const productId = `${symbol}-USD`;
      let currentPrice = 0;
      try {
        const product = await client.getProduct(productId);
        currentPrice = parseFloat(product.price);
      } catch {
        continue;
      }

      const marketValue = balance * currentPrice;
      if (marketValue < 1) continue; // Skip dust

      positions.push({
        broker: "coinbase",
        symbol: productId,
        normalizedSymbol: normalizeCoinbaseSymbol(productId),
        quantity: balance,
        avgCost: currentPrice, // Coinbase doesn't provide cost basis easily
        currentPrice,
        marketValue,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        currency: "USD",
        assetClass: "crypto",
      });
    }

    return { positions, cash };
  } catch {
    return { positions: [], cash: 0 };
  }
}

export async function syncPortfolio(userId: string): Promise<AggregatedPortfolio> {
  // Fetch from all brokers in parallel
  const [t212, coinbase] = await Promise.all([
    fetchT212Positions(userId),
    fetchCoinbasePositions(userId),
  ]);

  const allPositions = [...t212.positions, ...coinbase.positions];
  const totalCash = t212.cash + coinbase.cash;
  const totalInvested = allPositions.reduce((s, p) => s + p.marketValue, 0);
  const totalValue = totalCash + totalInvested;
  const totalPnl = allPositions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // By broker
  const byBroker: Record<string, { value: number; cash: number; pnl: number; positions: number }> = {};
  if (t212.positions.length > 0 || t212.cash > 0) {
    byBroker.t212 = {
      value: t212.cash + t212.positions.reduce((s, p) => s + p.marketValue, 0),
      cash: t212.cash,
      pnl: t212.positions.reduce((s, p) => s + p.unrealizedPnl, 0),
      positions: t212.positions.length,
    };
  }
  if (coinbase.positions.length > 0 || coinbase.cash > 0) {
    byBroker.coinbase = {
      value: coinbase.cash + coinbase.positions.reduce((s, p) => s + p.marketValue, 0),
      cash: coinbase.cash,
      pnl: coinbase.positions.reduce((s, p) => s + p.unrealizedPnl, 0),
      positions: coinbase.positions.length,
    };
  }

  // By asset class
  const byAssetClass: Record<string, { value: number; pct: number; count: number }> = {};
  for (const p of allPositions) {
    if (!byAssetClass[p.assetClass]) byAssetClass[p.assetClass] = { value: 0, pct: 0, count: 0 };
    byAssetClass[p.assetClass].value += p.marketValue;
    byAssetClass[p.assetClass].count++;
  }
  for (const cls of Object.keys(byAssetClass)) {
    byAssetClass[cls].pct = totalInvested > 0
      ? Math.round((byAssetClass[cls].value / totalInvested) * 1000) / 10
      : 0;
  }

  // Concentration risk
  const concentrationRisk = allPositions
    .map(p => ({
      symbol: p.normalizedSymbol,
      pct: totalInvested > 0 ? Math.round((p.marketValue / totalInvested) * 1000) / 10 : 0,
      warning: false,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);
  concentrationRisk.forEach(c => { c.warning = c.pct > 15; });

  const now = new Date().toISOString();

  // Store unified portfolio snapshot
  await db.insert(schema.unifiedPortfolio).values({
    userId,
    totalValue: Math.round(totalValue * 100) / 100,
    totalCash: Math.round(totalCash * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalPnlPct: Math.round(totalPnlPct * 100) / 100,
    byBroker: JSON.stringify(byBroker),
    byAssetClass: JSON.stringify(byAssetClass),
    snapshotAt: now,
  });

  // Clear stale positions and batch insert current snapshot
  await db.delete(schema.unifiedPositions).where(eq(schema.unifiedPositions.userId, userId));

  if (allPositions.length > 0) {
    await db.insert(schema.unifiedPositions).values(
      allPositions.map(p => ({
        userId,
        broker: p.broker,
        symbol: p.symbol,
        normalizedSymbol: p.normalizedSymbol,
        quantity: p.quantity,
        avgCost: p.avgCost,
        currentPrice: p.currentPrice,
        marketValue: p.marketValue,
        unrealizedPnl: p.unrealizedPnl,
        unrealizedPnlPct: p.unrealizedPnlPct,
        currency: p.currency,
        assetClass: p.assetClass,
        lastSyncedAt: now,
      }))
    );
  }

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalCash: Math.round(totalCash * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalPnlPct: Math.round(totalPnlPct * 100) / 100,
    positions: allPositions,
    byBroker,
    byAssetClass,
    concentrationRisk,
    lastSyncAt: now,
  };
}

export async function getUnifiedPortfolio(userId: string): Promise<AggregatedPortfolio | null> {
  // Check for recent cached snapshot (< 5 min old)
  const recent = await db.select().from(schema.unifiedPortfolio)
    .where(eq(schema.unifiedPortfolio.userId, userId))
    .orderBy(desc(schema.unifiedPortfolio.createdAt))
    .limit(1);

  if (recent.length > 0) {
    const age = Date.now() - new Date(recent[0].createdAt).getTime();
    if (age < 5 * 60 * 1000) {
      // Return cached
      const dbPositions = await db.select().from(schema.unifiedPositions)
        .where(eq(schema.unifiedPositions.userId, userId));

      const positions: NormalizedPosition[] = dbPositions.map(p => ({
        broker: p.broker,
        symbol: p.symbol,
        normalizedSymbol: p.normalizedSymbol,
        quantity: p.quantity,
        avgCost: p.avgCost,
        currentPrice: p.currentPrice,
        marketValue: p.marketValue,
        unrealizedPnl: p.unrealizedPnl,
        unrealizedPnlPct: p.unrealizedPnlPct,
        currency: p.currency,
        assetClass: p.assetClass as NormalizedPosition["assetClass"],
      }));

      return {
        totalValue: recent[0].totalValue,
        totalCash: recent[0].totalCash,
        totalInvested: recent[0].totalInvested,
        totalPnl: recent[0].totalPnl,
        totalPnlPct: recent[0].totalPnlPct,
        positions,
        byBroker: recent[0].byBroker ? JSON.parse(recent[0].byBroker) : {},
        byAssetClass: recent[0].byAssetClass ? JSON.parse(recent[0].byAssetClass) : {},
        concentrationRisk: [],
        lastSyncAt: recent[0].snapshotAt,
      };
    }
  }

  // Stale or no cache: sync
  return syncPortfolio(userId);
}
