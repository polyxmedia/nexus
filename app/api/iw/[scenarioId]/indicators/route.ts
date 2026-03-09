import { NextRequest, NextResponse } from "next/server";
import { activateIndicator, deactivateIndicator } from "@/lib/iw/engine";
import { requireTier } from "@/lib/auth/require-tier";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { scenarioId } = await params;
    const body = await request.json();
    const { indicatorId, status, evidence } = body;

    if (!indicatorId) {
      return NextResponse.json({ error: "indicatorId required" }, { status: 400 });
    }

    if (status === "inactive") {
      const result = await deactivateIndicator(scenarioId, indicatorId);
      return NextResponse.json(result);
    }

    const result = await activateIndicator(
      scenarioId,
      indicatorId,
      status || "watching",
      evidence || ""
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
