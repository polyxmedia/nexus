import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like, desc, inArray } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = session.user.name;

    // Rate limit: 3 exports per hour
    const rl = await rateLimit(`account:export:${username}`, 3, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many export requests. Try again later." },
        { status: 429 },
      );
    }

    // Gather user data
    const [userSettings, userScopedSettings, chatSessions, predictions, trades, subscriptions] =
      await Promise.all([
        db.select().from(schema.settings).where(eq(schema.settings.key, `user:${username}`)),
        db.select().from(schema.settings).where(like(schema.settings.key, `${username}:%`)),
        db.select().from(schema.chatSessions).where(eq(schema.chatSessions.userId, username)).orderBy(desc(schema.chatSessions.createdAt)),
        db.select().from(schema.predictions).where(eq(schema.predictions.createdBy, username)).orderBy(desc(schema.predictions.createdAt)),
        db.select().from(schema.trades).where(eq(schema.trades.userId, username)).orderBy(desc(schema.trades.createdAt)),
        db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, username)),
      ]);

    // Get chat messages in a single query instead of N+1
    const limitedSessions = chatSessions.slice(0, 100);
    const sessionIds = limitedSessions.map((s) => s.id);
    const allMessages = sessionIds.length > 0
      ? await db
          .select()
          .from(schema.chatMessages)
          .where(inArray(schema.chatMessages.sessionId, sessionIds))
          .orderBy(schema.chatMessages.createdAt)
      : [];

    const messagesBySession = new Map<number, { role: string; content: string; createdAt: string }[]>();
    for (const m of allMessages) {
      const list = messagesBySession.get(m.sessionId) || [];
      list.push({ role: m.role, content: m.content, createdAt: m.createdAt });
      messagesBySession.set(m.sessionId, list);
    }

    const chatData = limitedSessions.map((sess) => ({
      session: { id: sess.id, title: sess.title, createdAt: sess.createdAt },
      messages: messagesBySession.get(sess.id) || [],
    }));

    // Strip sensitive fields from user profile
    let profile: Record<string, unknown> = {};
    if (userSettings.length > 0) {
      try {
        const parsed = JSON.parse(userSettings[0].value);
        delete parsed.password;
        profile = parsed;
      } catch {
        profile = {};
      }
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      username,
      profile,
      settings: userScopedSettings.map((s) => ({
        key: s.key.replace(`${username}:`, ""),
        updatedAt: s.updatedAt,
      })),
      subscription: subscriptions[0] || null,
      predictions: predictions.map((p) => ({
        claim: p.claim,
        category: p.category,
        confidence: p.confidence,
        direction: p.direction,
        outcome: p.outcome,
        score: p.score,
        deadline: p.deadline,
        createdAt: p.createdAt,
        resolvedAt: p.resolvedAt,
      })),
      trades: trades.map((t) => ({
        ticker: t.ticker,
        direction: t.direction,
        quantity: t.quantity,
        filledPrice: t.filledPrice,
        environment: t.environment,
        status: t.status,
        createdAt: t.createdAt,
      })),
      chatSessions: chatData,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nexus-export-${username}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
