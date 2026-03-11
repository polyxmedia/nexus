import { NextRequest, NextResponse } from "next/server";
import { aiAssistAnalysis } from "@/lib/ach/engine";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  const csrfError = validateOrigin(_request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { analysisId } = await params;
    const result = await aiAssistAnalysis(parseInt(analysisId));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
