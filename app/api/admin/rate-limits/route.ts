import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";

async function requireAdmin(username: string): Promise<NextResponse | null> {
  const userSettings = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (userSettings.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userData = JSON.parse(userSettings[0].value);
  if (userData.role !== "admin") return NextResponse.json({ error: "Admin required" }, { status: 403 });

  return null;
}

export async function GET() {
  const check = await requireTier("institution");
  if ("response" in check) return check.response;

  const denied = await requireAdmin(check.result.username);
  if (denied) return denied;

  const configs = await db.select().from(schema.rateLimitConfig);
  return NextResponse.json(configs);
}

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });
  const check = await requireTier("institution");
  if ("response" in check) return check.response;

  const denied = await requireAdmin(check.result.username);
  if (denied) return denied;

  const { tier, routePattern, requestsPerWindow, windowMs } = await request.json();
  if (!tier || !routePattern) {
    return NextResponse.json({ error: "tier and routePattern required" }, { status: 400 });
  }

  // Upsert: check if exists
  const existing = await db.select().from(schema.rateLimitConfig)
    .where(and(
      eq(schema.rateLimitConfig.tier, tier),
      eq(schema.rateLimitConfig.routePattern, routePattern),
    ));

  if (existing.length > 0) {
    const [updated] = await db.update(schema.rateLimitConfig)
      .set({
        requestsPerWindow: requestsPerWindow || existing[0].requestsPerWindow,
        windowMs: windowMs || existing[0].windowMs,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.rateLimitConfig.id, existing[0].id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db.insert(schema.rateLimitConfig).values({
    tier,
    routePattern,
    requestsPerWindow: requestsPerWindow || 60,
    windowMs: windowMs || 60000,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
