export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { generatePredictions } from "@/lib/predictions/engine";
import { notifyNewPredictions } from "@/lib/predictions/notify";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const predictions = await generatePredictions();
    let notified = 0;
    if (predictions.length > 0) {
      notified = await notifyNewPredictions(predictions);
    }
    return NextResponse.json({ predictions, count: predictions.length, notified });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
