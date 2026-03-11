import { NextRequest, NextResponse } from "next/server";
import { resolveByData } from "@/lib/predictions/engine";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";
import { fetchAndTweetResolutions } from "@/lib/twitter/predictions";

// Fast data-driven resolution - no AI, just market data comparison
// Safe to run frequently (every 30 min)
export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const results = await resolveByData();

    // Tweet resolutions
    if (results.length > 0) {
      try {
        await fetchAndTweetResolutions(results.map((r) => r.id));
      } catch (err) {
        console.error("[fast-resolve] Twitter notification failed:", err);
      }
    }

    return NextResponse.json({
      resolved: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
