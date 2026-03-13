/**
 * Tweet formatters for NEXUS predictions.
 *
 * Two main flows:
 * 1. New predictions - AI-generated threads that present the thesis naturally
 * 2. Resolutions - quote-tweet the original prediction with HIT/MISS result
 */

import Anthropic from "@anthropic-ai/sdk";
import { postTweet, postThread, quoteTweet, isTwitterConfigured, logTweet } from "./client";
import { db, schema } from "@/lib/db";
import { eq, inArray, desc } from "drizzle-orm";

interface Prediction {
  id?: number;
  claim: string;
  category: string;
  confidence: number;
  deadline: string;
  direction?: string | null;
  referenceSymbol?: string | null;
  priceTarget?: number | null;
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
  tweetId?: string | null;
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

function categoryTag(category: string): string {
  switch (category) {
    case "market": return "#Markets";
    case "geopolitical": return "#Geopolitics";
    case "celestial": return "#Macro";
    default: return `#${category}`;
  }
}

const PREDICTION_TWEET_PROMPT = `You are tweeting from the NEXUS Intelligence Platform (@nexaboratorio on X), founded by @voidmode.

VOICE RULES (these are non-negotiable):
- Write like speech. Sentences should flow the way someone talks, chain thoughts with commas
- Comma splices are fine, use them naturally
- Contractions always. "Don't", "won't", "it's", "you'd"
- Use "tho" instead of "though" casually
- Ellipsis (...) for pauses and transitions is natural
- No emojis ever
- No em dashes ever (use commas instead)
- No ALL CAPS for emphasis
- No exclamation marks
- No formulaic headers like "NEXUS Signal |" or "Alert:"
- No "Let's dive in", "Here's the thing", "At the end of the day"
- No hollow hype words like "game-changer", "huge", "incredible"
- No choppy fragment style. Don't write "Called it. Clean hit." Write "Called it, clean hit"
- State views directly, no hedging with "I think" or "in my opinion"
- Reference specific numbers, levels, catalysts. Be precise
- Each tweet under 270 characters

THREAD STRUCTURE (2-3 tweets):
- First tweet: the call itself, stated directly. What you expect and why it matters
- Second tweet: the reasoning, what signals, data, or regime context supports this
- Third (optional): the risk, what invalidates this thesis. Only if worth noting

End the last tweet with the relevant hashtag and #NEXUS.

RESPONSE FORMAT:
{
  "tweets": ["first tweet", "second tweet", "optional third tweet"]
}

Keep each tweet dense with insight, no filler.`;

const RESOLUTION_TWEET_PROMPT = `You are tweeting from the NEXUS Intelligence Platform (@nexaboratorio on X). A prediction has resolved.

VOICE RULES (non-negotiable):
- Write like speech, chain thoughts with commas
- Contractions always. Comma splices fine. Ellipsis for pauses
- No emojis, no em dashes, no ALL CAPS, no exclamation marks
- No formulaic headers or "Here's the thing" type openers
- No choppy fragments. Keep sentences connected
- Under 270 characters
- On a HIT: state it directly, reference what confirmed it. Don't gloat
- On a MISS: own it cleanly, note what was mispriced. No hedging or excuses
- On a PARTIAL: explain what landed and what didn't, concisely
- If this is a quote-tweet referencing the original call, nod to it naturally

RESPONSE FORMAT:
{ "tweet": "your resolution tweet text" }`;

/**
 * Post the top prediction as a thread when new predictions are generated.
 * Uses Claude to generate natural-sounding tweet threads.
 * Saves the first tweet ID back to the prediction row for later quote-tweet resolution.
 */
export async function tweetNewPredictions(predictions: Prediction[]): Promise<void> {
  if (!(await isTwitterConfigured()) || predictions.length === 0) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const top = [...predictions].sort((a, b) => b.confidence - a.confidence)[0];

  // If we have an API key, use Claude to generate a natural thread
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });

      const context = [
        `PREDICTION:`,
        `Claim: ${top.claim}`,
        `Confidence: ${(top.confidence * 100).toFixed(0)}%`,
        `Direction: ${top.direction || "not specified"}`,
        `Category: ${top.category}`,
        `Deadline: ${top.deadline}`,
        top.referenceSymbol ? `Symbol: ${top.referenceSymbol}` : null,
        top.priceTarget ? `Price target: ${top.priceTarget}` : null,
        ``,
        `Relevant hashtag: ${categoryTag(top.category)}`,
        `Today: ${new Date().toISOString().split("T")[0]}`,
      ].filter(Boolean).join("\n");

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: PREDICTION_TWEET_PROMPT,
        messages: [{ role: "user", content: context }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const tweets: string[] = result.tweets;

        if (tweets && tweets.length > 0) {
          // Ensure #NEXUS is on the last tweet
          const lastIdx = tweets.length - 1;
          if (!tweets[lastIdx].includes("#NEXUS")) {
            tweets[lastIdx] = tweets[lastIdx].length + 7 <= 280
              ? `${tweets[lastIdx]} #NEXUS`
              : tweets[lastIdx];
          }

          const results = tweets.length > 1
            ? await postThread(tweets)
            : [await postTweet(tweets[0])].filter(Boolean) as { id: string; text: string }[];

          if (results.length > 0 && top.id) {
            const firstTweetId = results[0].id;

            // Save tweet ID to prediction row
            await db.update(schema.predictions)
              .set({ tweetId: firstTweetId })
              .where(eq(schema.predictions.id, top.id));

            await logTweet({
              tweetId: firstTweetId,
              tweetType: "prediction",
              content: tweets.join("\n---\n"),
              predictionId: top.id,
            });

            console.log(`[twitter] Posted prediction thread (${results.length} tweets) for prediction #${top.id}`);
          }
          return;
        }
      }
    } catch (err) {
      console.error("[twitter] AI tweet generation failed, falling back to template:", err);
    }
  }

  // Fallback: simple template tweet
  const conf = `${(top.confidence * 100).toFixed(0)}%`;
  const tag = categoryTag(top.category);
  const claim = top.claim.length > 180 ? top.claim.slice(0, 177) + "..." : top.claim;
  const tweet = `${conf} confidence\n\n${claim}\n\nDeadline: ${top.deadline}\n${tag} #NEXUS`;

  try {
    const result = await postTweet(tweet);
    if (result && top.id) {
      await db.update(schema.predictions)
        .set({ tweetId: result.id })
        .where(eq(schema.predictions.id, top.id));

      await logTweet({
        tweetId: result.id,
        tweetType: "prediction",
        content: tweet,
        predictionId: top.id,
      });
    }
  } catch (err) {
    console.error("[twitter] Failed to tweet new prediction:", err);
  }
}

