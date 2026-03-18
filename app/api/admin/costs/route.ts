import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, sql, gte } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userRows = await db.select().from(schema.settings).where(eq(schema.settings.key, `user:${session.user.name}`));
  const userData = userRows[0] ? JSON.parse(userRows[0].value) : {};
  if (userData.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const now = new Date();
    const todayStart = now.toISOString().split("T")[0] + "T00:00:00";
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    // Parallel queries for cost data
    const [creditStats, dailyCredits, chatStats, predictionStats] = await Promise.all([
      // Total credit usage
      db.execute(sql`
        SELECT
          COALESCE(SUM(amount), 0)::int as total_credits_used,
          COALESCE(SUM(amount) FILTER (WHERE created_at >= ${todayStart}), 0)::int as today_credits,
          COALESCE(SUM(amount) FILTER (WHERE created_at >= ${weekAgo}), 0)::int as week_credits,
          COALESCE(SUM(amount) FILTER (WHERE created_at >= ${monthAgo}), 0)::int as month_credits,
          COUNT(*)::int as total_transactions
        FROM credit_ledger
        WHERE amount < 0
      `).catch(() => ({ rows: [{ total_credits_used: 0, today_credits: 0, week_credits: 0, month_credits: 0, total_transactions: 0 }] })),

      // Daily credit usage for the last 7 days
      db.execute(sql`
        SELECT
          DATE(created_at) as date,
          COALESCE(SUM(ABS(amount)), 0)::int as credits_used,
          COUNT(*)::int as transactions
        FROM credit_ledger
        WHERE amount < 0 AND created_at >= ${weekAgo}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `).catch(() => ({ rows: [] })),

      // Chat usage stats
      db.execute(sql`
        SELECT
          COUNT(*)::int as total_sessions,
          COUNT(*) FILTER (WHERE created_at >= ${todayStart})::int as today_sessions,
          COUNT(*) FILTER (WHERE created_at >= ${weekAgo})::int as week_sessions
        FROM chat_sessions
      `).catch(() => ({ rows: [{ total_sessions: 0, today_sessions: 0, week_sessions: 0 }] })),

      // Prediction generation stats (AI cost driver)
      db.execute(sql`
        SELECT
          COUNT(*)::int as total_predictions,
          COUNT(*) FILTER (WHERE created_at >= ${todayStart})::int as today_predictions,
          COUNT(*) FILTER (WHERE created_at >= ${weekAgo})::int as week_predictions
        FROM predictions
      `).catch(() => ({ rows: [{ total_predictions: 0, today_predictions: 0, week_predictions: 0 }] })),
    ]);

    const credits = (creditStats.rows[0] || {}) as Record<string, number>;
    const chat = (chatStats.rows[0] || {}) as Record<string, number>;
    const predictions = (predictionStats.rows[0] || {}) as Record<string, number>;

    // Estimate costs (rough: 1 credit = $0.001, adjust as needed)
    const creditCostRate = 0.001;
    const monthCredits = Math.abs(credits.month_credits || 0);
    const weekCredits = Math.abs(credits.week_credits || 0);
    const todayCredits = Math.abs(credits.today_credits || 0);

    // Load thresholds from settings
    const thresholdRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "admin:cost_thresholds")).catch(() => []);
    const thresholds = thresholdRows.length > 0 ? JSON.parse(thresholdRows[0].value) : {
      dailyCreditWarning: 5000,
      dailyCreditCritical: 15000,
      weeklyCreditWarning: 25000,
      weeklyCreditCritical: 75000,
      monthlyCreditWarning: 80000,
      monthlyCreditCritical: 200000,
    };

    // Check alerts
    const alerts: Array<{ level: "warning" | "critical"; message: string; metric: string; value: number; threshold: number }> = [];

    if (todayCredits >= thresholds.dailyCreditCritical) {
      alerts.push({ level: "critical", message: `Daily credit usage at ${todayCredits} (limit: ${thresholds.dailyCreditCritical})`, metric: "daily_credits", value: todayCredits, threshold: thresholds.dailyCreditCritical });
    } else if (todayCredits >= thresholds.dailyCreditWarning) {
      alerts.push({ level: "warning", message: `Daily credit usage elevated at ${todayCredits} (warning: ${thresholds.dailyCreditWarning})`, metric: "daily_credits", value: todayCredits, threshold: thresholds.dailyCreditWarning });
    }

    if (weekCredits >= thresholds.weeklyCreditCritical) {
      alerts.push({ level: "critical", message: `Weekly credit usage at ${weekCredits} (limit: ${thresholds.weeklyCreditCritical})`, metric: "weekly_credits", value: weekCredits, threshold: thresholds.weeklyCreditCritical });
    } else if (weekCredits >= thresholds.weeklyCreditWarning) {
      alerts.push({ level: "warning", message: `Weekly credit usage elevated at ${weekCredits} (warning: ${thresholds.weeklyCreditWarning})`, metric: "weekly_credits", value: weekCredits, threshold: thresholds.weeklyCreditWarning });
    }

    if (monthCredits >= thresholds.monthlyCreditCritical) {
      alerts.push({ level: "critical", message: `Monthly credit usage at ${monthCredits} (limit: ${thresholds.monthlyCreditCritical})`, metric: "monthly_credits", value: monthCredits, threshold: thresholds.monthlyCreditCritical });
    } else if (monthCredits >= thresholds.monthlyCreditWarning) {
      alerts.push({ level: "warning", message: `Monthly credit usage elevated at ${monthCredits} (warning: ${thresholds.monthlyCreditWarning})`, metric: "monthly_credits", value: monthCredits, threshold: thresholds.monthlyCreditWarning });
    }

    return NextResponse.json({
      credits: {
        today: todayCredits,
        week: weekCredits,
        month: monthCredits,
        total: Math.abs(credits.total_credits_used || 0),
        transactions: credits.total_transactions || 0,
      },
      estimatedCosts: {
        today: Math.round(todayCredits * creditCostRate * 100) / 100,
        week: Math.round(weekCredits * creditCostRate * 100) / 100,
        month: Math.round(monthCredits * creditCostRate * 100) / 100,
      },
      dailyBreakdown: (dailyCredits.rows || []).map((r: Record<string, unknown>) => ({
        date: r.date,
        credits: Math.abs(r.credits_used as number),
        transactions: r.transactions as number,
        cost: Math.round(Math.abs(r.credits_used as number) * creditCostRate * 100) / 100,
      })),
      usage: {
        chatSessions: { total: chat.total_sessions || 0, today: chat.today_sessions || 0, week: chat.week_sessions || 0 },
        predictions: { total: predictions.total_predictions || 0, today: predictions.today_predictions || 0, week: predictions.week_predictions || 0 },
      },
      thresholds,
      alerts,
      hasAlerts: alerts.length > 0,
      highestAlertLevel: alerts.some(a => a.level === "critical") ? "critical" : alerts.length > 0 ? "warning" : "ok",
    }, { headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
