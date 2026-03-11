import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  if (!tierCheck.result.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NexusOGTester/1.0 (like Twitterbot)" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
    }

    const html = await res.text();

    // Parse meta tags from HTML
    const metaRegex = /<meta\s+([^>]*?)\/?\s*>/gi;
    const allMeta: { property: string; content: string }[] = [];
    let ogImage: string | null = null;
    let ogTitle: string | null = null;
    let ogDescription: string | null = null;
    let ogUrl: string | null = null;
    let twitterCard: string | null = null;
    let twitterImage: string | null = null;

    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      const attrs = match[1];

      // Extract property/name and content
      const propMatch = attrs.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
      const contentMatch = attrs.match(/content\s*=\s*["']([^"']+)["']/i);

      if (!propMatch || !contentMatch) continue;

      const prop = propMatch[1].toLowerCase();
      const content = contentMatch[1];

      // Only collect og: and twitter: tags
      if (prop.startsWith("og:") || prop.startsWith("twitter:")) {
        allMeta.push({ property: prop, content });
      }

      switch (prop) {
        case "og:image": ogImage = content; break;
        case "og:title": ogTitle = content; break;
        case "og:description": ogDescription = content; break;
        case "og:url": ogUrl = content; break;
        case "twitter:card": twitterCard = content; break;
        case "twitter:image": twitterImage = content; break;
      }
    }

    // Also check <title> tag as fallback
    if (!ogTitle) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) ogTitle = titleMatch[1].trim();
    }

    return NextResponse.json({
      ogImage,
      ogTitle,
      ogDescription,
      ogUrl,
      twitterCard,
      twitterImage,
      allMeta,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch URL";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
