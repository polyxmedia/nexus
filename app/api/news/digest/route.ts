import { NextResponse } from "next/server";
import { getNewsFeed } from "@/lib/news/feeds";
import Anthropic from "@anthropic-ai/sdk";

// 30-minute in-memory cache
let digestCache: { text: string; expiry: number } | null = null;

export async function GET() {
  if (digestCache && digestCache.expiry > Date.now()) {
    return NextResponse.json({ digest: digestCache.text });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ digest: null });

  try {
    const articles = await getNewsFeed("all", 30);
    if (articles.length === 0) return NextResponse.json({ digest: null });

    const headlines = articles
      .slice(0, 20)
      .map((a, i) => `${i + 1}. [${a.category.toUpperCase()}] ${a.title}${a.description ? ` — ${a.description}` : ""}`)
      .join("\n");

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a geopolitical and market intelligence analyst. Based on these headlines, write a concise 3-sentence intelligence digest covering the most significant themes and their implications for markets and geopolitics. Be direct, analytical, and specific. Do not list the headlines back — synthesize them.

Headlines:
${headlines}

Write the digest now:`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;
    if (!text) return NextResponse.json({ digest: null });

    digestCache = { text, expiry: Date.now() + 30 * 60 * 1000 };
    return NextResponse.json({ digest: text });
  } catch {
    return NextResponse.json({ digest: null });
  }
}
