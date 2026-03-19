import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

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

/**
 * Proxy for Twitter's oembed endpoint.
 * Fetches tweet content without requiring Twitter API search tier.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const oembedUrl = url.searchParams.get("url");

  if (!oembedUrl?.startsWith("https://publish.twitter.com/oembed")) {
    return NextResponse.json({ error: "Invalid oembed URL" }, { status: 400 });
  }

  try {
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Twitter oembed returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Extract clean text from the oembed HTML
    // The html field contains a blockquote with the tweet text
    const html: string = data.html || "";
    const textMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const rawText = textMatch
      ? textMatch[1]
          .replace(/<a[^>]*>(.*?)<\/a>/g, "$1")
          .replace(/<br\s*\/?>/g, "\n")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
      : "";

    // Extract author from the oembed author_url
    const authorUrl: string = data.author_url || "";
    const authorMatch = authorUrl.match(/(?:x\.com|twitter\.com)\/([^/?]+)/);
    const authorUsername = authorMatch ? authorMatch[1] : "";

    return NextResponse.json({
      text: rawText,
      authorUsername,
      authorName: data.author_name || "",
    });
  } catch (err) {
    console.error("[admin/twitter-engage/oembed] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch tweet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
