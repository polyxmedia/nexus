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

    // ── Neon DB metrics (introspection, no API key needed) ──
    const [tableSizes, dbSize, connectionCount] = await Promise.all([
      // Per-table size and row estimates
      db.execute(sql`
        SELECT
          relname as table_name,
          pg_total_relation_size(quote_ident(relname))::bigint as total_bytes,
          pg_relation_size(quote_ident(relname))::bigint as data_bytes,
          (pg_total_relation_size(quote_ident(relname)) - pg_relation_size(quote_ident(relname)))::bigint as index_bytes,
          n_live_tup::bigint as row_estimate
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(quote_ident(relname)) DESC
        LIMIT 20
      `).catch(() => ({ rows: [] })),

      // Total database size
      db.execute(sql`
        SELECT pg_database_size(current_database())::bigint as total_bytes
      `).catch(() => ({ rows: [{ total_bytes: 0 }] })),

      // Active connections
      db.execute(sql`
        SELECT count(*)::int as connections FROM pg_stat_activity WHERE datname = current_database()
      `).catch(() => ({ rows: [{ connections: 0 }] })),
    ]);

    const dbSizeBytes = Number((dbSize.rows[0] as Record<string, unknown>)?.total_bytes || 0);
    const dbSizeGB = dbSizeBytes / (1024 * 1024 * 1024);

    // Neon pricing (post-Databricks acquisition, 2026)
    const NEON_STORAGE_PER_GB = 0.35; // $/GB-month
    const NEON_HISTORY_PER_GB = 0.20; // $/GB-month (PITR)
    const NEON_COMPUTE_PER_CU_HOUR = 0.106; // $/CU-hour (Launch tier)
    const NEON_MIN_MONTHLY = 5.00; // $5 minimum
    const estimatedComputeHours = 730; // ~24/7 for always-on, adjust if autosuspend
    const computeCUs = 0.25; // Default CU size, adjust per plan

    const storageCost = dbSizeGB * NEON_STORAGE_PER_GB;
    const historyCost = dbSizeGB * 0.5 * NEON_HISTORY_PER_GB; // estimate history at 50% of data
    const computeCost = estimatedComputeHours * computeCUs * NEON_COMPUTE_PER_CU_HOUR;
    const totalNeonEstimate = Math.max(NEON_MIN_MONTHLY, storageCost + historyCost + computeCost);

    const neon = {
      database: {
        sizeBytes: dbSizeBytes,
        sizeGB: Math.round(dbSizeGB * 1000) / 1000,
        sizeMB: Math.round(dbSizeBytes / (1024 * 1024) * 10) / 10,
      },
      tables: (tableSizes.rows as Array<Record<string, unknown>>).map((t) => ({
        name: t.table_name as string,
        totalMB: Math.round(Number(t.total_bytes) / (1024 * 1024) * 100) / 100,
        dataMB: Math.round(Number(t.data_bytes) / (1024 * 1024) * 100) / 100,
        indexMB: Math.round(Number(t.index_bytes) / (1024 * 1024) * 100) / 100,
        rows: Number(t.row_estimate),
      })),
      connections: Number((connectionCount.rows[0] as Record<string, unknown>)?.connections || 0),
      estimatedMonthlyCost: {
        storage: Math.round(storageCost * 100) / 100,
        history: Math.round(historyCost * 100) / 100,
        compute: Math.round(computeCost * 100) / 100,
        total: Math.round(totalNeonEstimate * 100) / 100,
        minimum: NEON_MIN_MONTHLY,
      },
      pricing: {
        storagePerGB: NEON_STORAGE_PER_GB,
        historyPerGB: NEON_HISTORY_PER_GB,
        computePerCUHour: NEON_COMPUTE_PER_CU_HOUR,
        computeCUs,
        computeHoursPerMonth: estimatedComputeHours,
      },
    };

    // ── Voyage AI usage (from tracked settings) ──
    const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const voyageRows = await db.select().from(schema.settings)
      .where(eq(schema.settings.key, `voyage_usage:${currentPeriod}`))
      .catch(() => []);
    const voyageData = voyageRows.length > 0 ? JSON.parse(voyageRows[0].value) : { tokens: 0, calls: 0, texts: 0 };
    const VOYAGE_PRICE_PER_MTOK = 0.06; // $0.06 per million tokens for voyage-3
    const voyageCost = (voyageData.tokens / 1_000_000) * VOYAGE_PRICE_PER_MTOK;

    // Get knowledge count for context
    const knowledgeCount = await db.execute(sql`SELECT count(*)::int as total, count(*) FILTER (WHERE embedding IS NOT NULL)::int as embedded FROM knowledge`)
      .then((r) => (r.rows[0] || { total: 0, embedded: 0 }) as { total: number; embedded: number })
      .catch(() => ({ total: 0, embedded: 0 }));

    const voyage = {
      period: currentPeriod,
      tokens: voyageData.tokens || 0,
      calls: voyageData.calls || 0,
      texts: voyageData.texts || 0,
      estimatedCost: Math.round(voyageCost * 1000) / 1000,
      pricePerMTok: VOYAGE_PRICE_PER_MTOK,
      knowledgeEntries: knowledgeCount.total,
      embeddedEntries: knowledgeCount.embedded,
    };

    // ── Vercel estimated costs (from inference, no API needed) ──
    // Count recent function invocations from chat + API activity
    const [chatMessageCount, apiActivityEstimate] = await Promise.all([
      db.execute(sql`
        SELECT count(*)::int as total,
          count(*) FILTER (WHERE created_at >= ${monthAgo})::int as month
        FROM chat_messages WHERE role = 'user'
      `).then((r) => (r.rows[0] || { total: 0, month: 0 }) as { total: number; month: number }).catch(() => ({ total: 0, month: 0 })),
      db.execute(sql`
        SELECT count(*)::int as month FROM analytics_events WHERE created_at >= ${monthAgo}
      `).then((r) => (r.rows[0] || { month: 0 }) as { month: number }).catch(() => ({ month: 0 })),
    ]);

    // Estimate: each chat message = ~2 function invocations (POST + streaming), each page view = 1-3
    const estimatedInvocations = (chatMessageCount.month * 2) + (apiActivityEstimate.month * 2);
    // Pro plan: 1M invocations included, $0.60 per additional 1M
    const VERCEL_INCLUDED_INVOCATIONS = 1_000_000;
    const VERCEL_OVERAGE_PER_M = 0.60;
    const VERCEL_PRO_BASE = 20; // $20/mo Pro plan
    const VERCEL_BANDWIDTH_INCLUDED_GB = 1000; // 1TB included
    const invocationOverage = Math.max(0, estimatedInvocations - VERCEL_INCLUDED_INVOCATIONS);
    const invocationCost = (invocationOverage / 1_000_000) * VERCEL_OVERAGE_PER_M;

    // Estimate bandwidth: ~50KB per page load, ~5KB per API call
    const estimatedBandwidthGB = ((apiActivityEstimate.month * 0.05) + (chatMessageCount.month * 0.005)) / 1024;
    const bandwidthOverage = Math.max(0, estimatedBandwidthGB - VERCEL_BANDWIDTH_INCLUDED_GB);
    const bandwidthCost = bandwidthOverage * 0.15; // $0.15/GB overage

    const vercel = {
      plan: "Pro",
      baseCost: VERCEL_PRO_BASE,
      estimatedInvocations,
      invocationOverageCost: Math.round(invocationCost * 100) / 100,
      estimatedBandwidthGB: Math.round(estimatedBandwidthGB * 100) / 100,
      bandwidthOverageCost: Math.round(bandwidthCost * 100) / 100,
      estimatedTotal: Math.round((VERCEL_PRO_BASE + invocationCost + bandwidthCost) * 100) / 100,
      chatMessages: chatMessageCount.month,
      analyticsEvents: apiActivityEstimate.month,
    };

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
      neon,
      voyage,
      vercel,
    }, { headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
