import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin
  const userRows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));
  const userData = userRows[0] ? JSON.parse(userRows[0].value) : {};
  if (userData.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    // Fetch all users
    const allSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, schema.settings.key)); // get all

    const userSettings = (
      await db.select().from(schema.settings)
    ).filter((s) => s.key.startsWith("user:"));

    const users = userSettings.map((s) => {
      const data = JSON.parse(s.value);
      return {
        username: s.key.replace("user:", ""),
        role: data.role || "user",
        tier: data.tier || "free",
        createdAt: data.createdAt || s.key, // fallback
      };
    });

    // Fetch all subscriptions
    const subscriptions = await db
      .select()
      .from(schema.subscriptions)
      .orderBy(desc(schema.subscriptions.id));

    // Fetch tiers for price lookup
    const tiers = await db.select().from(schema.subscriptionTiers);
    const tierMap: Record<number, { name: string; price: number }> = {};
    for (const t of tiers) {
      tierMap[t.id] = { name: t.name, price: t.price };
    }

    // Fetch referral data
    const referrals = await db.select().from(schema.referrals);
    const commissions = await db.select().from(schema.commissions);

    // Fetch chat sessions for engagement
    const chatSessions = await db.select().from(schema.chatSessions);

    // Fetch predictions for system stats
    const predictions = await db.select().from(schema.predictions);

    // ── Compute Metrics ──

    const totalUsers = users.length;
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active"
    );
    const cancelledSubscriptions = subscriptions.filter(
      (s) => s.status === "canceled"
    );
    const pastDueSubscriptions = subscriptions.filter(
      (s) => s.status === "past_due"
    );

    // MRR calculation
    let mrr = 0;
    const subscribersByTier: Record<string, number> = {};
    const revenueByTier: Record<string, number> = {};
    for (const sub of activeSubscriptions) {
      const tier = tierMap[sub.tierId];
      if (tier) {
        mrr += tier.price;
        const tierName = tier.name.toLowerCase();
        subscribersByTier[tierName] = (subscribersByTier[tierName] || 0) + 1;
        revenueByTier[tierName] =
          (revenueByTier[tierName] || 0) + tier.price;
      }
    }

    const arr = mrr * 12;

    // Churn rate (cancelled / total ever subscribed)
    const totalEverSubscribed =
      activeSubscriptions.length + cancelledSubscriptions.length;
    const churnRate =
      totalEverSubscribed > 0
        ? (cancelledSubscriptions.length / totalEverSubscribed) * 100
        : 0;

    // Conversion rate (subscribed / total users)
    const conversionRate =
      totalUsers > 0
        ? (activeSubscriptions.length / totalUsers) * 100
        : 0;

    // User growth over time (by createdAt date)
    const userGrowth: Record<string, number> = {};
    for (const u of users) {
      const date = u.createdAt
        ? u.createdAt.split("T")[0]
        : new Date().toISOString().split("T")[0];
      userGrowth[date] = (userGrowth[date] || 0) + 1;
    }

    // Build cumulative growth
    const sortedDates = Object.keys(userGrowth).sort();
    let cumulative = 0;
    const growthTimeline = sortedDates.map((date) => {
      cumulative += userGrowth[date];
      return { date, newUsers: userGrowth[date], totalUsers: cumulative };
    });

    // Subscription growth over time
    const subGrowth: Record<string, number> = {};
    for (const sub of subscriptions) {
      const date = sub.createdAt
        ? sub.createdAt.split("T")[0]
        : new Date().toISOString().split("T")[0];
      if (sub.status === "active") {
        subGrowth[date] = (subGrowth[date] || 0) + 1;
      }
    }

    const sortedSubDates = Object.keys(subGrowth).sort();
    let subCumulative = 0;
    const subscriptionTimeline = sortedSubDates.map((date) => {
      subCumulative += subGrowth[date];
      return {
        date,
        newSubscribers: subGrowth[date],
        totalSubscribers: subCumulative,
      };
    });

    // Referral stats
    const totalReferrals = referrals.length;
    const convertedReferrals = referrals.filter(
      (r) => r.status === "subscribed"
    ).length;
    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
    const pendingCommissions = commissions
      .filter((c) => c.status === "pending" || c.status === "approved")
      .reduce((sum, c) => sum + c.amount, 0);
    const paidCommissions = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.amount, 0);

    // Engagement stats
    const totalChatSessions = chatSessions.length;
    const totalPredictions = predictions.length;
    const resolvedPredictions = predictions.filter((p) => p.outcome).length;
    const confirmedPredictions = predictions.filter(
      (p) => p.outcome === "confirmed"
    ).length;
    const predictionAccuracy =
      resolvedPredictions > 0
        ? (confirmedPredictions / resolvedPredictions) * 100
        : 0;

    // Tier breakdown
    const tierBreakdown = tiers.map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      subscribers: subscribersByTier[t.name.toLowerCase()] || 0,
      revenue: revenueByTier[t.name.toLowerCase()] || 0,
    }));

    // Recent activity
    const recentSubscriptions = subscriptions.slice(0, 10).map((s) => ({
      userId: s.userId,
      tier: tierMap[s.tierId]?.name || "Unknown",
      status: s.status,
      createdAt: s.createdAt,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd === 1,
    }));

    return NextResponse.json({
      overview: {
        totalUsers,
        activeSubscribers: activeSubscriptions.length,
        cancelledSubscribers: cancelledSubscriptions.length,
        pastDueSubscribers: pastDueSubscriptions.length,
        mrr,
        arr,
        churnRate: Math.round(churnRate * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
      tierBreakdown,
      growthTimeline,
      subscriptionTimeline,
      referrals: {
        total: totalReferrals,
        converted: convertedReferrals,
        conversionRate:
          totalReferrals > 0
            ? Math.round((convertedReferrals / totalReferrals) * 1000) / 10
            : 0,
        totalCommissions: totalCommissions / 100, // cents to dollars
        pendingCommissions: pendingCommissions / 100,
        paidCommissions: paidCommissions / 100,
      },
      engagement: {
        totalChatSessions,
        totalPredictions,
        resolvedPredictions,
        predictionAccuracy: Math.round(predictionAccuracy * 10) / 10,
      },
      recentSubscriptions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
