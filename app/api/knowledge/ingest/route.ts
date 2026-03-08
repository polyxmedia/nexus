import { NextRequest, NextResponse } from "next/server";
import { ingestDeterministicKnowledge, DETERMINISTIC_ENTRY_COUNT } from "@/lib/knowledge/ingest-deterministic";
import { ingestAdvancedKnowledge, ADVANCED_ENTRY_COUNT } from "@/lib/knowledge/ingest-advanced";
import { ingestFinalKnowledge, FINAL_ENTRY_COUNT } from "@/lib/knowledge/ingest-final";
import { ingestEpsteinNetwork } from "@/lib/knowledge/ingest-epstein-network";
import { ingestDeepGeopolitical, DEEP_GEOPOLITICAL_ENTRY_COUNT } from "@/lib/knowledge/ingest-geopolitical-deep";
import { ingestStructuralKnowledge, STRUCTURAL_ENTRY_COUNT } from "@/lib/knowledge/ingest-structural";

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

    if (pack === "final" || pack === "all") {
      console.log(`Ingesting final knowledge (${FINAL_ENTRY_COUNT} entries)...`);
      results.final = await ingestFinalKnowledge();
    }

    if (pack === "epstein" || pack === "all") {
      console.log("Ingesting Epstein network knowledge...");
      results.epstein = await ingestEpsteinNetwork();
    }

    if (pack === "deep-geo" || pack === "all") {
      console.log(`Ingesting deep geopolitical knowledge (${DEEP_GEOPOLITICAL_ENTRY_COUNT} entries)...`);
      results.deepGeo = await ingestDeepGeopolitical();
    }

    if (pack === "structural" || pack === "all") {
      console.log(`Ingesting structural knowledge (${STRUCTURAL_ENTRY_COUNT} entries)...`);
      results.structural = await ingestStructuralKnowledge();
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
