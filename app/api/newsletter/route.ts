import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`newsletter:subscribe:${ip}`, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (email.length > 254) {
      return NextResponse.json({ error: "Email too long" }, { status: 400 });
    }

    const key = `newsletter:${email}`;

    // Check if already subscribed
    const existing = await db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ already: true });
    }

    await db.insert(settings).values({
      key,
      value: JSON.stringify({
        email,
        subscribedAt: new Date().toISOString(),
        status: "active",
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
