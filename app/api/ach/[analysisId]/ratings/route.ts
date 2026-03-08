import { NextRequest, NextResponse } from "next/server";
import { rateEvidence } from "@/lib/ach/engine";
import { requireTier } from "@/lib/auth/require-tier";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { analysisId } = await params;
    const { hypothesisId, evidenceId, rating, notes } = await request.json();
    if (!hypothesisId || !evidenceId || !rating) {
      return NextResponse.json({ error: "hypothesisId, evidenceId, and rating required" }, { status: 400 });
    }
    await rateEvidence(parseInt(analysisId), hypothesisId, evidenceId, rating, notes);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
