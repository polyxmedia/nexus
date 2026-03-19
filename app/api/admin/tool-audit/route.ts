import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = await rateLimit(`admin:tool-audit:${session.user.name}`, 60, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const params = new URL(request.url).searchParams;
    const toolName = params.get("tool_name");
    const successFilter = params.get("success");
    const days = parseInt(params.get("days") || "7", 10);
    const limit = Math.min(parseInt(params.get("limit") || "100", 10), 500);

    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

    const conditions = [gte(schema.toolAuditLog.createdAt, cutoff)];
    if (toolName) conditions.push(eq(schema.toolAuditLog.toolName, toolName));
    if (successFilter !== null && successFilter !== undefined && successFilter !== "") {
      conditions.push(eq(schema.toolAuditLog.success, successFilter === "true"));
    }

    const rows = await db
      .select()
      .from(schema.toolAuditLog)
      .where(and(...conditions))
      .orderBy(desc(schema.toolAuditLog.createdAt))
      .limit(limit);

    // Aggregate stats
    const stats = await db
      .select({
        toolName: schema.toolAuditLog.toolName,
        count: sql<number>`count(*)::int`,
        avgDurationMs: sql<number>`round(avg(${schema.toolAuditLog.durationMs}))::int`,
        errorCount: sql<number>`count(*) filter (where not ${schema.toolAuditLog.success})::int`,
      })
      .from(schema.toolAuditLog)
      .where(gte(schema.toolAuditLog.createdAt, cutoff))
      .groupBy(schema.toolAuditLog.toolName)
      .orderBy(sql`count(*) desc`);

    return NextResponse.json({ rows, stats, total: rows.length });
  } catch (error) {
    console.error("[admin/tool-audit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
