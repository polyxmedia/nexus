export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { generateThesis } from "@/lib/thesis/engine";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: "symbols array is required" },
        { status: 400 }
      );
    }

    const thesis = await generateThesis(symbols);

    return NextResponse.json({ thesis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let results;
    if (status) {
      results = await db.select().from(schema.theses)
        .where(eq(schema.theses.status, status))
        .orderBy(desc(schema.theses.generatedAt))
        .limit(20);
    } else {
      results = await db.select().from(schema.theses)
        .orderBy(desc(schema.theses.generatedAt))
        .limit(20);
    }

    // Parse JSON fields
    const theses = results.map((r) => ({
      ...r,
      tradingActions: JSON.parse(r.tradingActions),
      layerInputs: JSON.parse(r.layerInputs),
      symbols: JSON.parse(r.symbols),
    }));

    return NextResponse.json({ theses }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
