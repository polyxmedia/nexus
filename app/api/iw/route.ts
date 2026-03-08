import { NextResponse } from "next/server";
import { getAllScenarioStatuses } from "@/lib/iw/engine";
import { getAllScenarios } from "@/lib/iw/scenarios";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const statuses = await getAllScenarioStatuses();
    return NextResponse.json({ scenarios: statuses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
