import { NextRequest, NextResponse } from "next/server";
import { addHypothesis } from "@/lib/ach/engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const { label, description } = await request.json();
    if (!label || !description) {
      return NextResponse.json({ error: "label and description required" }, { status: 400 });
    }
    const result = await addHypothesis(parseInt(analysisId), label, description);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
