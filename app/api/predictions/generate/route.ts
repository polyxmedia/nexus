import { NextResponse } from "next/server";
import { generatePredictions } from "@/lib/predictions/engine";
import { notifyNewPredictions } from "@/lib/predictions/notify";

export async function POST() {
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
