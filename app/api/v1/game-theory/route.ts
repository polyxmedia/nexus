import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess } from "@/lib/api/response";
import { db, schema } from "@/lib/db";
import { desc, eq, inArray } from "drizzle-orm";

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const scenarioId = searchParams.get("scenario_id");

  // Fetch scenarios
  let scenarios;
  if (scenarioId) {
    scenarios = await db
      .select()
      .from(schema.gameTheoryScenarios)
      .where(eq(schema.gameTheoryScenarios.scenarioId, scenarioId))
      .orderBy(desc(schema.gameTheoryScenarios.createdAt))
      .limit(1);
  } else {
    scenarios = await db
      .select()
      .from(schema.gameTheoryScenarios)
      .orderBy(desc(schema.gameTheoryScenarios.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Fetch associated scenario states
  const scenarioIds = scenarios.map((s) => s.scenarioId);
  let states: (typeof schema.scenarioStates.$inferSelect)[] = [];
  if (scenarioIds.length > 0) {
    states = await db
      .select()
      .from(schema.scenarioStates)
      .where(inArray(schema.scenarioStates.scenarioId, scenarioIds))
      .orderBy(desc(schema.scenarioStates.updatedAt));
  }

  const statesByScenario = new Map<string, (typeof schema.scenarioStates.$inferSelect)[]>();
  for (const s of states) {
    const existing = statesByScenario.get(s.scenarioId) || [];
    existing.push(s);
    statesByScenario.set(s.scenarioId, existing);
  }

  return apiSuccess(
    {
      scenarios: scenarios.map((s) => {
        let analysis: Record<string, unknown> | null = null;
        try {
          analysis = JSON.parse(s.analysis) as Record<string, unknown>;
        } catch { /* malformed */ }

        const scenarioStates = statesByScenario.get(s.scenarioId) || [];

        return {
          id: s.scenarioId,
          title: s.title,
          analysis: analysis ? {
            nashEquilibria: analysis.nashEquilibria || [],
            schellingPoints: analysis.schellingPoints || [],
            escalationLadder: analysis.escalationLadder || [],
            dominantStrategies: analysis.dominantStrategies || {},
            marketAssessment: analysis.marketAssessment || null,
          } : null,
          state: scenarioStates.length > 0 ? {
            regime: scenarioStates[0].regime,
            state: scenarioStates[0].state,
            triggeredThresholds: scenarioStates[0].triggeredThresholds
              ? JSON.parse(scenarioStates[0].triggeredThresholds)
              : [],
            invalidatedStrategies: scenarioStates[0].invalidatedStrategies
              ? JSON.parse(scenarioStates[0].invalidatedStrategies)
              : [],
            updatedAt: scenarioStates[0].updatedAt,
          } : null,
          createdAt: s.createdAt,
        };
      }),
      pagination: { limit, offset, count: scenarios.length },
    },
    { tier: ctx.tier },
  );
}, { minTier: "operator", scope: "game_theory" });
