import { NextResponse } from "next/server";
import { SCENARIOS, ACTORS } from "@/lib/game-theory/actors";
import { analyzeScenario } from "@/lib/game-theory/analysis";

export async function GET() {
  try {
    const analyses = SCENARIOS.map((scenario) => ({
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
      analysis: analyzeScenario(scenario),
    }));

    return NextResponse.json({ scenarios: analyses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
