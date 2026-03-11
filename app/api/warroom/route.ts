import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signals as signalsTable, theses } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ACTORS, SCENARIOS } from "@/lib/game-theory/actors";
import { analyzeScenario } from "@/lib/game-theory/analysis";
import { runBayesianAnalysis, initializeBeliefs, summarizeBayesianAnalysis } from "@/lib/game-theory/bayesian";
import { toBayesianScenario } from "@/lib/predictions/engine";
import {
  ACTOR_COORDS,
  ACTOR_COLORS,
  CONFLICT_ZONES,
  STRATEGIC_LOCATIONS,
  getAllianceLinks,
} from "@/lib/warroom/geo-constants";
import type { WarRoomData, ActorWithGeo, ScenarioWithAnalysis, WarRoomSignal, WarRoomThesis, GlobalMetrics } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";

// Cache scenario analysis (pure computation, no DB dependency)
// Recompute every 5 minutes
let cachedScenarios: ScenarioWithAnalysis[] | null = null;
let scenarioCacheTime = 0;
const SCENARIO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getScenarioAnalysis(): ScenarioWithAnalysis[] {
  const now = Date.now();
  if (cachedScenarios && now - scenarioCacheTime < SCENARIO_CACHE_TTL) {
    return cachedScenarios;
  }

  cachedScenarios = SCENARIOS.map((scenario) => {
    const analysis = analyzeScenario(scenario);
    let bayesian: ScenarioWithAnalysis["bayesian"];
    try {
      const bs = toBayesianScenario(scenario);
      const beliefs = initializeBeliefs(scenario.actors);
      bayesian = summarizeBayesianAnalysis(runBayesianAnalysis(bs, beliefs));
    } catch {
      // Bayesian analysis failure is non-fatal
    }
    return { scenario, analysis, bayesian };
  });
  scenarioCacheTime = now;
  return cachedScenarios;
}

// Cache actors (static data, compute once)
let cachedActors: ActorWithGeo[] | null = null;

function getActors(): ActorWithGeo[] {
  if (cachedActors) return cachedActors;
  cachedActors = ACTORS.map((actor) => ({
    ...actor,
    coords: ACTOR_COORDS[actor.id] || { lat: 0, lng: 0 },
    color: ACTOR_COLORS[actor.id]?.color || "#94a3b8",
    colorGroup: ACTOR_COLORS[actor.id]?.group || "neutral",
  }));
  return cachedActors;
}

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const actors = getActors();
    const scenarios = getScenarioAnalysis();

    // DB queries in parallel
    const [dbSignals, activeTheses] = await Promise.all([
      db
        .select()
        .from(signalsTable)
        .orderBy(desc(signalsTable.intensity))
        .limit(50),
      db
        .select()
        .from(theses)
        .where(eq(theses.status, "active"))
        .orderBy(desc(theses.generatedAt))
        .limit(1),
    ]);

    const warRoomSignals: WarRoomSignal[] = dbSignals.map((s) => ({
      id: s.id,
      uuid: s.uuid,
      title: s.title,
      date: s.date,
      intensity: s.intensity,
      category: s.category,
      status: s.status,
      marketSectors: s.marketSectors ? JSON.parse(s.marketSectors) : [],
    }));

    let thesis: WarRoomThesis | null = null;
    if (activeTheses.length > 0) {
      const t = activeTheses[0];
      thesis = {
        id: t.id,
        uuid: t.uuid,
        title: t.title,
        marketRegime: t.marketRegime,
        volatilityOutlook: t.volatilityOutlook,
        convergenceDensity: t.convergenceDensity,
        overallConfidence: t.overallConfidence,
        executiveSummary: t.executiveSummary,
      };
    }

    const allianceLinks = getAllianceLinks();

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
