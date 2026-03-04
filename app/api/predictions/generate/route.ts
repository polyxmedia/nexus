import { NextResponse } from "next/server";
import { generatePredictions } from "@/lib/predictions/engine";

export async function POST() {
  try {
    const predictions = await generatePredictions();
    return NextResponse.json({ predictions, count: predictions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
