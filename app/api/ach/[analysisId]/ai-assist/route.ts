import { NextRequest, NextResponse } from "next/server";
import { aiAssistAnalysis } from "@/lib/ach/engine";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const result = await aiAssistAnalysis(parseInt(analysisId));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
