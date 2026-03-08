import { NextRequest, NextResponse } from "next/server";
import { evaluateScenario } from "@/lib/iw/engine";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
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
