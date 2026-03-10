import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { eq, and, sql, isNotNull } from "drizzle-orm";

// GET: Analyst profile data
export async function GET(req: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  try {
    // Get user predictions
    const predictions = await db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.createdBy, username));

    if (predictions.length === 0) {
      return NextResponse.json({
        username,
        exists: true,
        stats: null,
        message: "No predictions yet",
      });
    }

    // Compute stats
    const resolved = predictions.filter((p) => p.outcome && p.outcome !== "expired" && p.outcome !== "post_event");
    const confirmed = resolved.filter((p) => p.outcome === "confirmed");
    const denied = resolved.filter((p) => p.outcome === "denied");
    const partial = resolved.filter((p) => p.outcome === "partial");

    // Brier score
    const brierEligible = resolved.filter((p) => p.preEvent === 1 && !p.regimeInvalidated);
    let brier: number | null = null;
    if (brierEligible.length >= 5) {
      const brierSum = brierEligible.reduce((sum, p) => {
        const outcomeVal = p.outcome === "confirmed" ? 1 : p.outcome === "denied" ? 0 : 0.5;
        return sum + Math.pow(p.confidence - outcomeVal, 2);
      }, 0);
      brier = brierSum / brierEligible.length;
    }

    // Calibration buckets
    const buckets = [
      { min: 0, max: 0.35, label: "0-35%" },
      { min: 0.35, max: 0.5, label: "35-50%" },
      { min: 0.5, max: 0.65, label: "50-65%" },
      { min: 0.65, max: 0.8, label: "65-80%" },
      { min: 0.8, max: 1.01, label: "80-100%" },
    ];

    const calibration = buckets.map((bucket) => {
      const inBucket = resolved.filter((p) => p.confidence >= bucket.min && p.confidence < bucket.max);
      const confirmedInBucket = inBucket.filter((p) => p.outcome === "confirmed").length;
      return {
        label: bucket.label,
        midpoint: (bucket.min + bucket.max) / 2,
        count: inBucket.length,
        actualRate: inBucket.length > 0 ? confirmedInBucket / inBucket.length : null,
      };
    });

    // Category breakdown
    const categories: Record<string, { total: number; correct: number; brier: number | null }> = {};
    for (const p of resolved) {
      if (!categories[p.category]) categories[p.category] = { total: 0, correct: 0, brier: null };
      categories[p.category].total++;
      if (p.outcome === "confirmed") categories[p.category].correct++;
    }

    // Monthly activity
    const monthlyActivity: Record<string, number> = {};
    for (const p of predictions) {
      const month = p.createdAt.slice(0, 7);
      monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
    }

    // Follower/following counts
    const [followerCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.analystFollows)
      .where(eq(schema.analystFollows.followingId, username));

    const [followingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.analystFollows)
      .where(eq(schema.analystFollows.followerId, username));

    // Check if current user follows this analyst
    let isFollowing = false;
    if (session.user.name !== username) {
      const followRow = await db
        .select()
        .from(schema.analystFollows)
        .where(
          and(
            eq(schema.analystFollows.followerId, session.user.name),
            eq(schema.analystFollows.followingId, username)
          )
        );
      isFollowing = followRow.length > 0;
    }

    const accuracy = resolved.length > 0 ? confirmed.length / resolved.length : null;
    const avgConfidence = predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length;

    // Look up profile image
    let profileImage: string | null = null;
    try {
      const userRows = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, `user:${username}`));
      if (userRows[0]) {
        const userData = JSON.parse(userRows[0].value);
        profileImage = userData.profileImage || null;
      }
    } catch {}

    return NextResponse.json({
      username,
      exists: true,
      profileImage,
      stats: {
        total: predictions.length,
        resolved: resolved.length,
        confirmed: confirmed.length,
        denied: denied.length,
        partial: partial.length,
        expired: predictions.filter((p) => p.outcome === "expired").length,
        brier,
        accuracy,
        avgConfidence,
        calibrationGap: accuracy !== null ? Math.abs(avgConfidence - accuracy) : null,
        calibration,
        categories,
        monthlyActivity,
        followers: Number(followerCount?.count || 0),
        following: Number(followingCount?.count || 0),
        isFollowing,
        recentPredictions: predictions
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 20)
          .map((p) => ({
            uuid: p.uuid,
            claim: p.claim,
            confidence: p.confidence,
            outcome: p.outcome,
            score: p.score,
            category: p.category,
            direction: p.direction,
            createdAt: p.createdAt,
            deadline: p.deadline,
          })),
      },
    });
  } catch (err) {
    console.error("[Analyst Profile] Error:", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

// POST: Follow/unfollow an analyst
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { username, action } = body;

    if (!username || !["follow", "unfollow"].includes(action)) {
      return NextResponse.json({ error: "username and action (follow/unfollow) required" }, { status: 400 });
    }

    if (username === session.user.name) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    if (action === "follow") {
      await db.insert(schema.analystFollows).values({
        followerId: session.user.name,
        followingId: username,
      }).onConflictDoNothing();
    } else {
      await db.delete(schema.analystFollows).where(
        and(
          eq(schema.analystFollows.followerId, session.user.name),
          eq(schema.analystFollows.followingId, username)
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Analyst Follow] Error:", err);
    return NextResponse.json({ error: "Failed to update follow" }, { status: 500 });
  }
}
