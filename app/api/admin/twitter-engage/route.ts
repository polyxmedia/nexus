import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";
import Anthropic from "@anthropic-ai/sdk";
import { searchTweets, replyToTweet, logTweet, isTwitterConfigured } from "@/lib/twitter/client";
import { detectCurrentRegime } from "@/lib/regime/detection";
import type { RegimeState } from "@/lib/regime/detection";
import { getCachedNews } from "@/lib/news/sync";

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

const REPLY_PROMPT = `You are replying from @nexaboratorio (NEXUS Intelligence Platform), founded by @voidmode.

VOICE RULES (non-negotiable):
- Write like speech. Chain thoughts with commas, flow naturally
- Comma splices fine. Contractions always. Ellipsis (...) for pauses
- No emojis ever. No em dashes ever (use commas). No ALL CAPS for emphasis
- No exclamation marks. No sycophantic openers ("great point", "interesting thread")
- No "Let's dive in", "Here's the thing", "At the end of the day"
- No formulaic antithesis ("It's not about X, it's about Y")
- No hollow hype. No choppy fragment style
- Don't start with "I" or "@"
- Under 270 characters, dense insight, no filler
- Add substance they can't get elsewhere, specific data points, regime states, historical parallels
- Subtle plug is fine if natural, but never forced. If you mention NEXUS keep it organic
- Match the tone of the conversation, casual or technical
- State your view with data behind it. No "it depends" or "time will tell"
- Use "tho" instead of "though" casually
- If you genuinely can't add value, return null

RESPONSE FORMAT:
{ "reply": "your reply text" }
Or: { "reply": null, "reason": "brief reason" }`;

// GET - search for tweets
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const maxResults = Math.min(parseInt(url.searchParams.get("max") || "20"), 100);

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const configured = await isTwitterConfigured();
  if (!configured) {
    return NextResponse.json({ error: "Twitter not connected. Go to Admin > Integrations to connect." }, { status: 400 });
  }

  try {
    // Append filters to avoid noise
    const fullQuery = `${query.trim()} -is:retweet -is:reply lang:en`;
    const tweets = await searchTweets(fullQuery, maxResults);
    return NextResponse.json({ tweets });
  } catch (err) {
    console.error("[admin/twitter-engage] Search error:", err);
    return NextResponse.json({ tweets: [] });
  }
}

// POST - generate reply or post reply
export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  // --- GENERATE REPLY ---
  if (action === "generate") {
    const { tweetId, tweetText, authorUsername } = body;
    if (!tweetText || !authorUsername) {
      return NextResponse.json({ error: "tweetText and authorUsername required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No ANTHROPIC_API_KEY configured" }, { status: 500 });
    }

    // Gather intelligence context
    let regime: RegimeState | null = null;
    try { regime = await detectCurrentRegime(); } catch { /* fine */ }

    let headlines: string[] = [];
    try {
      const news = await getCachedNews(undefined, 15);
      headlines = news.map((n) => n.title);
    } catch { /* fine */ }

    const contextLines = [
      `TWEET TO REPLY TO:`,
      `@${authorUsername}: "${tweetText}"`,
      ``,
      `YOUR CURRENT INTELLIGENCE (use if relevant):`,
      regime ? `Market regime: ${regime.composite} (score: ${regime.compositeScore?.toFixed(2) || "N/A"})` : null,
      regime?.volatility?.vix != null ? `VIX: ${regime.volatility.vix.toFixed(1)}` : null,
      regime?.monetary?.fedFunds != null ? `Fed Funds: ${regime.monetary.fedFunds.toFixed(2)}%` : null,
      regime?.commodity?.oil != null ? `Oil: $${regime.commodity.oil.toFixed(1)}` : null,
      regime?.commodity?.gold != null ? `Gold: $${regime.commodity.gold.toFixed(0)}` : null,
      headlines.length > 0 ? `\nRECENT HEADLINES:\n${headlines.slice(0, 8).map(h => `- ${h}`).join("\n")}` : null,
      `\nToday: ${new Date().toISOString().split("T")[0]}`,
      `\nWrite a reply that adds genuine analytical value. If you can't, return null.`,
    ].filter(Boolean).join("\n");

    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: REPLY_PROMPT,
        messages: [{ role: "user", content: contextLines }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }

      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ reply: result.reply, reason: result.reason || null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
    }
  }

  // --- POST REPLY ---
  if (action === "post") {
    const { tweetId, replyText } = body;
    if (!tweetId || !replyText) {
      return NextResponse.json({ error: "tweetId and replyText required" }, { status: 400 });
    }

    if (!(await isTwitterConfigured())) {
      return NextResponse.json({ error: "Twitter not connected" }, { status: 400 });
    }

    try {
      const posted = await replyToTweet(tweetId, replyText);
      if (!posted) {
        return NextResponse.json({ error: "Failed to post reply" }, { status: 500 });
      }

      await logTweet({
        tweetId: posted.id,
        tweetType: "reply",
        content: replyText,
      });

      return NextResponse.json({
        posted: {
          id: posted.id,
          text: posted.text,
          url: `https://x.com/nexaboratorio/status/${posted.id}`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `Post failed: ${message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action. Use 'generate' or 'post'" }, { status: 400 });
}
