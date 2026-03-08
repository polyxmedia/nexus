import { NextRequest, NextResponse } from "next/server";
import { addEvidence } from "@/lib/ach/engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const { description, source, credibility, relevance, sourceReliability, informationAccuracy } = await request.json();
    if (!description || !source) {
      return NextResponse.json({ error: "description and source required" }, { status: 400 });
    }
    const result = await addEvidence(
      parseInt(analysisId),
      description,
      source,
      credibility || "medium",
      relevance || "medium",
      sourceReliability,
      informationAccuracy
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
