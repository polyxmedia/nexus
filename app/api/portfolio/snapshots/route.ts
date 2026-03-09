import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const snapshots = await db
      .select({
        id: schema.portfolioSnapshots.id,
        totalValue: schema.portfolioSnapshots.totalValue,
        cash: schema.portfolioSnapshots.cash,
        invested: schema.portfolioSnapshots.invested,
        pnl: schema.portfolioSnapshots.pnl,
        pnlPercent: schema.portfolioSnapshots.pnlPercent,
        environment: schema.portfolioSnapshots.environment,
        createdAt: schema.portfolioSnapshots.createdAt,
      })
      .from(schema.portfolioSnapshots)
      .orderBy(desc(schema.portfolioSnapshots.id))
      .limit(365);

    // Reverse so oldest first for charting
    const sorted = snapshots.reverse();

    // Compute peak, trough, drawdown
    let peak = -Infinity;
    let maxDrawdown = 0;
    let peakValue = 0;
    let troughValue = 0;

    for (const s of sorted) {
      if (s.totalValue > peak) {
        peak = s.totalValue;
        peakValue = peak;
      }
      const dd = peak > 0 ? (peak - s.totalValue) / peak : 0;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        troughValue = s.totalValue;
      }
    }

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const cumulativeReturn =
      first && last && first.totalValue > 0
        ? ((last.totalValue - first.totalValue) / first.totalValue) * 100
        : 0;

    return NextResponse.json({
      snapshots: sorted,
      stats: {
        peak: peakValue,
        trough: troughValue,
        maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
        cumulativeReturn: Math.round(cumulativeReturn * 100) / 100,
        count: sorted.length,
      },
    });
  } catch {
    return NextResponse.json({ snapshots: [], stats: null });
  }
}
