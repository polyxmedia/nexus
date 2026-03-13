import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";
import Anthropic from "@anthropic-ai/sdk";
import { postTweet, postThread, isTwitterConfigured, logTweet } from "@/lib/twitter/client";
import { detectCurrentRegime } from "@/lib/regime/detection";
import type { RegimeState } from "@/lib/regime/detection";

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return false;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));
  if (rows.length === 0) return false;
  const userData = JSON.parse(rows[0].value);
  return userData.role === "admin";
}

const COMPOSE_PROMPT = `You tweet from NEXUS Intelligence Platform (@nexaboratorio on X), founded by @voidmode.

VOICE RULES (non-negotiable):
- Write like speech. Chain thoughts with commas, flow naturally
- Comma splices fine. Contractions always. Ellipsis (...) for pauses
- No emojis ever. No em dashes ever (use commas). No ALL CAPS for emphasis
- No exclamation marks. No "Let's dive in", "Here's the thing", "At the end of the day"
- No formulaic antithesis ("It's not about X, it's about Y")
- No hollow hype. No "game-changer", "huge", "incredible"
- No choppy fragment style. Keep sentences connected
- State views directly, no hedging
- Reference specific numbers and data points when available
- Use "tho" instead of "though" casually
- Each tweet under 270 characters

You will receive a topic/prompt from the admin. Generate tweet content based on it.

If the prompt asks for a thread, return multiple tweets. Otherwise return a single tweet.

RESPONSE FORMAT:
{
  "tweets": ["first tweet text", "optional second tweet", "optional third tweet"]
}

Keep it sharp, keep it real.`;

// POST - generate preview or publish
export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, prompt, tweets: tweetsToPublish } = body;

  // --- GENERATE PREVIEW ---
  if (action === "generate") {
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No ANTHROPIC_API_KEY configured" }, { status: 500 });
    }

    // Gather context for richer generation
    let regime: RegimeState | null = null;
    try {
      regime = await detectCurrentRegime();
    } catch { /* fine without */ }

    const predRows = await db.select().from(schema.predictions).orderBy(desc(schema.predictions.id)).limit(200);
    const resolved = predRows.filter((p) => p.outcome);
    const confirmed = resolved.filter((p) => p.outcome === "confirmed");
    const accuracy = resolved.length > 0 ? (confirmed.length / resolved.length * 100).toFixed(1) : "N/A";
    const pending = predRows.filter((p) => !p.outcome).length;

    const contextLines = [
      `ADMIN PROMPT: ${prompt.trim()}`,
      ``,
      `CURRENT CONTEXT (use if relevant):`,
      regime ? `Market regime: ${regime.composite} (score: ${regime.compositeScore?.toFixed(2) || "N/A"})` : null,
      regime?.volatility?.vix != null ? `VIX: ${regime.volatility.vix.toFixed(1)}` : null,
      regime?.monetary?.fedFunds != null ? `Fed Funds: ${regime.monetary.fedFunds.toFixed(2)}%` : null,
      regime?.commodity?.oil != null ? `Oil: $${regime.commodity.oil.toFixed(1)}` : null,
      regime?.commodity?.gold != null ? `Gold: $${regime.commodity.gold.toFixed(0)}` : null,
      `Prediction track record: ${accuracy}% accuracy (${resolved.length} resolved, ${pending} pending)`,
      `Today: ${new Date().toISOString().split("T")[0]}`,
    ].filter(Boolean).join("\n");

    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: COMPOSE_PROMPT,
        messages: [{ role: "user", content: contextLines }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }

      const result = JSON.parse(jsonMatch[0]);
      const tweets: string[] = result.tweets || [];

      if (tweets.length === 0) {
        return NextResponse.json({ error: "AI returned no tweets" }, { status: 500 });
      }

      return NextResponse.json({ tweets });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
    }
  }

  // --- PUBLISH ---
  if (action === "publish") {
    if (!tweetsToPublish || !Array.isArray(tweetsToPublish) || tweetsToPublish.length === 0) {
      return NextResponse.json({ error: "No tweets to publish" }, { status: 400 });
    }

    if (!(await isTwitterConfigured())) {
      return NextResponse.json({ error: "Twitter not connected" }, { status: 400 });
    }

    try {
      let results: { id: string; text: string }[];

      if (tweetsToPublish.length === 1) {
        const result = await postTweet(tweetsToPublish[0]);
        results = result ? [result] : [];
      } else {
        results = await postThread(tweetsToPublish);
      }

      if (results.length === 0) {
        return NextResponse.json({ error: "Failed to post tweet" }, { status: 500 });
      }

      // Log all tweets
      for (let i = 0; i < results.length; i++) {
        await logTweet({
          tweetId: results[i].id,
          tweetType: "analyst",
          content: tweetsToPublish[i] || results[i].text,
        });
      }

      return NextResponse.json({
        posted: results.map((r) => ({
          id: r.id,
          text: r.text,
          url: `https://x.com/nexaboratorio/status/${r.id}`,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `Publish failed: ${message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
