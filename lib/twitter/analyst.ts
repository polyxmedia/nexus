/**
 * Twitter Analyst Worker
 *
 * Generates and posts analyst-grade market commentary using NEXUS intelligence.
 * Pulls live regime data, prediction track record, and signal state,
 * then uses Claude to produce sharp, opinionated tweets that read like
 * a senior analyst, not a bot.
 *
 * Runs every 4 hours via scheduler.
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { postTweet, isTwitterConfigured, logTweet } from "./client";
import { FOUNDER_HANDLE } from "./predictions";
import { detectCurrentRegime, getLatestShifts } from "@/lib/regime/detection";
import type { RegimeState, RegimeShift } from "@/lib/regime/detection";

const ANALYST_TWEET_PROMPT = `You tweet from NEXUS Intelligence Platform (@nexaboratorio on X). Sharp, data-backed market and geopolitical commentary. Founded by ${FOUNDER_HANDLE}.

VOICE RULES (non-negotiable):
- Write like speech. Chain thoughts with commas, not choppy fragments
- Comma splices fine. Contractions always. Ellipsis (...) for pauses
- No emojis ever. No em dashes ever (use commas). No ALL CAPS for emphasis
- No exclamation marks. No "Let's dive in", "Here's the thing", "At the end of the day"
- No formulaic antithesis ("It's not about X, it's about Y")
- No hollow hype. No "game-changer", "huge", "incredible"
- Direct, no hedging. State views clearly with specific numbers
- Reference specific data: VIX levels, yield spreads, confidence %, hit rates
- Mix market structure takes with geopolitical risk where they intersect
- When mentioning ${FOUNDER_HANDLE}, do it naturally, not forced
- Under 270 characters
- Opinionated but intellectually honest. If the data is ambiguous, say so
- Use "tho" instead of "though" in casual spots

TWEET TYPES (pick ONE based on the data):
- Market take: regime shift, correlation break, structural observation
- Signal alert: notable convergence across layers
- Track record: cite prediction accuracy, recent hits/misses
- Regime commentary: what the current regime means for positioning
- Geopolitical edge: connect a geopolitical development to market impact

RESPONSE FORMAT:
{ "tweet": "your tweet text here" }

One sharp take only. If the data is boring, return:
{ "tweet": null }

Better to say nothing than post something generic.`;

interface AnalystContext {
  regime: RegimeState;
  shifts: RegimeShift[];
  predictionStats: {
    totalResolved: number;
    accuracy: number;
    avgScore: number;
    streak: number;
    recentHits: string[];
    recentMisses: string[];
  };
  pendingPredictions: number;
  topSignals: { claim: string; confidence: number; category: string; direction: string | null }[];
}

async function gatherContext(): Promise<AnalystContext> {
  // Fetch regime + shifts in parallel
  let regime: RegimeState;
  let shifts: RegimeShift[];
  try {
    [regime, shifts] = await Promise.all([
      detectCurrentRegime(),
      getLatestShifts(),
    ]);
  } catch {
    // If regime detection fails (missing FRED data etc), use minimal fallback
    regime = { composite: "unknown", compositeScore: 0 } as RegimeState;
    shifts = [];
  }

  // Fetch prediction stats
  const allPredictions = await db.select().from(schema.predictions).orderBy(desc(schema.predictions.id)).limit(500);
  const resolved = allPredictions.filter((p) => p.outcome);
  const confirmed = resolved.filter((p) => p.outcome === "confirmed");
  const denied = resolved.filter((p) => p.outcome === "denied");
  const totalResolved = resolved.length;
  const accuracy = totalResolved > 0 ? confirmed.length / totalResolved : 0;
  const avgScore = totalResolved > 0
    ? resolved.reduce((sum, p) => sum + (p.score || 0), 0) / totalResolved
    : 0;

  // Streak
  let streak = 0;
  const sortedResolved = [...resolved].sort((a, b) => (b.resolvedAt || "").localeCompare(a.resolvedAt || ""));
  for (const p of sortedResolved) {
    if (p.outcome === "confirmed") streak++;
    else break;
  }

  // Recent results (last 5 of each)
  const recentHits = confirmed
    .sort((a, b) => (b.resolvedAt || "").localeCompare(a.resolvedAt || ""))
    .slice(0, 5)
    .map((p) => `${p.claim.slice(0, 80)} (${(p.confidence * 100).toFixed(0)}%)`);

  const recentMisses = denied
    .sort((a, b) => (b.resolvedAt || "").localeCompare(a.resolvedAt || ""))
    .slice(0, 3)
    .map((p) => `${p.claim.slice(0, 80)} (${(p.confidence * 100).toFixed(0)}%)`);

  // Top pending predictions by confidence
  const pending = allPredictions.filter((p) => !p.outcome);
  const topSignals = pending
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map((p) => ({
      claim: p.claim,
      confidence: p.confidence,
      category: p.category,
      direction: p.direction,
    }));

  return {
    regime,
    shifts,
    predictionStats: {
      totalResolved,
      accuracy,
      avgScore,
      streak,
      recentHits,
      recentMisses,
    },
    pendingPredictions: pending.length,
    topSignals,
  };
}

function buildPrompt(ctx: AnalystContext): string {
  const lines: string[] = ["Current NEXUS intelligence state:\n"];

  // Regime
  lines.push(`REGIME: ${ctx.regime.composite} (score: ${ctx.regime.compositeScore?.toFixed(2) || "N/A"})`);
  if (ctx.regime.volatility?.vix != null) {
    lines.push(`VIX: ${ctx.regime.volatility.vix.toFixed(1)} (${ctx.regime.volatility.percentile || "unknown"} percentile)`);
  }
  if (ctx.regime.monetary?.fedFunds != null) {
    lines.push(`Fed Funds: ${ctx.regime.monetary.fedFunds.toFixed(2)}% (${ctx.regime.monetary.direction || "stable"})`);
  }
  if (ctx.regime.dollar?.dxy != null) {
    lines.push(`DXY: ${ctx.regime.dollar.dxy.toFixed(1)} (${ctx.regime.dollar.trend || "flat"})`);
  }
  if (ctx.regime.commodity?.oil != null) {
    lines.push(`Oil: $${ctx.regime.commodity.oil.toFixed(1)}`);
  }
  if (ctx.regime.commodity?.gold != null) {
    lines.push(`Gold: $${ctx.regime.commodity.gold.toFixed(0)}`);
  }

  // Shifts
  if (ctx.shifts.length > 0) {
    lines.push(`\nRECENT REGIME SHIFTS:`);
    for (const s of ctx.shifts.slice(0, 3)) {
      lines.push(`- ${s.dimension}: ${s.from} -> ${s.to} (${s.interpretation})`);
    }
  }

  // Track record
  lines.push(`\nPREDICTION TRACK RECORD:`);
  lines.push(`Total resolved: ${ctx.predictionStats.totalResolved}`);
  lines.push(`Accuracy: ${(ctx.predictionStats.accuracy * 100).toFixed(1)}%`);
  lines.push(`Avg Brier score: ${ctx.predictionStats.avgScore.toFixed(3)}`);
  lines.push(`Current streak: ${ctx.predictionStats.streak} consecutive hits`);

  if (ctx.predictionStats.recentHits.length > 0) {
    lines.push(`\nRecent HITS:`);
    for (const h of ctx.predictionStats.recentHits.slice(0, 3)) {
      lines.push(`- ${h}`);
    }
  }
  if (ctx.predictionStats.recentMisses.length > 0) {
    lines.push(`\nRecent MISSES:`);
    for (const m of ctx.predictionStats.recentMisses) {
      lines.push(`- ${m}`);
    }
  }

  // Active signals
  if (ctx.topSignals.length > 0) {
    lines.push(`\nTOP ACTIVE PREDICTIONS (${ctx.pendingPredictions} total pending):`);
    for (const s of ctx.topSignals) {
      const dir = s.direction ? ` [${s.direction}]` : "";
      lines.push(`- ${s.claim.slice(0, 100)} | ${(s.confidence * 100).toFixed(0)}% confidence${dir} | ${s.category}`);
    }
  }

  lines.push(`\nToday: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`Generate a single tweet based on whichever aspect of this data is most interesting right now.`);

  return lines.join("\n");
}

/**
 * Generate and post one analyst tweet.
 * Returns the tweet text if posted, null if skipped.
 */
