import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { sql, isNotNull } from "drizzle-orm";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Select only needed columns instead of SELECT * on entire predictions table
    const predictions = await db
      .select({
        claim: schema.predictions.claim,
        confidence: schema.predictions.confidence,
        outcome: schema.predictions.outcome,
        score: schema.predictions.score,
        category: schema.predictions.category,
        createdAt: schema.predictions.createdAt,
        createdBy: schema.predictions.createdBy,
        preEvent: schema.predictions.preEvent,
        regimeInvalidated: schema.predictions.regimeInvalidated,
      })
      .from(schema.predictions)
      .where(isNotNull(schema.predictions.createdBy));

    // Group by user
    const userMap = new Map<string, {
      username: string;
      total: number;
      resolved: number;
      confirmed: number;
      denied: number;
      partial: number;
      expired: number;
      brierSum: number;
      brierCount: number;
      confidenceSum: number;
      categories: Record<string, { total: number; correct: number }>;
      recentPredictions: Array<{
        claim: string;
        confidence: number;
        outcome: string | null;
        score: number | null;
        category: string;
        createdAt: string;
      }>;
    }>();

    for (const p of predictions) {
      const user = p.createdBy!;
      if (!userMap.has(user)) {
        userMap.set(user, {
          username: user,
          total: 0,
          resolved: 0,
          confirmed: 0,
          denied: 0,
          partial: 0,
          expired: 0,
          brierSum: 0,
          brierCount: 0,
          confidenceSum: 0,
          categories: {},
          recentPredictions: [],
        });
      }

      const u = userMap.get(user)!;
      u.total++;
      u.confidenceSum += p.confidence;

      if (p.outcome && p.outcome !== "expired" && p.outcome !== "post_event") {
        u.resolved++;
        if (p.outcome === "confirmed") u.confirmed++;
        else if (p.outcome === "denied") u.denied++;
        else if (p.outcome === "partial") u.partial++;

        if (p.preEvent === 1 && !p.regimeInvalidated) {
          const outcomeVal = p.outcome === "confirmed" ? 1 : p.outcome === "denied" ? 0 : 0.5;
          const brier = Math.pow(p.confidence - outcomeVal, 2);
          u.brierSum += brier;
          u.brierCount++;
        }

        const cat = p.category;
        if (!u.categories[cat]) u.categories[cat] = { total: 0, correct: 0 };
        u.categories[cat].total++;
        if (p.outcome === "confirmed") u.categories[cat].correct++;
      } else if (p.outcome === "expired") {
        u.expired++;
      }

      u.recentPredictions.push({
        claim: p.claim,
        confidence: p.confidence,
        outcome: p.outcome,
        score: p.score,
        category: p.category,
        createdAt: p.createdAt,
      });
    }

    const leaderboard = Array.from(userMap.values())
      .map((u) => {
        const brier = u.brierCount >= 5 ? u.brierSum / u.brierCount : null;
        const accuracy = u.resolved > 0 ? u.confirmed / u.resolved : null;
        const avgConfidence = u.total > 0 ? u.confidenceSum / u.total : 0;
        const calibrationGap = accuracy !== null ? Math.abs(avgConfidence - accuracy) : null;
        const rankScore = brier !== null ? 1 - brier : accuracy !== null ? accuracy * 0.5 : 0;

        u.recentPredictions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const recent = u.recentPredictions.slice(0, 5);

        let bestCategory: string | null = null;
        let bestCategoryAccuracy = 0;
        for (const [cat, data] of Object.entries(u.categories)) {
          if (data.total >= 3) {
            const catAcc = data.correct / data.total;
            if (catAcc > bestCategoryAccuracy) {
              bestCategoryAccuracy = catAcc;
              bestCategory = cat;
            }
          }
        }

        return {
          username: u.username,
          total: u.total,
          resolved: u.resolved,
          confirmed: u.confirmed,
          denied: u.denied,
          partial: u.partial,
          expired: u.expired,
          brier,
          accuracy,
          avgConfidence,
          calibrationGap,
          rankScore,
          bestCategory,
          categories: u.categories,
          recentPredictions: recent,
          hasSufficientData: u.brierCount >= 5,
        };
      })
      .sort((a, b) => b.rankScore - a.rankScore);

    const total = leaderboard.length;
    const ranked = leaderboard.map((entry, i) => ({
      ...entry,
      rank: i + 1,
      percentile: total > 1 ? Math.round(((total - i) / total) * 100) : 100,
      badge: getBadge(i, total, entry.hasSufficientData),
    }));

    return NextResponse.json({
      leaderboard: ranked,
      totalAnalysts: total,
      totalPredictions: predictions.length,
    }, {
      headers: { "Cache-Control": "private, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[Leaderboard] Error:", err);
    return NextResponse.json({ leaderboard: [], totalAnalysts: 0, totalPredictions: 0 });
  }
}

function getBadge(rank: number, total: number, sufficientData: boolean): string | null {
  if (!sufficientData) return null;
  if (total < 3) return null;
  const percentile = ((total - rank) / total) * 100;
  if (percentile >= 95) return "superforecaster";
  if (percentile >= 80) return "senior-analyst";
  if (percentile >= 50) return "analyst";
  return null;
}
