export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { getMacroSnapshot, getYieldCurve, getFredSeries, FRED_SERIES, type FredSeriesId, type FredSeriesData } from "@/lib/market-data/fred";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/market-data/cache-refresh";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";

const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" };

// Accept cached data up to 2 hours old before falling back to live
const MAX_CACHE_AGE_MS = 2 * 60 * 60_000;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const action = req.nextUrl.searchParams.get("action") || "snapshot";

  try {
    if (action === "yield_curve") {
      // Try DB cache first
      const cached = await readCache<ReturnType<typeof getYieldCurve>>(CACHE_KEYS.YIELD_CURVE, MAX_CACHE_AGE_MS);
      if (cached) return NextResponse.json(cached.data, { headers: CACHE_HEADERS });

      // Fallback to live, cache the result for next time
      const curve = await getYieldCurve();
      writeCache(CACHE_KEYS.YIELD_CURVE, curve).catch(() => {});
      return NextResponse.json(curve, { headers: CACHE_HEADERS });
    }

    if (action === "series") {
      const seriesId = req.nextUrl.searchParams.get("id");
      const limit = parseInt(req.nextUrl.searchParams.get("limit") || "30");
      if (!seriesId) return NextResponse.json({ error: "Missing series id" }, { status: 400 });

      const info = FRED_SERIES[seriesId as FredSeriesId];
      const points = await getFredSeries(seriesId, limit);
      return NextResponse.json({
        id: seriesId,
        name: info?.name || seriesId,
        unit: info?.unit || "unknown",
        data: points,
      });
    }

    // Default: full macro snapshot - try DB cache first
    const cached = await readCache<Record<string, FredSeriesData>>(CACHE_KEYS.MACRO_SNAPSHOT, MAX_CACHE_AGE_MS);
    if (cached) return NextResponse.json(cached.data, { headers: CACHE_HEADERS });

    // Fallback to live FRED fetch, cache the result for next time
    const snapshot = await getMacroSnapshot();
    writeCache(CACHE_KEYS.MACRO_SNAPSHOT, snapshot).catch(() => {});
    return NextResponse.json(snapshot, { headers: CACHE_HEADERS });
  } catch (err: unknown) {
    // If live fetch fails, try stale cache (any age)
    const action2 = req.nextUrl.searchParams.get("action") || "snapshot";
    if (action2 === "snapshot" || action2 === "yield_curve") {
      const key = action2 === "yield_curve" ? CACHE_KEYS.YIELD_CURVE : CACHE_KEYS.MACRO_SNAPSHOT;
      try {
        const stale = await readCache(key);
        if (stale) {
          console.warn(`[macro] Serving stale cache for ${key} (last updated: ${stale.updatedAt})`);
          return NextResponse.json(stale.data, { headers: CACHE_HEADERS });
        }
      } catch { /* ignore cache read errors */ }
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
