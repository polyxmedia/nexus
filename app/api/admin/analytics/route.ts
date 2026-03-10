import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, desc, eq, gte, and, isNotNull } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${session.user.name}`));
    const userData = userSettings[0]?.value ? JSON.parse(userSettings[0].value) : {};
    if (userData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = rateLimit(`admin:analytics:${session.user.name}`, 60, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const e = schema.analyticsEvents;

    // Total pageviews
    const [totalViews] = await db
      .select({ count: sql<number>`count(*)` })
      .from(e)
      .where(gte(e.createdAt, since));

    // Unique sessions
    const [uniqueSessions] = await db
      .select({ count: sql<number>`count(distinct ${e.sessionHash})` })
      .from(e)
      .where(gte(e.createdAt, since));

    // Unique visitors (persistent across days)
    const [uniqueVisitors] = await db
      .select({ count: sql<number>`count(distinct ${e.visitorHash})` })
      .from(e)
      .where(and(gte(e.createdAt, since), isNotNull(e.visitorHash)));

    // Bounce rate: sessions with only 1 pageview
    const bounceSessions = await db
      .select({
        sessionHash: e.sessionHash,
        pageCount: sql<number>`count(*)`,
      })
      .from(e)
      .where(gte(e.createdAt, since))
      .groupBy(e.sessionHash);

    const totalSess = bounceSessions.length;
    const bouncedCount = bounceSessions.filter((s) => s.pageCount === 1).length;
    const bounceRate = totalSess > 0 ? Math.round((bouncedCount / totalSess) * 1000) / 10 : 0;

    // Avg session duration (from pageviews with duration)
    const [avgDuration] = await db
      .select({ avg: sql<number>`coalesce(avg(${e.duration}), 0)` })
      .from(e)
      .where(and(gte(e.createdAt, since), isNotNull(e.duration)));

    // New vs returning visitors
    // "New" = visitorHash first seen within the period
    const [newVisitorCount] = await db
      .select({
        count: sql<number>`count(distinct v.visitor_hash)`,
      })
      .from(
        sql`(
          SELECT visitor_hash, min(created_at) as first_seen
          FROM analytics_events
          WHERE visitor_hash IS NOT NULL
          GROUP BY visitor_hash
          HAVING min(created_at) >= ${since}
        ) v`
      );

    const totalUniqueVisitors = (uniqueVisitors?.count || 0);
    const newVisitors = newVisitorCount?.count || 0;
    const returningVisitors = Math.max(0, totalUniqueVisitors - newVisitors);

    // Top pages
    const topPages = await db
      .select({
        path: e.path,
        views: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct ${e.sessionHash})`,
        avgDuration: sql<number>`coalesce(avg(${e.duration}), 0)`,
      })
      .from(e)
      .where(gte(e.createdAt, since))
      .groupBy(e.path)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    // Daily views
    const dailyViews = await db
      .select({
        date: sql<string>`substr(${e.createdAt}, 1, 10)`,
        views: sql<number>`count(*)`,
        unique: sql<number>`count(distinct ${e.sessionHash})`,
        visitors: sql<number>`count(distinct ${e.visitorHash})`,
      })
      .from(e)
      .where(gte(e.createdAt, since))
      .groupBy(sql`substr(${e.createdAt}, 1, 10)`)
      .orderBy(sql`substr(${e.createdAt}, 1, 10)`);

    // Device breakdown
    const devices = await db
      .select({
        deviceType: e.deviceType,
        count: sql<number>`count(*)`,
      })
      .from(e)
      .where(gte(e.createdAt, since))
      .groupBy(e.deviceType)
      .orderBy(desc(sql`count(*)`));

    // Browser breakdown
    const browsers = await db
      .select({
        browser: e.browser,
        count: sql<number>`count(*)`,
      })
      .from(e)
      .where(and(gte(e.createdAt, since), isNotNull(e.browser)))
      .groupBy(e.browser)
      .orderBy(desc(sql`count(*)`));

    // OS breakdown
    const operatingSystems = await db
      .select({
        os: e.os,
        count: sql<number>`count(*)`,
      })
      .from(e)
      .where(and(gte(e.createdAt, since), isNotNull(e.os)))
      .groupBy(e.os)
      .orderBy(desc(sql`count(*)`));

    // Top referrers
    const referrers = await db
      .select({
        referrer: e.referrer,
        count: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct ${e.sessionHash})`,
      })
      .from(e)
      .where(and(gte(e.createdAt, since), isNotNull(e.referrer)))
      .groupBy(e.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    // Hourly distribution
    const hourly = await db
      .select({
        hour: sql<string>`substr(${e.createdAt}, 12, 2)`,
        count: sql<number>`count(*)`,
      })
      .from(e)
      .where(gte(e.createdAt, since))
      .groupBy(sql`substr(${e.createdAt}, 12, 2)`)
      .orderBy(sql`substr(${e.createdAt}, 12, 2)`);

    // Countries
    const countries = await db
      .select({
        country: e.country,
        count: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct ${e.sessionHash})`,
      })
      .from(e)
      .where(and(gte(e.createdAt, since), isNotNull(e.country)))
      .groupBy(e.country)
      .orderBy(desc(sql`count(*)`))
      .limit(30);

    // Cities (top 15)
    const cities = await db
      .select({
        city: e.city,
        country: e.country,
        count: sql<number>`count(*)`,
      })
      .from(e)
      .where(and(gte(e.createdAt, since), isNotNull(e.city)))
      .groupBy(e.city, e.country)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    // Screen resolutions (top 10)
    const screens = await db
      .select({
        width: e.screenWidth,
        height: e.screenHeight,
        count: sql<number>`count(*)`,
      })
      .from(e)
      .where(and(gte(e.createdAt, since), isNotNull(e.screenWidth)))
      .groupBy(e.screenWidth, e.screenHeight)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Entry pages (first page in session)
    const entryPages = await db
      .select({
        path: sql<string>`path`,
        count: sql<number>`count(*)`,
      })
      .from(
        sql`(
          SELECT DISTINCT ON (session_hash) path
          FROM analytics_events
          WHERE created_at >= ${since}
          ORDER BY session_hash, created_at ASC
        ) entry`
      )
      .groupBy(sql`path`)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Exit pages (last page in session)
    const exitPages = await db
      .select({
        path: sql<string>`path`,
        count: sql<number>`count(*)`,
      })
      .from(
        sql`(
          SELECT DISTINCT ON (session_hash) path
          FROM analytics_events
          WHERE created_at >= ${since}
          ORDER BY session_hash, created_at DESC
        ) exit_q`
      )
      .groupBy(sql`path`)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Live: last 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const [liveNow] = await db
      .select({
        activeVisitors: sql<number>`count(distinct ${e.sessionHash})`,
        pageviews: sql<number>`count(*)`,
      })
      .from(e)
      .where(gte(e.createdAt, thirtyMinAgo));

    return NextResponse.json({
      period: { days, since },
      totalViews: totalViews.count,
      uniqueSessions: uniqueSessions.count,
      uniqueVisitors: totalUniqueVisitors,
      avgViewsPerSession: uniqueSessions.count > 0
        ? Math.round((totalViews.count / uniqueSessions.count) * 10) / 10
        : 0,
      bounceRate,
      avgDuration: Math.round(avgDuration.avg),
      newVisitors,
      returningVisitors,
      live: {
        activeVisitors: liveNow.activeVisitors,
        pageviews: liveNow.pageviews,
      },
      topPages,
      dailyViews,
      devices,
      browsers,
      operatingSystems,
      referrers: referrers.filter((r) => r.referrer),
      hourly,
      countries,
      cities,
      screens,
      entryPages,
      exitPages,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
