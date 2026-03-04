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

    const signal = db
      .select()
      .from(schema.signals)
      .where(eq(schema.signals.id, signalId))
      .get();

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const apiKeySetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "anthropic_api_key"))
      .get();

    const apiKey = apiKeySetting?.value || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 400 }
      );
    }

    const analysisData = await analyzeSignal(signal, apiKey);

    const result = db
      .insert(schema.analyses)
      .values(analysisData)
      .returning()
      .get();

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
      results = db
        .select()
        .from(schema.analyses)
        .where(eq(schema.analyses.signalId, id))
        .orderBy(desc(schema.analyses.createdAt))
        .all();
    } else {
      results = db
        .select()
        .from(schema.analyses)
        .orderBy(desc(schema.analyses.createdAt))
        .all();
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
