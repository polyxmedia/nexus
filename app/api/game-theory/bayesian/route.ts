import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";
import {
  initializeBeliefs,
  runBayesianAnalysis,
  createSignalFromOSINT,
} from "@/lib/game-theory/bayesian";
import { N_PLAYER_SCENARIOS, getNPlayerScenario } from "@/lib/game-theory/scenarios-nplayer";

/**
 * GET /api/game-theory/bayesian
 * Returns all N-player scenarios with Bayesian analysis.
 */
export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const results = N_PLAYER_SCENARIOS.map(scenario => {
      const beliefs = initializeBeliefs(scenario.actors);
      const analysis = runBayesianAnalysis(scenario, beliefs);
      return {
        scenario: {
          id: scenario.id,
          title: scenario.title,
          description: scenario.description,
          actors: scenario.actors,
          moveOrder: scenario.moveOrder,
          strategies: scenario.strategies,
          coalitions: scenario.coalitions,
          marketSectors: scenario.marketSectors,
          timeHorizon: scenario.timeHorizon,
        },
        analysis,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Bayesian game theory error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

/**
 * POST /api/game-theory/bayesian
 * Run Bayesian analysis with optional signal updates.
 * Body: { scenarioId: string, signals?: { description: string, actorId: string, source: string }[] }
 */
export async function POST(req: Request) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const body = await req.json();
    const { scenarioId, signals } = body;

    const scenario = getNPlayerScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const beliefs = initializeBeliefs(scenario.actors);

    // Convert raw signals to typed updates
    const signalUpdates = signals?.map((s: { description: string; actorId: string; source?: string }) =>
      createSignalFromOSINT(s.description, s.actorId, (s.source as "osint") || "osint")
    );

    const analysis = runBayesianAnalysis(scenario, beliefs, signalUpdates);

    return NextResponse.json({
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        actors: scenario.actors,
        moveOrder: scenario.moveOrder,
        strategies: scenario.strategies,
        coalitions: scenario.coalitions,
        marketSectors: scenario.marketSectors,
        timeHorizon: scenario.timeHorizon,
      },
      analysis,
    });
  } catch (error) {
    console.error("Bayesian analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
