import { NextRequest, NextResponse } from "next/server";
import { runActorProfileUpdate } from "@/lib/actors/auto-update";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

/**
 * POST /api/actors/update
 * Triggers actor profile auto-update from GDELT/news.
 * Called by scheduler or manually (admin only).
 */
export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

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