/**
 * Post resolution results. If the original prediction has a tweet ID,
 * quote-tweet it so followers can see the original call alongside the result.
 */
export async function tweetResolutions(resolved: ResolvedPrediction[]): Promise<void> {
  if (!(await isTwitterConfigured()) || resolved.length === 0) return;

  const meaningful = resolved.filter((r) => r.outcome !== "expired");
  if (meaningful.length === 0) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  for (const r of meaningful.slice(0, 4)) {
    const label = outcomeLabel(r.outcome);
    const conf = `${(r.confidence * 100).toFixed(0)}%`;

    let tweetText: string;

    // Try AI-generated resolution tweet
    if (apiKey) {
      try {
        const client = new Anthropic({ apiKey });
        const context = [
          `RESULT: ${label}`,
          `Original claim: ${r.claim}`,
          `Stated confidence: ${conf}`,
          `Direction: ${r.direction || "N/A"}`,
          `Direction correct: ${r.directionCorrect === 1 ? "yes" : r.directionCorrect === 0 ? "no" : "N/A"}`,
          r.outcomeNotes ? `Notes: ${r.outcomeNotes}` : null,
          r.referenceSymbol ? `Symbol: ${r.referenceSymbol}` : null,
          r.priceTarget ? `Target: ${r.priceTarget}` : null,
          `Category: ${r.category}`,
          r.tweetId ? `This will be a quote-tweet of the original prediction` : `No original tweet to reference`,
          `Relevant hashtag: ${categoryTag(r.category)}`,
        ].filter(Boolean).join("\n");

        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: RESOLUTION_TWEET_PROMPT,
          messages: [{ role: "user", content: context }],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.tweet) {
            tweetText = result.tweet;
            if (!tweetText.includes("#NEXUS") && tweetText.length + 7 <= 280) {
              tweetText += " #NEXUS";
            }
          } else {
            tweetText = fallbackResolutionTweet(r, label, conf);
          }
        } else {
          tweetText = fallbackResolutionTweet(r, label, conf);
        }
      } catch {
        tweetText = fallbackResolutionTweet(r, label, conf);
      }
    } else {
      tweetText = fallbackResolutionTweet(r, label, conf);
    }

    try {
      let result;
      if (r.tweetId) {
        result = await quoteTweet(tweetText, r.tweetId);
      }
      if (!result) {
        result = await postTweet(tweetText);
      }
      if (result) {
        await logTweet({
          tweetId: result.id,
          tweetType: "resolution",
          content: tweetText,
          predictionId: r.id,
          quoteTweetId: r.tweetId || undefined,
        });
        console.log(`[twitter] Posted resolution ${label} for prediction #${r.id}${r.tweetId ? " (quote tweet)" : ""}`);
      }
    } catch (err) {
      console.error("[twitter] Failed to tweet resolution:", err);
    }

    // Small buffer between posts
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // If multiple, post a summary thread header first
  if (meaningful.length > 1) {
    const hits = meaningful.filter((r) => r.outcome === "confirmed").length;
    const misses = meaningful.filter((r) => r.outcome === "denied").length;
    const partials = meaningful.filter((r) => r.outcome === "partial").length;
    const parts: string[] = [];
    if (hits > 0) parts.push(`${hits} HIT`);
    if (partials > 0) parts.push(`${partials} PARTIAL`);
    if (misses > 0) parts.push(`${misses} MISS`);

    // Fetch recent track record for context
    const recentResolved = await db.select().from(schema.predictions)
      .where(eq(schema.predictions.outcome, "confirmed"))
      .orderBy(desc(schema.predictions.resolvedAt))
      .limit(100);
    const totalResolved = await db.select().from(schema.predictions).orderBy(desc(schema.predictions.id)).limit(500);
    const resolvedCount = totalResolved.filter((p) => p.outcome).length;
    const accuracy = resolvedCount > 0
      ? (totalResolved.filter((p) => p.outcome === "confirmed").length / resolvedCount * 100).toFixed(1)
      : "N/A";

    const summary = `${meaningful.length} predictions just resolved: ${parts.join(" | ")}\n\nRunning accuracy: ${accuracy}%\n\n#NEXUS`;

    try {
      const summaryResult = await postTweet(summary);
      if (summaryResult) {
        await logTweet({
          tweetId: summaryResult.id,
          tweetType: "resolution",
          content: summary,
        });
      }
    } catch (err) {
      console.error("[twitter] Failed to post resolution summary:", err);
    }
  }
}

function fallbackResolutionTweet(r: ResolvedPrediction, label: string, conf: string): string {
  const claim = r.claim.length > 150 ? r.claim.slice(0, 147) + "..." : r.claim;
  const notes = r.outcomeNotes ? `\n\n${r.outcomeNotes.slice(0, 60)}` : "";
  return `${label} | Stated ${conf}\n\n${claim}${notes}\n${categoryTag(r.category)} #NEXUS`;
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
      tweetId: p.tweetId,
    }));
  await tweetResolutions(resolvedFull);
}
