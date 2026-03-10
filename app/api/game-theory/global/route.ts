import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { analyzeScenario } from "@/lib/game-theory/analysis";
import { runBayesianAnalysis, initializeBeliefs, summarizeBayesianAnalysis, type BayesianScenarioSummary } from "@/lib/game-theory/bayesian";
import { toBayesianScenario } from "@/lib/predictions/engine";
import {
  COUNTRIES,
  computeTeamPower,
  computePowerBalance,
  type PowerProfile,
} from "@/lib/game-theory/countries";
import type { StrategicScenario, PayoffEntry } from "@/lib/thesis/types";
import { db, schema } from "@/lib/db";
import { desc, isNull, sql } from "drizzle-orm";
import { getLatestSystemicRisk } from "@/lib/risk/systemic";
import { getCalendarActorInsights } from "@/lib/signals/actor-beliefs";

// ── Strategy templates ──

const BLUE_STRATEGIES = [
  "Military escalation",
  "Economic sanctions",
  "Diplomatic coalition",
  "Deterrence posture",
];

const RED_STRATEGIES = [
  "Military escalation",
  "Economic countermeasures",
  "Diplomatic resistance",
  "Asymmetric response",
];

// ── Payoff computation ──

function computePayoff(
  blueStrat: string,
  redStrat: string,
  bluePower: PowerProfile,
  redPower: PowerProfile,
  balance: number
): { blue: number; red: number; direction: "bullish" | "bearish" | "mixed"; magnitude: "low" | "medium" | "high"; desc: string } {
  // Strategy interaction weights: which dimensions matter for each combo
  const weights: Record<string, Record<string, (keyof PowerProfile)[]>> = {
    "Military escalation": {
      "Military escalation": ["military", "nuclear", "intel"],
      "Economic countermeasures": ["military", "economic", "tech"],
      "Diplomatic resistance": ["military", "diplomatic", "proxy"],
      "Asymmetric response": ["military", "cyber", "proxy"],
    },
    "Economic sanctions": {
      "Military escalation": ["economic", "military", "diplomatic"],
      "Economic countermeasures": ["economic", "energy", "tech"],
      "Diplomatic resistance": ["economic", "diplomatic", "intel"],
      "Asymmetric response": ["economic", "cyber", "energy"],
    },
    "Diplomatic coalition": {
      "Military escalation": ["diplomatic", "military", "intel"],
      "Economic countermeasures": ["diplomatic", "economic", "energy"],
      "Diplomatic resistance": ["diplomatic", "intel", "proxy"],
      "Asymmetric response": ["diplomatic", "cyber", "intel"],
    },
    "Deterrence posture": {
      "Military escalation": ["nuclear", "military", "intel"],
      "Economic countermeasures": ["military", "economic", "tech"],
      "Diplomatic resistance": ["diplomatic", "military", "intel"],
      "Asymmetric response": ["military", "cyber", "nuclear"],
    },
  };

  const dims = weights[blueStrat]?.[redStrat] || ["military", "economic", "diplomatic"];

  // Compute advantage in relevant dimensions
  let blueScore = 0;
  let redScore = 0;
  for (const dim of dims) {
    blueScore += bluePower[dim];
    redScore += redPower[dim];
  }

  const advantage = (blueScore - redScore) / (dims.length * 100); // -1 to 1
  const escalation = getEscalationLevel(blueStrat, redStrat);

  // Base payoffs from advantage
  let blue = Math.round(advantage * 6 * 10) / 10;
  let red = Math.round(-advantage * 5 * 10) / 10;

  // Mutual escalation penalty
  if (blueStrat === "Military escalation" && redStrat === "Military escalation") {
    blue -= 2;
    red -= 2;
  }

  // Mutual diplomacy bonus
  if (blueStrat === "Diplomatic coalition" && redStrat === "Diplomatic resistance") {
    blue += 1;
    red += 1;
  }

  // Deterrence stability
  if (blueStrat === "Deterrence posture" && redStrat !== "Military escalation") {
    blue += 1;
    red += 0.5;
  }

  // Clamp
  blue = Math.max(-8, Math.min(8, Math.round(blue * 10) / 10));
  red = Math.max(-8, Math.min(8, Math.round(red * 10) / 10));

  const total = blue + red;
  const direction: "bullish" | "bearish" | "mixed" =
    total > 1 ? "bullish" : total < -2 ? "bearish" : "mixed";
  const magnitude: "low" | "medium" | "high" =
    escalation > 3 ? "high" : escalation > 1 ? "medium" : "low";

  return { blue, red, direction, magnitude, desc: getDescription(blueStrat, redStrat, advantage) };
}

