import { NextRequest, NextResponse } from "next/server";
import { syncTimeline, getTimeline, isExternalSyncStale } from "@/lib/timeline/engine";
import { db, schema } from "@/lib/db";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);

    // Sync in background if stale - don't block the response
    if (isExternalSyncStale()) {
      syncTimeline().catch((err) => console.error("[timeline] Background sync failed:", err));
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

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

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
