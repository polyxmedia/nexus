import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";

// Calendar/celestial/theological signals endpoint.
// Separated from the main signals feed so market signals aren't
// mixed with calendar events. These are actor-belief context only
// (max 0.5 bonus, no convergence weight per CLAUDE.md).

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const conditions: SQL[] = [
      sql`${schema.signals.category} IN ('celestial', 'hebrew', 'islamic', 'convergence')`,
    ];
    if (status) {
      conditions.push(eq(schema.signals.status, status));
    }

    const results = await db
      .select()
      .from(schema.signals)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(schema.signals.date))
      .limit(100);

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
