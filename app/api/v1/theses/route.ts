import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess } from "@/lib/api/response";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const status = searchParams.get("status") || "active";

  const theses = await db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, status))
    .orderBy(desc(schema.theses.generatedAt))
    .limit(limit)
    .offset(offset);

  return apiSuccess(
    {
      theses: theses.map((t) => ({
        id: t.uuid,
        title: t.title,
        status: t.status,
        generatedAt: t.generatedAt,
        validUntil: t.validUntil,
        marketRegime: t.marketRegime,
        volatilityOutlook: t.volatilityOutlook,
        convergenceDensity: t.convergenceDensity,
        overallConfidence: t.overallConfidence,
        executiveSummary: t.executiveSummary,
        situationAssessment: t.situationAssessment,
        tradingActions: JSON.parse(t.tradingActions),
        riskScenarios: t.riskScenarios,
        symbols: JSON.parse(t.symbols),
        redTeamChallenge: t.redTeamChallenge ? JSON.parse(t.redTeamChallenge) : null,
      })),
      pagination: { limit, offset, count: theses.length },
    },
    { tier: ctx.tier },
  );
}, { minTier: "operator", scope: "theses" });
