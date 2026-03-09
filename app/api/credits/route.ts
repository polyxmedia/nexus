import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getBalance, TIER_CREDITS } from "@/lib/credits";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = session.user.name;

  // Get user tier
  let tier = "free";
  let isAdmin = false;
  const userSettings = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));

  if (userSettings.length > 0) {
    try {
      const data = JSON.parse(userSettings[0].value);
      tier = data.tier || "free";
      isAdmin = data.role === "admin";
    } catch {
      // treat as free
    }
  }

  if (isAdmin) {
    return NextResponse.json({
      period: new Date().toISOString().slice(0, 7),
      creditsGranted: 0,
      creditsUsed: 0,
      creditsRemaining: -1,
      unlimited: true,
      tier,
    });
  }

  const balance = await getBalance(username, tier);
  return NextResponse.json({
    ...balance,
    tier,
    monthlyGrant: TIER_CREDITS[tier.toLowerCase()] ?? 0,
  });
}
