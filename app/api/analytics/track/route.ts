import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function detectDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  if (/msie|trident/i.test(ua)) return "IE";
  return "Other";
}

function parseOS(ua: string): string {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  if (/chromeos/i.test(ua)) return "ChromeOS";
  return "Other";
}

const EXCLUDED_IPS_KEY = "analytics:excluded_ips";

let _excludedCache: { ips: string[]; fetchedAt: number } | null = null;

async function getExcludedIPs(): Promise<string[]> {
  // Cache for 60s to avoid DB hit on every pageview
  if (_excludedCache && Date.now() - _excludedCache.fetchedAt < 60_000) {
    return _excludedCache.ips;
  }
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, EXCLUDED_IPS_KEY));
    const ips = rows.length > 0 ? JSON.parse(rows[0].value) as string[] : [];
    _excludedCache = { ips, fetchedAt: Date.now() };
    return ips;
  } catch {
    return _excludedCache?.ips || [];
  }
}

function isExcluded(ip: string, excluded: string[]): boolean {
  return excluded.some((ex) => {
    if (ex.includes("/")) {
      // Simple CIDR support for /24 and /16
      const [base, bits] = ex.split("/");
      const mask = parseInt(bits);
      if (mask === 24) return ip.startsWith(base.split(".").slice(0, 3).join(".") + ".");
      if (mask === 16) return ip.startsWith(base.split(".").slice(0, 2).join(".") + ".");
      return ip === base;
    }
    if (ex.endsWith(".*")) {
      return ip.startsWith(ex.replace(".*", "."));
    }
    return ip === ex;
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, referrer, screenWidth, screenHeight, visitorId } = body;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Skip excluded IPs
    const excluded = await getExcludedIPs();
    if (isExcluded(ip, excluded)) {
      return NextResponse.json({ ok: true });
    }

    // Geo from Vercel/Cloudflare headers
    const country = req.headers.get("x-vercel-ip-country")
      || req.headers.get("cf-ipcountry")
      || null;
    const city = req.headers.get("x-vercel-ip-city") || null;
    const region = req.headers.get("x-vercel-ip-country-region") || null;

    const dateKey = new Date().toISOString().split("T")[0];
    const sessionHash = hashString(ip + ua + dateKey);
    const userAgentHash = hashString(ua);
    const visitorHash = visitorId ? hashString(visitorId) : hashString(ip + ua);
    const deviceType = detectDevice(ua);
    const browser = parseBrowser(ua);
    const os = parseOS(ua);

    await db.insert(schema.analyticsEvents).values({
      eventType: "pageview",
      path,
      referrer: referrer || null,
      sessionHash,
      userAgentHash,
      visitorHash,
      country,
      city,
      region,
      deviceType,
      browser,
      os,
      screenWidth: screenWidth && typeof screenWidth === "number" ? screenWidth : null,
      screenHeight: screenHeight && typeof screenHeight === "number" ? screenHeight : null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Duration update for previous page
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, duration } = body;

    if (!path || typeof duration !== "number" || duration <= 0) {
      return NextResponse.json({ ok: true });
    }

    const ua = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const excluded = await getExcludedIPs();
    if (isExcluded(ip, excluded)) {
      return NextResponse.json({ ok: true });
    }
    const dateKey = new Date().toISOString().split("T")[0];
    const sessionHash = hashString(ip + ua + dateKey);

    // Update the most recent matching event
    const recent = await db
      .select({ id: schema.analyticsEvents.id })
      .from(schema.analyticsEvents)
      .where(
        and(
          eq(schema.analyticsEvents.sessionHash, sessionHash),
          eq(schema.analyticsEvents.path, path)
        )
      )
      .orderBy(desc(schema.analyticsEvents.createdAt))
      .limit(1);

    if (recent.length > 0) {
      await db
        .update(schema.analyticsEvents)
        .set({ duration: Math.min(duration, 3600) })
        .where(eq(schema.analyticsEvents.id, recent[0].id));
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
