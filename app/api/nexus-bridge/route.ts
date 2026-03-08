import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signals } from "@/lib/db/schema";
import { desc, gte } from "drizzle-orm";

// Public bridge API — no auth required, designed for EA integration
// CORS open so emergentapproach.com can call it directly from the browser

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";

  try {
    // Pull recent active signals
    const recentSignals = await db
      .select({
        id: signals.id,
        title: signals.title,
        category: signals.category,
        intensity: signals.intensity,
        layers: signals.layers,
        status: signals.status,
        date: signals.date,
        geopoliticalContext: signals.geopoliticalContext,
        marketSectors: signals.marketSectors,
      })
      .from(signals)
      .where(gte(signals.intensity, 2))
      .orderBy(desc(signals.intensity), desc(signals.createdAt))
      .limit(20);

    // Score how relevant each signal is to the query
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter((w) => w.length > 3);

    const scoredSignals = recentSignals.map((s) => {
      const text = `${s.title} ${s.category} ${s.geopoliticalContext ?? ""} ${s.marketSectors ?? ""} ${s.layers}`.toLowerCase();
      const relevance = keywords.filter((k) => text.includes(k)).length;
      return { ...s, relevance };
    });

    // Top relevant signals, fallback to highest intensity if no keyword match
    const matched = scoredSignals
      .filter((s) => s.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance || b.intensity - a.intensity)
      .slice(0, 6);

    const fallback = scoredSignals
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 6);

    const topSignals = matched.length >= 2 ? matched : fallback;

    // Compute NEXUS environmental score (0-100)
    // Based on average intensity of matched signals, inverted for "strategy viability"
    const avgIntensity = topSignals.length
      ? topSignals.reduce((sum, s) => sum + s.intensity, 0) / topSignals.length
      : 2.5;

    // Higher geopolitical intensity = more friction = lower strategy score
    const frictionScore = Math.round((avgIntensity / 5) * 100);
    const environmentScore = Math.max(10, 100 - frictionScore);

    // Static macro/regime snapshot (these come from cached FRED + Alpha Vantage data)
    const regime = {
      label: "Neutral growth · Elevated volatility · Risk-off",
      composite: -0.13,
      volatility: "elevated",
      riskAppetite: "risk-off",
      dollar: "dollar-crisis",
      vix: 23.75,
      fedFunds: 3.64,
      dxy: 117.82,
    };

    // GPR data
    const gpr = {
      composite: 597.47,
      threats: 804.97,
      acts: 557.93,
      interpretation: "Extreme. Threat environment far exceeds kinetic acts — escalation risk is priced in but not yet realised.",
    };

    // Systemic risk
    const systemicRisk = {
      compositeStress: 67,
      turbulencePercentile: 99,
      regime: "fragile",
      absorptionRatio: 0.675,
    };

    const response = {
      timestamp: new Date().toISOString(),
      query,
      environmentScore,
      frictionScore,
      signals: topSignals.map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        intensity: s.intensity,
        status: s.status,
        date: s.date,
        layers: s.layers,
      })),
      regime,
      gpr,
      systemicRisk,
      killConditionNote: "Monitor: November 2026 tariff cliff · Trump-Xi summit · TSMC forward guidance",
    };

    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "s-maxage=120, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[nexus-bridge] error:", err);
    return NextResponse.json(
      { error: "NEXUS bridge unavailable", timestamp: new Date().toISOString() },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
