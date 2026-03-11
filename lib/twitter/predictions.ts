/**
 * Tweet formatters for NEXUS predictions.
 *
 * Two main flows:
 * 1. New predictions - posted when the system generates predictions
 * 2. Resolutions - posted when predictions are confirmed/denied/partial
 */

import { postTweet, postThread, isTwitterConfigured } from "./client";
import { db, schema } from "@/lib/db";
import { inArray } from "drizzle-orm";

interface Prediction {
  id?: number;
  claim: string;
  category: string;
  confidence: number;
  deadline: string;
  direction?: string | null;
}

interface ResolvedPrediction {
  id: number;
  claim: string;
  category: string;
  confidence: number;
  outcome: string;
  score?: number | null;
  direction?: string | null;
  directionCorrect?: number | null;
  priceTarget?: number | null;
  referenceSymbol?: string | null;
  outcomeNotes?: string | null;
}

function directionArrow(direction?: string | null): string {
  if (direction === "up") return "^";
  if (direction === "down") return "v";
  return "";
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case "confirmed": return "HIT";
    case "denied": return "MISS";
    case "partial": return "PARTIAL";
    default: return outcome.toUpperCase();
  }
}

export const FOUNDER_HANDLE = "@voidmode";

/** Mention the founder roughly every 3rd tweet based on day-of-year */
function shouldMentionFounder(): boolean {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return dayOfYear % 3 === 0;
}

function categoryTag(category: string): string {
  switch (category) {
    case "market": return "#Markets";
    case "geopolitical": return "#Geopolitics";
    case "celestial": return "#Macro";
    default: return `#${category}`;
  }
}

/**
 * Post the top prediction as a tweet when new predictions are generated.
 * Posts the single highest-confidence prediction to keep the feed clean.
 */
export async function tweetNewPredictions(predictions: Prediction[]): Promise<void> {
  if (!(await isTwitterConfigured()) || predictions.length === 0) return;

  const top = [...predictions].sort((a, b) => b.confidence - a.confidence)[0];
  const dir = directionArrow(top.direction);
  const conf = `${(top.confidence * 100).toFixed(0)}%`;
  const tag = categoryTag(top.category);

  // Keep it tight for X
  const claim = top.claim.length > 180 ? top.claim.slice(0, 177) + "..." : top.claim;
  const founderTag = shouldMentionFounder() ? `\nby ${FOUNDER_HANDLE}` : "";
  const tweet = `NEXUS Signal ${dir ? dir + " " : ""}| ${conf} confidence\n\n${claim}\n\nDeadline: ${top.deadline}\n${tag} #NEXUS${founderTag}`;

  try {
    await postTweet(tweet);
  } catch (err) {
    console.error("[twitter] Failed to tweet new prediction:", err);
  }
}

/**
 * Post resolution results. Groups all resolved predictions into a summary tweet,
 * with a thread for individual results if there are multiple.
 */
export async function tweetResolutions(resolved: ResolvedPrediction[]): Promise<void> {
  if (!(await isTwitterConfigured()) || resolved.length === 0) return;

  // Filter out expired - not interesting to post
  const meaningful = resolved.filter((r) => r.outcome !== "expired");
  if (meaningful.length === 0) return;

  const hits = meaningful.filter((r) => r.outcome === "confirmed").length;
  const misses = meaningful.filter((r) => r.outcome === "denied").length;
  const partials = meaningful.filter((r) => r.outcome === "partial").length;

  // Single resolution - post one tweet
  if (meaningful.length === 1) {
    const r = meaningful[0];
    const label = outcomeLabel(r.outcome);
    const dir = directionArrow(r.direction);
    const conf = `${(r.confidence * 100).toFixed(0)}%`;
    const claim = r.claim.length > 150 ? r.claim.slice(0, 147) + "..." : r.claim;

    const tweet = `${label} ${dir ? dir + " " : ""}| Stated ${conf}\n\n${claim}\n\n${r.outcomeNotes ? r.outcomeNotes.slice(0, 60) : ""}\n${categoryTag(r.category)} #NEXUS`;

    try {
      await postTweet(tweet);
    } catch (err) {
      console.error("[twitter] Failed to tweet resolution:", err);
    }
    return;
  }

  // Multiple resolutions - summary tweet + thread
  const parts: string[] = [];
  if (hits > 0) parts.push(`${hits} HIT`);
  if (partials > 0) parts.push(`${partials} PARTIAL`);
  if (misses > 0) parts.push(`${misses} MISS`);

  const founderTag = shouldMentionFounder() ? ` by ${FOUNDER_HANDLE}` : "";
  const summary = `NEXUS Prediction Results\n\n${parts.join(" | ")}\n${meaningful.length} predictions resolved\n\n#NEXUS${founderTag}`;

  const threadTweets = [summary];

  // Add individual results (cap at 4 to avoid spam)
  for (const r of meaningful.slice(0, 4)) {
    const label = outcomeLabel(r.outcome);
    const conf = `${(r.confidence * 100).toFixed(0)}%`;
    const claim = r.claim.length > 180 ? r.claim.slice(0, 177) + "..." : r.claim;
    threadTweets.push(`${label} | ${conf}\n\n${claim}\n${categoryTag(r.category)}`);
  }

  try {
    if (threadTweets.length === 1) {
      await postTweet(summary);
    } else {
      await postThread(threadTweets);
    }
  } catch (err) {
    console.error("[twitter] Failed to tweet resolutions:", err);
  }
}

/**
 * Fetch full prediction data by IDs and tweet resolution results.
 * Shared helper used by both daily and fast-resolve routes.
 */
export async function fetchAndTweetResolutions(resolvedIds: number[]): Promise<void> {
  if (resolvedIds.length === 0) return;

  const resolvedPredictions = await db.select().from(schema.predictions).where(
    inArray(schema.predictions.id, resolvedIds)
  );
  const resolvedFull = resolvedPredictions
    .filter((p) => p.outcome)
    .map((p) => ({
      id: p.id,
      claim: p.claim,
      category: p.category,
      confidence: p.confidence,
      outcome: p.outcome!,
      score: p.score,
      direction: p.direction,
      directionCorrect: p.directionCorrect,
      priceTarget: p.priceTarget,
      referenceSymbol: p.referenceSymbol,
      outcomeNotes: p.outcomeNotes,
    }));
  await tweetResolutions(resolvedFull);
}
