import { NextResponse } from "next/server";
import { SCENARIOS, ACTORS } from "@/lib/game-theory/actors";
import { getWartimeAnalysis } from "@/lib/game-theory/wartime";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("operator");
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
