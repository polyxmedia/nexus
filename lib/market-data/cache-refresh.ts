// Centralized data cache refresh
// Cron job fetches external data and writes to DB so dashboard reads are instant and reliable.

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getMacroSnapshot, getYieldCurve } from "./fred";

export const CACHE_KEYS = {
  MACRO_SNAPSHOT: "macro_snapshot",
  YIELD_CURVE: "yield_curve",
  MARKET_SNAPSHOT: "market_snapshot_today",
} as const;

type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

/**
 * Write a value to the data_cache table (upsert by key).
 */
export async function writeCache(key: CacheKey, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  const now = new Date().toISOString();
  await db.insert(schema.dataCache).values({ key, data: json, updatedAt: now }).onConflictDoUpdate({
    target: schema.dataCache.key,
    set: { data: json, updatedAt: now },
  });
}

/**
 * Read a value from the data_cache table. Returns null if not found or older than maxAgeMs.
 */
export async function readCache<T>(key: CacheKey, maxAgeMs?: number): Promise<{ data: T; updatedAt: string } | null> {
  const rows = await db.select().from(schema.dataCache).where(eq(schema.dataCache.key, key));
  if (rows.length === 0) return null;

  const row = rows[0];
  if (maxAgeMs) {
    const age = Date.now() - new Date(row.updatedAt).getTime();
    if (age > maxAgeMs) return null;
  }

  try {
    return { data: JSON.parse(row.data) as T, updatedAt: row.updatedAt };
  } catch {
    return null;
  }
}

/**
 * Refresh all macro data: FRED snapshot + yield curve.
 * Called by the scheduler cron job.
 */
export async function refreshMacroCache(): Promise<{ snapshot: boolean; yieldCurve: boolean }> {
  const results = { snapshot: false, yieldCurve: false };

  // Fetch macro snapshot (31 FRED series, batched)
  try {
    const snapshot = await getMacroSnapshot();
    await writeCache(CACHE_KEYS.MACRO_SNAPSHOT, snapshot);
    results.snapshot = true;
    console.log(`[cache-refresh] Macro snapshot cached (${Object.keys(snapshot).length} series)`);
  } catch (err) {
    console.error("[cache-refresh] Macro snapshot failed:", err);
  }

  // Fetch yield curve
  try {
    const curve = await getYieldCurve();
    await writeCache(CACHE_KEYS.YIELD_CURVE, curve);
    results.yieldCurve = true;
    console.log("[cache-refresh] Yield curve cached");
  } catch (err) {
    console.error("[cache-refresh] Yield curve failed:", err);
  }

  return results;
}

/**
 * Refresh market snapshot (VIX, SPY, etc.) from Yahoo Finance.
 * Separated because it uses a different provider.
 */
export async function refreshMarketSnapshotCache(): Promise<boolean> {
  try {
    const YahooFinance = (await import("yahoo-finance2")).default;
    const yf = new YahooFinance();

    const symbols: Record<string, string> = {
      SPY: "SPY",
      QQQ: "QQQ",
      VIX: "^VIX",
      GOLD: "GC=F",
      OIL: "CL=F",
      DXY: "DX-Y.NYB",
    };

    const today = new Date();
    const period1 = new Date(today);
    period1.setDate(period1.getDate() - 5);
    const period2 = new Date(today);
    period2.setDate(period2.getDate() + 1);
    const dateStr = today.toISOString().split("T")[0];

    const markets: Record<string, { close: number; change: number; changePercent: number }> = {};

    const results = await Promise.allSettled(
      Object.entries(symbols).map(async ([label, ticker]) => {
        const result = await yf.chart(ticker, { period1, period2, interval: "1d" });
        const quotes = result.quotes as { date: Date; close: number | null }[];
        if (!quotes || quotes.length === 0) return { label, data: null };

        let targetBar: { close: number } | null = null;
        let prevBar: { close: number } | null = null;

        for (const q of quotes) {
          if (!q.close) continue;
          const qDate = new Date(q.date).toISOString().split("T")[0];
          if (qDate <= dateStr) {
            prevBar = targetBar;
            targetBar = { close: q.close };
          }
        }

        if (!targetBar) return { label, data: null };
        const change = prevBar ? targetBar.close - prevBar.close : 0;
        const changePercent = prevBar && prevBar.close > 0 ? (change / prevBar.close) * 100 : 0;

        return { label, data: { close: targetBar.close, change, changePercent } };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.data) {
        markets[r.value.label] = r.value.data;
      }
    }

    if (Object.keys(markets).length > 0) {
      await writeCache(CACHE_KEYS.MARKET_SNAPSHOT, { date: dateStr, markets });
      console.log(`[cache-refresh] Market snapshot cached (${Object.keys(markets).length} symbols)`);
      return true;
    }

    console.warn("[cache-refresh] Market snapshot: no data returned");
    return false;
  } catch (err) {
    console.error("[cache-refresh] Market snapshot failed:", err);
    return false;
  }
}
