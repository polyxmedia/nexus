import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function detectDevice(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, referrer } = body;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Create anonymous hashes - no PII stored
    const dateKey = new Date().toISOString().split("T")[0];
    const sessionHash = hashString(ip + ua + dateKey);
    const userAgentHash = hashString(ua);
    const deviceType = detectDevice(ua);

    await db.insert(schema.analyticsEvents).values({
      eventType: "pageview",
      path,
      referrer: referrer || null,
      sessionHash,
      userAgentHash,
      deviceType,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
