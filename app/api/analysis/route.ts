import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { analyzeSignal } from "@/lib/analysis/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signalId } = body;

    if (!signalId || typeof signalId !== "number") {
      return NextResponse.json(
        { error: "signalId is required and must be a number" },
        { status: 400 }
      );
    }

    const signalRows = await db.select().from(schema.signals).where(eq(schema.signals.id, signalId));
    const signal = signalRows[0];

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const apiKeyRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "anthropic_api_key"));

    const apiKey = apiKeyRows[0]?.value || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 400 }
      );
    }

    const analysisData = await analyzeSignal(signal, apiKey);

    const result = await db.insert(schema.analyses).values(analysisData).returning();

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signalId = searchParams.get("signalId");

    let results;

    if (signalId) {
      const id = parseInt(signalId, 10);
      results = await db.select().from(schema.analyses).where(eq(schema.analyses.signalId, id)).orderBy(desc(schema.analyses.createdAt));
    } else {
      results = await db.select().from(schema.analyses).orderBy(desc(schema.analyses.createdAt));
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
