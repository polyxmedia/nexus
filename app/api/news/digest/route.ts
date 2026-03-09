import { NextResponse } from "next/server";
import { getNewsFeed } from "@/lib/news/feeds";
import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const DIGEST_KEY = "cache:news_digest";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Simple hash to detect headline changes
function hashHeadlines(headlines: string): string {
  let h = 0;
  for (let i = 0; i < headlines.length; i++) {
    h = ((h << 5) - h + headlines.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ digest: null });

  try {
    const articles = await getNewsFeed("all", 30);
    if (articles.length === 0) return NextResponse.json({ digest: null });

    const headlines = articles
      .slice(0, 20)
      .map((a, i) => `${i + 1}. [${a.category.toUpperCase()}] ${a.title}${a.description ? ` — ${a.description}` : ""}`)
      .join("\n");

    const headlineHash = hashHeadlines(headlines);

    // Check DB cache: reuse if same headlines and not expired
    const cached = await db.select().from(schema.settings).where(eq(schema.settings.key, DIGEST_KEY));
    if (cached.length > 0) {
      try {
        const data = JSON.parse(cached[0].value);
        if (data.hash === headlineHash && data.expiry > Date.now()) {
          return NextResponse.json({ digest: data.text });
        }
      } catch {
        // bad cache, regenerate
      }
    }

    // Headlines changed or cache expired, generate new digest
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

    // Persist to DB so it survives cold starts
    const cacheValue = JSON.stringify({ text, hash: headlineHash, expiry: Date.now() + CACHE_TTL_MS });
    if (cached.length > 0) {
      await db.update(schema.settings).set({ value: cacheValue, updatedAt: new Date().toISOString() }).where(eq(schema.settings.key, DIGEST_KEY));
    } else {
      await db.insert(schema.settings).values({ key: DIGEST_KEY, value: cacheValue, updatedAt: new Date().toISOString() });
    }

    return NextResponse.json({ digest: text });
  } catch {
    return NextResponse.json({ digest: null });
  }
}
