import { NextResponse } from "next/server";
import { autoDetectIndicators, getAllScenarioStatuses } from "@/lib/iw/engine";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
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
