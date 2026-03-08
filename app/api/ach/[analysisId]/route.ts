import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, deleteAnalysis, evaluateMatrix } from "@/lib/ach/engine";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { analysisId } = await params;
    const data = await getAnalysis(parseInt(analysisId));
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await evaluateMatrix(parseInt(analysisId));
    return NextResponse.json({ ...data, evaluation: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { analysisId } = await params;
    await deleteAnalysis(parseInt(analysisId));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
