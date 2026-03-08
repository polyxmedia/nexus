import { NextResponse } from "next/server";
import { autoDetectIndicators, getAllScenarioStatuses } from "@/lib/iw/engine";

export async function POST() {
  try {
    const detection = await autoDetectIndicators();
    const statuses = await getAllScenarioStatuses();

    return NextResponse.json({
      detection,
      scenarios: statuses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
