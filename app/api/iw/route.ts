import { NextResponse } from "next/server";
import { getAllScenarioStatuses } from "@/lib/iw/engine";
import { getAllScenarios } from "@/lib/iw/scenarios";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const statuses = await getAllScenarioStatuses();
    return NextResponse.json({ scenarios: statuses }, { headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
