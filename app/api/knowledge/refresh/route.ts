import { NextRequest, NextResponse } from "next/server";
import { refreshLiveKnowledge, expireStaleKnowledge } from "@/lib/knowledge/live-ingest";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    // Expire stale entries first
    const expired = await expireStaleKnowledge();

    // Refresh with live data
    const result = await refreshLiveKnowledge();

    return NextResponse.json({ ...result, expired });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const { db, schema } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");

    const liveEntries = await db
      .select()
      .from(schema.knowledge)
      .where(eq(schema.knowledge.source, "live-ingest"));

    const now = new Date().toISOString();
    const summary = liveEntries.map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      confidence: e.confidence,
      validUntil: e.validUntil,
      stale: e.validUntil ? e.validUntil < now : false,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json({
      total: liveEntries.length,
      active: liveEntries.filter((e) => e.status === "active").length,
      archived: liveEntries.filter((e) => e.status === "archived").length,
      entries: summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
