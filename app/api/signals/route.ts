import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { generateSignals } from "@/lib/signals/engine";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const intensity = searchParams.get("intensity");
    const status = searchParams.get("status");

    // Build WHERE conditions to push filtering to DB instead of fetching all rows
    const conditions = [];
    if (intensity) {
      conditions.push(eq(schema.signals.intensity, parseInt(intensity, 10)));
    }
    if (status) {
      conditions.push(eq(schema.signals.status, status));
    }

    const results = conditions.length > 0
      ? await db.select().from(schema.signals)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(schema.signals.date))
          .limit(200)
      : await db.select().from(schema.signals)
          .orderBy(desc(schema.signals.date))
          .limit(200);

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const body = await request.json();
    const { year } = body;

    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "year is required and must be a number" },
        { status: 400 }
      );
    }

    const result = generateSignals(year);

    if (result.signals.length > 0) {
      await db.insert(schema.signals).values(result.signals);
    }

    return NextResponse.json({
      inserted: result.signals.length,
      stats: result.stats,
      shmitaInfo: result.shmitaInfo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