export async function runAnalystTweet(): Promise<string | null> {
  if (!(await isTwitterConfigured())) {
    console.log("[twitter-analyst] Twitter not configured, skipping");
    return null;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[twitter-analyst] No ANTHROPIC_API_KEY");
    return null;
  }

  const ctx = await gatherContext();

  // Don't tweet if we have no track record yet
  if (ctx.predictionStats.totalResolved < 5 && ctx.topSignals.length === 0) {
    console.log("[twitter-analyst] Not enough data to tweet about");
    return null;
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(ctx);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: ANALYST_TWEET_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[twitter-analyst] Failed to parse Claude response");
    return null;
  }

  let result: { tweet: string | null };
  try {
    result = JSON.parse(jsonMatch[0]);
  } catch {
    console.error("[twitter-analyst] Failed to parse JSON from Claude response");
    return null;
  }
  if (!result.tweet) {
    console.log("[twitter-analyst] Claude decided nothing worth tweeting");
    return null;
  }

  let tweet: string = result.tweet;

  // Add #NEXUS tag if not present
  if (!tweet.includes("#NEXUS")) {
    tweet = tweet.length + 7 <= 280 ? `${tweet} #NEXUS` : tweet;
  }

  const posted = await postTweet(tweet);
  if (posted) {
    console.log(`[twitter-analyst] Posted tweet: ${posted.id}`);
    await logTweet({
      tweetId: posted.id,
      tweetType: "analyst",
      content: tweet,
    });
    return tweet;
  }

  return null;
}