function getEscalationLevel(blue: string, red: string): number {
  const escalatory = ["Military escalation"];
  const moderate = ["Economic sanctions", "Economic countermeasures", "Asymmetric response"];
  let level = 0;
  if (escalatory.includes(blue)) level += 2;
  else if (moderate.includes(blue)) level += 1;
  if (escalatory.includes(red)) level += 2;
  else if (moderate.includes(red)) level += 1;
  return level;
}

function getDescription(blueStrat: string, redStrat: string, advantage: number): string {
  const side = advantage > 0.1 ? "Blue Force" : advantage < -0.1 ? "Red Force" : "Neither side";
  const verb = advantage > 0.1 ? "holds advantage" : advantage < -0.1 ? "holds advantage" : "holds clear advantage";

  if (blueStrat === "Military escalation" && redStrat === "Military escalation") {
    return `Direct confrontation. ${side} ${verb} in military capability. High cost for both sides.`;
  }
  if (blueStrat === "Diplomatic coalition" && redStrat === "Diplomatic resistance") {
    return `Diplomatic standoff with potential for resolution. ${side} ${verb} in institutional leverage.`;
  }
  if (blueStrat === "Deterrence posture") {
    return `Blue Force maintains deterrence. Stability depends on Red Force restraint. ${side} ${verb}.`;
  }
  if (redStrat === "Asymmetric response") {
    return `Red Force employs asymmetric tactics. Conventional advantage offset by unconventional capabilities.`;
  }
  return `${blueStrat} vs ${redStrat}. ${side} ${verb} in the relevant capability domains.`;
}

// ── Sector mapping ──

