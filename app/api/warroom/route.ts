import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signals as signalsTable, theses } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ACTORS, SCENARIOS } from "@/lib/game-theory/actors";
import { analyzeScenario } from "@/lib/game-theory/analysis";
import {
  ACTOR_COORDS,
  ACTOR_COLORS,
  CONFLICT_ZONES,
  STRATEGIC_LOCATIONS,
  getAllianceLinks,
} from "@/lib/warroom/geo-constants";
import type { WarRoomData, ActorWithGeo, ScenarioWithAnalysis, WarRoomSignal, WarRoomThesis, GlobalMetrics } from "@/lib/warroom/types";

export async function GET() {
  try {
    // Actors with geo data
    const actors: ActorWithGeo[] = ACTORS.map((actor) => ({
      ...actor,
      coords: ACTOR_COORDS[actor.id] || { lat: 0, lng: 0 },
      color: ACTOR_COLORS[actor.id]?.color || "#94a3b8",
      colorGroup: ACTOR_COLORS[actor.id]?.group || "neutral",
    }));

    // Scenarios with live analysis
    const scenarios: ScenarioWithAnalysis[] = SCENARIOS.map((scenario) => ({
      scenario,
      analysis: analyzeScenario(scenario),
    }));

    // Signals from DB (recent, sorted by intensity)
    const dbSignals = await db
      .select()
      .from(signalsTable)
      .orderBy(desc(signalsTable.intensity))
      .limit(50);

    const warRoomSignals: WarRoomSignal[] = dbSignals.map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date,
      intensity: s.intensity,
      category: s.category,
      status: s.status,
      marketSectors: s.marketSectors ? JSON.parse(s.marketSectors) : [],
    }));

    // Active thesis
    let thesis: WarRoomThesis | null = null;
    const activeTheses = await db
      .select()
      .from(theses)
      .where(eq(theses.status, "active"))
      .orderBy(desc(theses.generatedAt))
      .limit(1);

    if (activeTheses.length > 0) {
      const t = activeTheses;
      thesis = {
        id: t.id,
        title: t.title,
        marketRegime: t.marketRegime,
        volatilityOutlook: t.volatilityOutlook,
        convergenceDensity: t.convergenceDensity,
        overallConfidence: t.overallConfidence,
        executiveSummary: t.executiveSummary,
      };
    }

    // Alliance links
    const allianceLinks = getAllianceLinks();

    // Global metrics
    const maxEscalation = scenarios.reduce((max, s) => {
      const ladder = s.analysis.escalationLadder;
      const scenarioMax = ladder.length > 0 ? Math.max(...ladder.map((l) => l.level)) : 0;
      return Math.max(max, scenarioMax);
    }, 0);

    const activeSignalCount = warRoomSignals.filter((s) => s.status === "active").length;
    const highIntensityCount = warRoomSignals.filter((s) => s.intensity >= 4).length;

    const metrics: GlobalMetrics = {
      maxEscalation,
      convergenceDensity: thesis?.convergenceDensity ?? 0,
      marketRegime: thesis?.marketRegime ?? "transitioning",
      volatilityOutlook: thesis?.volatilityOutlook ?? "normal",
      activeSignalCount,
      highIntensityCount,
    };

    const data: WarRoomData = {
      actors,
      scenarios,
      signals: warRoomSignals,
      thesis,
      allianceLinks,
      conflictZones: CONFLICT_ZONES,
      strategicLocations: STRATEGIC_LOCATIONS,
      metrics,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("War room API error:", error);
    return NextResponse.json({ error: "Failed to load war room data" }, { status: 500 });
  }
}
