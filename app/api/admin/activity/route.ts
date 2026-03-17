import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like, desc, sql, gte } from "drizzle-orm";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (users.length === 0) return false;
  return JSON.parse(users[0].value).role === "admin";
}

/**
 * GET /api/admin/activity - Recent user activity digest
 *
 * Returns last 7 days of activity: who's chatting, predicting, and when they last logged in.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isAdmin(session.user.name))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();

    // Recent chat sessions per user (last 7 days)
    const chatActivity = await db
      .select({
        userId: schema.chatSessions.userId,
        sessions: sql<number>`count(distinct ${schema.chatSessions.id})`,
        messages: sql<number>`count(${schema.chatMessages.id})`,
        lastActive: sql<string>`max(${schema.chatMessages.createdAt})`,
      })
      .from(schema.chatSessions)
      .leftJoin(schema.chatMessages, eq(schema.chatMessages.sessionId, schema.chatSessions.id))
      .where(gte(schema.chatSessions.createdAt, sevenDaysAgo))
      .groupBy(schema.chatSessions.userId);

    // Recent predictions (last 7 days) - predictions table has no userId
    const predictionActivity: Array<{ userId: string; count: number }> = [];

    // Get all user settings for lastLogin
    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(like(schema.settings.key, "user:%"));

    // Build per-user activity map
    const activityMap: Record<string, {
      username: string;
      lastLogin: string | null;
      chatSessions7d: number;
      chatMessages7d: number;
      predictions7d: number;
      lastChatAt: string | null;
      tier: string;
      role: string;
    }> = {};

    for (const s of userSettings) {
      const username = s.key.replace("user:", "");
      const data = JSON.parse(s.value);
      activityMap[username] = {
        username,
        lastLogin: data.lastLogin || null,
        chatSessions7d: 0,
        chatMessages7d: 0,
        predictions7d: 0,
        lastChatAt: null,
        tier: data.tier || "free",
        role: data.role || "user",
      };
    }

    for (const c of chatActivity) {
      const key = c.userId;
      if (activityMap[key]) {
        activityMap[key].chatSessions7d = Number(c.sessions);
        activityMap[key].chatMessages7d = Number(c.messages);
        activityMap[key].lastChatAt = c.lastActive;
      }
    }

    for (const p of predictionActivity) {
      const key = p.userId || "";
      if (activityMap[key]) {
        activityMap[key].predictions7d = Number(p.count);
      }
    }

    // Sort by most active (messages + predictions)
    const users = Object.values(activityMap).sort(
      (a, b) => (b.chatMessages7d + b.predictions7d) - (a.chatMessages7d + a.predictions7d)
    );

    // Summary stats
    const activeToday = users.filter((u) => u.lastLogin && u.lastLogin >= twentyFourHoursAgo).length;
    const active7d = users.filter((u) => u.chatMessages7d > 0 || u.predictions7d > 0).length;
    const totalMessages7d = users.reduce((sum, u) => sum + u.chatMessages7d, 0);
    const totalPredictions7d = users.reduce((sum, u) => sum + u.predictions7d, 0);

    return NextResponse.json({
      summary: {
        totalUsers: users.length,
        activeToday,
        active7d,
        totalMessages7d,
        totalPredictions7d,
      },
      users: users.slice(0, 20), // Top 20 most active
    });
  } catch (error) {
    console.error("Activity API error:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
