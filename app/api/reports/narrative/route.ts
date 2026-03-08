import { NextResponse } from "next/server";
import { generateNarrativeReport } from "@/lib/reports/narrative";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = body.topic || null;

    const apiKeyRow = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "anthropic_api_key"));
    const apiKey =
      apiKeyRow[0]?.value || process.env.ANTHROPIC_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const report = await generateNarrativeReport(topic, apiKey);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Narrative report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
