import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, desc, eq, gte } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${session.user.name}`));
    const userData = userSettings[0]?.value ? JSON.parse(userSettings[0].value) : {};
    if (userData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const events = schema.analyticsEvents;

    // Total pageviews
    const [totalViews] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(gte(events.createdAt, since));

    // Unique sessions
    const [uniqueSessions] = await db
      .select({ count: sql<number>`count(distinct ${events.sessionHash})` })
      .from(events)
      .where(gte(events.createdAt, since));

    // Top pages
    const topPages = await db
      .select({
        path: events.path,
        views: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct ${events.sessionHash})`,
      })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(events.path)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    // Daily views (for chart)
    const dailyViews = await db
      .select({
        date: sql<string>`substr(${events.createdAt}, 1, 10)`,
        views: sql<number>`count(*)`,
        unique: sql<number>`count(distinct ${events.sessionHash})`,
      })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(sql`substr(${events.createdAt}, 1, 10)`)
      .orderBy(sql`substr(${events.createdAt}, 1, 10)`);

    // Device breakdown
    const devices = await db
      .select({
        deviceType: events.deviceType,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(events.deviceType)
      .orderBy(desc(sql`count(*)`));

    // Top referrers
    const referrers = await db
      .select({
        referrer: events.referrer,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(events.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Hourly distribution
    const hourly = await db
      .select({
        hour: sql<string>`substr(${events.createdAt}, 12, 2)`,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(sql`substr(${events.createdAt}, 12, 2)`)
      .orderBy(sql`substr(${events.createdAt}, 12, 2)`);

    return NextResponse.json({
      period: { days, since },
      totalViews: totalViews.count,
      uniqueSessions: uniqueSessions.count,
      avgViewsPerSession: uniqueSessions.count > 0
        ? Math.round((totalViews.count / uniqueSessions.count) * 10) / 10
        : 0,
      topPages,
      dailyViews,
      devices,
      referrers: referrers.filter((r: { referrer: string | null; count: number }) => r.referrer),
      hourly,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
