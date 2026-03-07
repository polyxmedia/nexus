import { NextRequest, NextResponse } from "next/server";
import { ingestDeterministicKnowledge, DETERMINISTIC_ENTRY_COUNT } from "@/lib/knowledge/ingest-deterministic";
import { ingestAdvancedKnowledge, ADVANCED_ENTRY_COUNT } from "@/lib/knowledge/ingest-advanced";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pack = searchParams.get("pack") || "all";

    const results: Record<string, unknown> = {};

    if (pack === "deterministic" || pack === "all") {
      console.log(`Ingesting deterministic knowledge (${DETERMINISTIC_ENTRY_COUNT} entries)...`);
      results.deterministic = await ingestDeterministicKnowledge();
    }

    if (pack === "advanced" || pack === "all") {
      console.log(`Ingesting advanced knowledge (${ADVANCED_ENTRY_COUNT} entries)...`);
      results.advanced = await ingestAdvancedKnowledge();
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
