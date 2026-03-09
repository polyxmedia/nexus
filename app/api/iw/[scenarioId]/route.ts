import { NextRequest, NextResponse } from "next/server";
import { evaluateScenario } from "@/lib/iw/engine";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { scenarioId } = await params;
    const status = await evaluateScenario(scenarioId);
    if (!status) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
