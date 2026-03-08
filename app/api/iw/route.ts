import { NextResponse } from "next/server";
import { getAllScenarioStatuses } from "@/lib/iw/engine";
import { getAllScenarios } from "@/lib/iw/scenarios";

export async function GET() {
  try {
    const statuses = await getAllScenarioStatuses();
    return NextResponse.json({ scenarios: statuses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
