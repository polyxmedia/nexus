import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, sql } from "drizzle-orm";
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

    const conditions = [
      sql`${schema.signals.category} IN ('celestial', 'hebrew', 'islamic')`,
    ];
    if (status) {
      conditions.push(sql`${schema.signals.status} = ${status}`);
    }

    const results = await db
      .select()
      .from(schema.signals)
      .where(sql`${conditions.map(c => sql`(${c})`).reduce((a, b) => sql`${a} AND ${b}`)}`)
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
