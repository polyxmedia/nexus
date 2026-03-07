import { NextRequest, NextResponse } from "next/server";
import { getMacroSnapshot, getYieldCurve, getFredSeries, FRED_SERIES, type FredSeriesId } from "@/lib/market-data/fred";

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "snapshot";

  try {
    if (action === "yield_curve") {
      const curve = await getYieldCurve();
      return NextResponse.json(curve);
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

    // Default: full macro snapshot
    const snapshot = await getMacroSnapshot();
    return NextResponse.json(snapshot);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
