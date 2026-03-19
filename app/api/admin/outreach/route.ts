import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getProspectStats, updateProspectStatus, deleteProspect, discoverProspects } from "@/lib/outreach/engine";

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, `user:${session.user.name}`));
  if (rows.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const data = JSON.parse(rows[0].value);
    if (data.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const stats = await getProspectStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();

  try {
    if (body.action === "discover") {
      const result = await discoverProspects();
      return NextResponse.json(result);
    }

    if (body.action === "update_status" && body.id) {
      const ok = await updateProspectStatus(body.id, body.status, body.notes);
      if (!ok) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete" && body.id) {
      const ok = await deleteProspect(body.id);
      if (!ok) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
