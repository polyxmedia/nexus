import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, desc, sql, and } from "drizzle-orm";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = rateLimit(`admin:user-stats:${session.user.name}`, 60, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { username } = await params;

    // 1. Credit balance
    const balanceRows = await db
      .select()
      .from(schema.creditBalances)
      .where(eq(schema.creditBalances.userId, username));

    const creditBalance = balanceRows.length > 0
      ? {
          period: balanceRows[0].period,
          creditsGranted: balanceRows[0].creditsGranted,
          creditsUsed: balanceRows[0].creditsUsed,
          creditsRemaining: Math.max(0, balanceRows[0].creditsGranted - balanceRows[0].creditsUsed),
        }
      : null;

    // 2. Credit usage history (last 30 entries)
    const ledgerRows = await db
      .select()
      .from(schema.creditLedger)
      .where(eq(schema.creditLedger.userId, username))
      .orderBy(desc(schema.creditLedger.createdAt))
      .limit(30);

    // 3. Credit usage totals by period
    const usageByPeriod = await db
      .select({
        period: schema.creditLedger.period,
        totalCredits: sql<number>`sum(abs(${schema.creditLedger.amount}))`,
        totalInputTokens: sql<number>`sum(${schema.creditLedger.inputTokens})`,
        totalOutputTokens: sql<number>`sum(${schema.creditLedger.outputTokens})`,
        callCount: sql<number>`count(*)`,
      })
      .from(schema.creditLedger)
      .where(eq(schema.creditLedger.userId, username))
      .groupBy(schema.creditLedger.period)
      .orderBy(desc(schema.creditLedger.period))
      .limit(6);

    // 4. Model usage breakdown
    const modelUsage = await db
      .select({
        model: schema.creditLedger.model,
        totalCredits: sql<number>`sum(abs(${schema.creditLedger.amount}))`,
        totalInputTokens: sql<number>`sum(${schema.creditLedger.inputTokens})`,
        totalOutputTokens: sql<number>`sum(${schema.creditLedger.outputTokens})`,
        callCount: sql<number>`count(*)`,
      })
      .from(schema.creditLedger)
      .where(eq(schema.creditLedger.userId, username))
      .groupBy(schema.creditLedger.model);

    // 5. Chat sessions
    const chatSessionRows = await db
      .select({
        id: schema.chatSessions.id,
        uuid: schema.chatSessions.uuid,
        title: schema.chatSessions.title,
        createdAt: schema.chatSessions.createdAt,
        updatedAt: schema.chatSessions.updatedAt,
      })
      .from(schema.chatSessions)
      .where(eq(schema.chatSessions.userId, username))
      .orderBy(desc(schema.chatSessions.createdAt))
      .limit(10);

    // 6. Total chat sessions and messages
    const chatCounts = await db
      .select({
        sessionCount: sql<number>`count(distinct ${schema.chatSessions.id})`,
      })
      .from(schema.chatSessions)
      .where(eq(schema.chatSessions.userId, username));

    // Get message counts for this user's sessions
    const sessionIds = chatSessionRows.map((s) => s.id);
    let totalMessages = 0;
    if (sessionIds.length > 0) {
      const msgCounts = await db
        .select({
          total: sql<number>`count(*)`,
        })
        .from(schema.chatMessages)
        .where(
          sql`${schema.chatMessages.sessionId} IN (
            SELECT id FROM chat_sessions WHERE user_id = ${username}
          )`
        );
      totalMessages = msgCounts[0]?.total ?? 0;
    }

    // 7. Trades
    const tradeRows = await db
      .select()
      .from(schema.trades)
      .where(eq(schema.trades.userId, username))
      .orderBy(desc(schema.trades.createdAt))
      .limit(10);

    const tradeCounts = await db
      .select({
        total: sql<number>`count(*)`,
        filled: sql<number>`sum(case when status = 'filled' then 1 else 0 end)`,
      })
      .from(schema.trades)
      .where(eq(schema.trades.userId, username));

    // 8. Support tickets
    const tickets = await db
      .select()
      .from(schema.supportTickets)
      .where(eq(schema.supportTickets.userId, username))
      .orderBy(desc(schema.supportTickets.createdAt))
      .limit(5);

    // 9. User settings (login info, created date)
    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    let accountCreated: string | null = null;
    let lastLogin: string | null = null;
    if (userSettings.length > 0) {
      try {
        const data = JSON.parse(userSettings[0].value);
        accountCreated = data.createdAt || null;
        lastLogin = data.lastLogin || null;
      } catch {
        // ignore
      }
    }

    // 10. Daily usage for last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const dailyUsage = await db
      .select({
        day: sql<string>`substr(${schema.creditLedger.createdAt}, 1, 10)`,
        credits: sql<number>`sum(abs(${schema.creditLedger.amount}))`,
        calls: sql<number>`count(*)`,
      })
      .from(schema.creditLedger)
      .where(
        and(
          eq(schema.creditLedger.userId, username),
          sql`${schema.creditLedger.createdAt} >= ${fourteenDaysAgo}`
        )
      )
      .groupBy(sql`substr(${schema.creditLedger.createdAt}, 1, 10)`)
      .orderBy(sql`substr(${schema.creditLedger.createdAt}, 1, 10)`);

    return NextResponse.json({
      creditBalance,
      recentLedger: ledgerRows,
      usageByPeriod,
      modelUsage,
      recentSessions: chatSessionRows,
      chatStats: {
        totalSessions: chatCounts[0]?.sessionCount ?? 0,
        totalMessages,
      },
      recentTrades: tradeRows,
      tradeStats: {
        total: tradeCounts[0]?.total ?? 0,
        filled: tradeCounts[0]?.filled ?? 0,
      },
      supportTickets: tickets,
      accountCreated,
      lastLogin,
      dailyUsage,
    });
  } catch (error) {
    console.error("User stats error:", error);
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
}
