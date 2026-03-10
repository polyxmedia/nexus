import { NextRequest, NextResponse } from "next/server";
import { SCENARIOS, ACTORS } from "@/lib/game-theory/actors";
import { getWartimeAnalysis } from "@/lib/game-theory/wartime";
import { analyzeScenario } from "@/lib/game-theory/analysis";
import { requireTier } from "@/lib/auth/require-tier";
import type { StrategicScenario, PayoffEntry } from "@/lib/thesis/types";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const analyses = await Promise.all(SCENARIOS.map(async (scenario) => {
      const { analysis, scenarioState, isWartime } = await getWartimeAnalysis(scenario.id);
      return {
        scenario: {
          id: scenario.id,
          title: scenario.title,
          description: scenario.description,
          actors: scenario.actors.map((actorId) => {
            const actor = ACTORS.find((a) => a.id === actorId);
            return {
              id: actorId,
              name: actor?.name || actorId,
              shortName: actor?.shortName || actorId,
            };
          }),
          strategies: scenario.strategies,
          marketSectors: scenario.marketSectors,
          timeHorizon: scenario.timeHorizon,
        },
        analysis,
        scenarioState,
        isWartime,
      };
    }));

    return NextResponse.json({ scenarios: analyses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Custom scenario creation ──

// Escalation keywords used for payoff heuristics
const ESCALATORY_KEYWORDS = ["military", "strike", "attack", "war", "invasion", "blockade", "nuclear", "escalat"];
const COOPERATIVE_KEYWORDS = ["diplomacy", "negotiate", "concession", "treaty", "cooperat", "de-escalat", "peace", "withdraw"];
const ECONOMIC_KEYWORDS = ["sanction", "tariff", "embargo", "trade", "economic"];

function classifyStrategy(strat: string): "escalatory" | "economic" | "cooperative" | "moderate" {
  const lower = strat.toLowerCase();
  if (ESCALATORY_KEYWORDS.some(kw => lower.includes(kw))) return "escalatory";
  if (COOPERATIVE_KEYWORDS.some(kw => lower.includes(kw))) return "cooperative";
  if (ECONOMIC_KEYWORDS.some(kw => lower.includes(kw))) return "economic";
  return "moderate";
}

function generatePayoff(
  s1Class: ReturnType<typeof classifyStrategy>,
  s2Class: ReturnType<typeof classifyStrategy>,
): { p1: number; p2: number; direction: "bullish" | "bearish" | "mixed"; magnitude: "low" | "medium" | "high" } {
  // Payoff table: rows = actor1 class, cols = actor2 class
  const table: Record<string, Record<string, { p1: number; p2: number }>> = {
    escalatory: {
      escalatory:  { p1: -6, p2: -6 },
      economic:    { p1: 2,  p2: -4 },
      cooperative: { p1: 5,  p2: -7 },
      moderate:    { p1: 3,  p2: -3 },
    },
    economic: {
      escalatory:  { p1: -4, p2: 2 },
      economic:    { p1: -1, p2: -1 },
      cooperative: { p1: 3,  p2: -2 },
      moderate:    { p1: 1,  p2: -1 },
    },
    cooperative: {
      escalatory:  { p1: -7, p2: 5 },
      economic:    { p1: -2, p2: 3 },
      cooperative: { p1: 4,  p2: 4 },
      moderate:    { p1: 2,  p2: 3 },
    },
    moderate: {
      escalatory:  { p1: -3, p2: 3 },
      economic:    { p1: -1, p2: 1 },
      cooperative: { p1: 3,  p2: 2 },
      moderate:    { p1: 1,  p2: 1 },
    },
  };

  const { p1, p2 } = table[s1Class]?.[s2Class] ?? { p1: 0, p2: 0 };

  // Add small random noise so identical classifications differ slightly
  const noise1 = Math.round((Math.random() - 0.5) * 2 * 10) / 10;
  const noise2 = Math.round((Math.random() - 0.5) * 2 * 10) / 10;
  const fp1 = Math.max(-8, Math.min(8, p1 + noise1));
  const fp2 = Math.max(-8, Math.min(8, p2 + noise2));

  const total = fp1 + fp2;
  const direction: "bullish" | "bearish" | "mixed" =
    total > 2 ? "bullish" : total < -2 ? "bearish" : "mixed";

  const escLevel = (s1Class === "escalatory" ? 2 : s1Class === "economic" ? 1 : 0)
                 + (s2Class === "escalatory" ? 2 : s2Class === "economic" ? 1 : 0);
  const magnitude: "low" | "medium" | "high" =
    escLevel >= 3 ? "high" : escLevel >= 1 ? "medium" : "low";

  return { p1: fp1, p2: fp2, direction, magnitude };
}

export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const body = await request.json();
    const {
      title,
      description,
      actor1Name,
      actor2Name,
      strategies1,
      strategies2,
      marketSectors,
      timeHorizon,
    } = body as {
      title: string;
      description: string;
      actor1Name: string;
      actor2Name: string;
      strategies1: string[];
      strategies2: string[];
      marketSectors: string[];
      timeHorizon: string;
    };

    // Validate
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!actor1Name?.trim() || !actor2Name?.trim()) {
      return NextResponse.json({ error: "Both actor names are required" }, { status: 400 });
    }
    if (!strategies1?.length || strategies1.length < 2) {
      return NextResponse.json({ error: "Actor 1 needs at least 2 strategies" }, { status: 400 });
    }
    if (!strategies2?.length || strategies2.length < 2) {
      return NextResponse.json({ error: "Actor 2 needs at least 2 strategies" }, { status: 400 });
    }
    if (strategies1.length > 5 || strategies2.length > 5) {
      return NextResponse.json({ error: "Maximum 5 strategies per actor" }, { status: 400 });
    }

    const a1Id = actor1Name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);
    const a2Id = actor2Name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);
    const sectors = marketSectors?.length ? marketSectors : ["geopolitics"];
    const horizon = (["immediate", "short_term", "medium_term", "long_term"].includes(timeHorizon)
      ? timeHorizon
      : "medium_term") as StrategicScenario["timeHorizon"];

    // Generate payoff matrix from strategy classification heuristics
    const payoffMatrix: PayoffEntry[] = [];
    for (const s1 of strategies1) {
      const s1Class = classifyStrategy(s1);
      for (const s2 of strategies2) {
        const s2Class = classifyStrategy(s2);
        const { p1, p2, direction, magnitude } = generatePayoff(s1Class, s2Class);
        payoffMatrix.push({
          strategies: { [a1Id]: s1, [a2Id]: s2 },
          payoffs: { [a1Id]: p1, [a2Id]: p2 },
          marketImpact: {
            direction,
            magnitude,
            sectors,
            description: `${s1} vs ${s2}`,
          },
        });
      }
    }

    // Build StrategicScenario
    const scenario: StrategicScenario = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      description: description?.trim() || `Custom scenario: ${actor1Name} vs ${actor2Name}`,
      actors: [a1Id, a2Id],
      strategies: { [a1Id]: strategies1, [a2Id]: strategies2 },
      payoffMatrix,
      context: `Custom scenario created by user.`,
      marketSectors: sectors,
      timeHorizon: horizon,
    };

    // Run analysis
    const analysis = analyzeScenario(scenario);

    return NextResponse.json({
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        actors: [
          { id: a1Id, name: actor1Name.trim(), shortName: actor1Name.trim() },
          { id: a2Id, name: actor2Name.trim(), shortName: actor2Name.trim() },
        ],
        strategies: scenario.strategies,
        marketSectors: sectors,
        timeHorizon: horizon,
      },
      analysis,
      custom: true,
    });
  } catch (error) {
    console.error("Custom scenario error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
