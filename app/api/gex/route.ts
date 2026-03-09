import { NextRequest, NextResponse } from "next/server";
import { getGEXSnapshot } from "@/lib/gex";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { gte, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");

    const validTickers = ["SPY", "QQQ", "IWM"];
    if (ticker && !validTickers.includes(ticker.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid ticker. Supported: ${validTickers.join(", ")}` },
        { status: 400 }
      );
    }

    const [snapshot, activeSignals] = await Promise.all([
      getGEXSnapshot(ticker || undefined),
      // Fetch active high-intensity signals for fragility calculation
      db
        .select({
          id: schema.signals.id,
          title: schema.signals.title,
          intensity: schema.signals.intensity,
          category: schema.signals.category,
          layers: schema.signals.layers,
        })
        .from(schema.signals)
        .where(gte(schema.signals.intensity, 3))
        .orderBy(desc(schema.signals.intensity))
        .limit(10),
    ]);

    // Compute fragility score: GEX regime + active signal intensity
    const regimeScore =
      snapshot.aggregateRegime === "amplifying" ? 60
      : snapshot.aggregateRegime === "neutral" ? 35
      : 10;

    // Signal contribution: each high-intensity signal adds to fragility
    const signalScore = activeSignals.reduce((acc, s) => {
      if (s.intensity >= 5) return acc + 15;
      if (s.intensity >= 4) return acc + 8;
      return acc + 3;
    }, 0);

    // OPEX proximity bonus
    const opexBonus = snapshot.opex.daysUntil <= 2 ? 10 : snapshot.opex.daysUntil <= 5 ? 5 : 0;

    // Flow divergence bonus
    const divergenceBonus = snapshot.summaries.some((s) => s.flowDivergence.detected)
      ? 10
      : 0;

    const fragilityScore = Math.min(100, regimeScore + signalScore + opexBonus + divergenceBonus);

    const fragilityLevel =
      fragilityScore >= 75 ? "critical"
      : fragilityScore >= 50 ? "elevated"
      : fragilityScore >= 25 ? "moderate"
      : "stable";

    return NextResponse.json({
      ...snapshot,
      fragility: {
        score: fragilityScore,
        level: fragilityLevel,
        components: {
          regime: regimeScore,
          signals: signalScore,
          opex: opexBonus,
          divergence: divergenceBonus,
        },
      },
      activeSignals: activeSignals.map((s) => ({
        id: s.id,
        title: s.title,
        intensity: s.intensity,
        category: s.category,
        layers: JSON.parse(s.layers),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, summaries: [], aggregateRegime: "neutral", lastUpdated: new Date().toISOString() },
      { status: 500 }
    );
  }
}
