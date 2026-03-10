import { NextResponse } from "next/server";
import { getEffectiveUsername } from "@/lib/auth/effective-user";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET current user's subscription
export async function GET() {
  try {
    const username = await getEffectiveUsername();
    if (!username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userRows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    let isAdmin = false;
    if (userRows.length > 0) {
      try {
        const userData = JSON.parse(userRows[0].value);
        isAdmin = userData.role === "admin" || userData.role === "super_admin";
      } catch (err) { console.error("[Subscription] user data parse failed:", err); }
    }

    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, username));

    if (subs.length === 0) {
      return NextResponse.json({ subscription: null, tier: null, isAdmin });
    }

    const sub = subs[0];
    const tiers = await db
      .select()
      .from(schema.subscriptionTiers)
      .where(eq(schema.subscriptionTiers.id, sub.tierId));

    return NextResponse.json({
      subscription: sub,
      tier: tiers[0] || null,
      isAdmin,
    });
  } catch {
    return NextResponse.json({ subscription: null, tier: null, isAdmin: false });
  }
}
