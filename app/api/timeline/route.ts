import { NextRequest, NextResponse } from "next/server";
import { syncTimeline, getTimeline } from "@/lib/timeline/engine";
import { db, schema } from "@/lib/db";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);

    // Auto-sync if timeline is empty
    const rows = await db.select().from(schema.timelineEvents);
    if (rows.length === 0) {
      await syncTimeline();
    }

    const options = {
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      types: searchParams.get("types")?.split(",").filter(Boolean) || undefined,
      categories: searchParams.get("categories")?.split(",").filter(Boolean) || undefined,
      minSeverity: searchParams.get("minSeverity") ? parseInt(searchParams.get("minSeverity")!, 10) : undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined,
    };

    const events = await getTimeline(options);
    return NextResponse.json({ events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Timeline error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const count = await syncTimeline();
    return NextResponse.json({ success: true, synced: count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Timeline sync error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