function getAffectedSectors(blueCodes: string[], redCodes: string[]): string[] {
  const sectors = new Set<string>(["defense"]);
  const allCodes = [...blueCodes, ...redCodes];
  const hasEnergy = allCodes.some(c => ["SA", "IR", "RU", "AE", "KW", "QA", "NG"].includes(c));
  const hasTech = allCodes.some(c => ["US", "CN", "TW", "KR", "JP"].includes(c));
  const hasShipping = allCodes.some(c => ["IR", "YE", "EG", "SG", "MY"].includes(c));
  const hasFinance = allCodes.some(c => ["US", "GB", "JP", "CN", "DE", "FR"].includes(c));

  if (hasEnergy) sectors.add("energy");
  if (hasTech) { sectors.add("technology"); sectors.add("semiconductors"); }
  if (hasShipping) sectors.add("shipping");
  if (hasFinance) sectors.add("finance");
  sectors.add("commodities");

  return Array.from(sectors);
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const body = await request.json();
    const { blueTeam, redTeam } = body as { blueTeam: string[]; redTeam: string[] };

    if (!blueTeam?.length || !redTeam?.length) {
      return NextResponse.json({ error: "Both teams must have at least one country" }, { status: 400 });
    }

    // Compute team power profiles
    const bluePower = computeTeamPower(blueTeam);
    const redPower = computeTeamPower(redTeam);
    const balance = computePowerBalance(bluePower, redPower);
    const sectors = getAffectedSectors(blueTeam, redTeam);

    // Build team labels
    const blueNames = blueTeam.map(c => COUNTRIES.find(cc => cc.code === c)?.name || c).slice(0, 3);
    const redNames = redTeam.map(c => COUNTRIES.find(cc => cc.code === c)?.name || c).slice(0, 3);
    const blueLabel = blueNames.join(", ") + (blueTeam.length > 3 ? ` +${blueTeam.length - 3}` : "");
    const redLabel = redNames.join(", ") + (redTeam.length > 3 ? ` +${redTeam.length - 3}` : "");

    // Build payoff matrix
    const payoffMatrix: PayoffEntry[] = [];
    for (const bs of BLUE_STRATEGIES) {
      for (const rs of RED_STRATEGIES) {
        const result = computePayoff(bs, rs, bluePower, redPower, balance.overallBalance);
        payoffMatrix.push({
          strategies: { blue: bs, red: rs },
          payoffs: { blue: result.blue, red: result.red },
          marketImpact: {
            direction: result.direction,
            magnitude: result.magnitude,
            sectors,
            description: result.desc,
          },
        });
      }
    }

    // Build scenario
    const scenario: StrategicScenario = {
      id: "global-scenario",
      title: `${blueLabel} vs ${redLabel}`,
      description: `Global confrontation scenario between Blue Force (${blueLabel}) and Red Force (${redLabel}).`,
      actors: ["blue", "red"],
      strategies: {
        blue: BLUE_STRATEGIES,
        red: RED_STRATEGIES,
      },
      payoffMatrix,
      context: `Blue Force: ${blueTeam.length} nations. Red Force: ${redTeam.length} nations.`,
      marketSectors: sectors,
      timeHorizon: "medium_term",
    };

    // Run basic + Bayesian game theory analysis
    const analysis = analyzeScenario(scenario);
    let bayesian: BayesianScenarioSummary | null = null;
    try {
      const bs = toBayesianScenario(scenario);
      const beliefs = initializeBeliefs(scenario.actors);
      bayesian = summarizeBayesianAnalysis(runBayesianAnalysis(bs, beliefs));
    } catch {
      // Bayesian failure is non-fatal
    }

    // ── Intelligence enrichment: pull real data in parallel ──
    const allCountryNames = [...blueTeam, ...redTeam]
      .map(c => COUNTRIES.find(cc => cc.code === c)?.name)
      .filter(Boolean) as string[];

    const [signalRows, predictionRows, riskState, calendarInsights] = await Promise.all([
      // Recent high-intensity signals mentioning any involved country
      db.select({
        title: schema.signals.title,
        intensity: schema.signals.intensity,
        category: schema.signals.category,
        date: schema.signals.date,
        geopoliticalContext: schema.signals.geopoliticalContext,
        marketSectors: schema.signals.marketSectors,
      })
        .from(schema.signals)
        .orderBy(desc(schema.signals.intensity), desc(schema.signals.id))
        .limit(100),

      // Active predictions (geopolitical category, unresolved)
      db.select({
        claim: schema.predictions.claim,
        confidence: schema.predictions.confidence,
        category: schema.predictions.category,
        deadline: schema.predictions.deadline,
        direction: schema.predictions.direction,
      })
        .from(schema.predictions)
        .where(isNull(schema.predictions.outcome))
        .orderBy(desc(schema.predictions.confidence))
        .limit(50),

      // Current systemic risk state
      getLatestSystemicRisk().catch(() => null),

      // Calendar-conditioned actor insights for today
      Promise.resolve().then(() => {
        try { return getCalendarActorInsights([], [], new Date()); }
        catch { return null; }
      }),
    ]);

    // Filter signals relevant to this scenario's countries
    const relevantSignals = signalRows.filter(s => {
      const text = `${s.title} ${s.geopoliticalContext || ""}`.toLowerCase();
      return allCountryNames.some(name => text.includes(name.toLowerCase()));
    }).slice(0, 10).map(s => ({
      title: s.title,
      intensity: s.intensity,
      category: s.category,
      date: s.date,
      sectors: s.marketSectors ? JSON.parse(s.marketSectors) : [],
    }));

    // Filter predictions relevant to scenario countries or sectors
    const relevantPredictions = predictionRows.filter(p => {
      const text = p.claim.toLowerCase();
      return allCountryNames.some(name => text.includes(name.toLowerCase()))
        || sectors.some(sec => text.includes(sec.toLowerCase()));
    }).slice(0, 8).map(p => ({
      claim: p.claim,
      confidence: p.confidence,
      category: p.category,
      deadline: p.deadline,
      direction: p.direction,
    }));

    // Build intelligence context
    const intelligence = {
      signals: relevantSignals,
      predictions: relevantPredictions,
      systemicRisk: riskState ? {
        regime: riskState.regime,
        compositeStress: riskState.compositeStress,
        absorptionRatio: riskState.absorptionRatio,
        turbulencePercentile: riskState.turbulencePercentile,
        interpretation: riskState.interpretation,
      } : null,
      calendarContext: calendarInsights,
      signalCount: relevantSignals.length,
      predictionCount: relevantPredictions.length,
      highIntensitySignals: relevantSignals.filter(s => s.intensity >= 4).length,
    };

    return NextResponse.json({
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        actors: [
          { id: "blue", name: "Blue Force", shortName: blueLabel },
          { id: "red", name: "Red Force", shortName: redLabel },
        ],
        strategies: scenario.strategies,
        marketSectors: sectors,
        timeHorizon: scenario.timeHorizon,
      },
      analysis,
      bayesian,
      powerBalance: {
        blue: bluePower,
        red: redPower,
        blueAdvantages: balance.blueAdvantages,
        redAdvantages: balance.redAdvantages,
        contested: balance.contested,
        overallBalance: balance.overallBalance,
      },
      intelligence,
    });
  } catch (error) {
    console.error("Global game theory error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
