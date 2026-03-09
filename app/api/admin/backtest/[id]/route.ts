import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getBacktestRun } from "@/lib/backtest/engine";

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, `user:${session.user.name}`));
  if (!rows[0]) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = JSON.parse(rows[0].value);
    if (data.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const run = await getBacktestRun(id);

    if (!run) {
      return NextResponse.json({ error: "Backtest run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
