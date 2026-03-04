import { NextResponse } from "next/server";
import { resolvePredictions } from "@/lib/predictions/engine";

export async function POST() {
  try {
    const results = await resolvePredictions();
    return NextResponse.json({ results, count: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
