import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { db, schema } from "@/lib/db";
import { desc, gte, lte, eq } from "drizzle-orm";

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const minIntensity = parseInt(searchParams.get("min_intensity") || "1", 10);
  const status = searchParams.get("status"); // upcoming | active | passed
  const category = searchParams.get("category"); // celestial | geopolitical | etc.

  let query = db
    .select()
    .from(schema.signals)
    .where(gte(schema.signals.intensity, minIntensity))
    .orderBy(desc(schema.signals.createdAt))
    .limit(limit)
    .offset(offset);

  if (status) {
    query = db
      .select()
      .from(schema.signals)
      .where(eq(schema.signals.status, status))
      .orderBy(desc(schema.signals.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const signals = await query;

  // Filter by category in JS (Drizzle doesn't allow dynamic AND chaining cleanly here)
  const filtered = category
    ? signals.filter((s) => s.category === category)
    : signals;

  return apiSuccess(
    {
      signals: filtered.map((s) => ({
        id: s.uuid,
        title: s.title,
        description: s.description,
        date: s.date,
        endDate: s.endDate,
        intensity: s.intensity,
        category: s.category,
        layers: JSON.parse(s.layers),
        marketSectors: s.marketSectors ? JSON.parse(s.marketSectors) : null,
        status: s.status,
        createdAt: s.createdAt,
      })),
      pagination: { limit, offset, count: filtered.length },
    },
    { tier: ctx.tier },
  );
}, { minTier: "analyst", scope: "signals" });
