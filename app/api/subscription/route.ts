import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET current user's subscription
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userRows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${session.user.name}`));

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
      .where(eq(schema.subscriptions.userId, session.user.name));

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
