import { NextResponse } from "next/server";
import { resolveByData } from "@/lib/predictions/engine";

// Fast data-driven resolution - no AI, just market data comparison
// Safe to run frequently (every 30 min)
export async function POST() {
  try {
    const results = await resolveByData();
    return NextResponse.json({
      resolved: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
