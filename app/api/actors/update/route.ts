import { NextResponse } from "next/server";
import { runActorProfileUpdate } from "@/lib/actors/auto-update";

/**
 * POST /api/actors/update
 * Triggers actor profile auto-update from GDELT/news.
 * Called by scheduler or manually.
 */
export async function POST() {
  try {
    const result = await runActorProfileUpdate();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Actor update error:", error);
    return NextResponse.json(
      { error: "Failed to update actor profiles" },
      { status: 500 }
    );
  }
}
