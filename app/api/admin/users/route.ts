import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));

  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(like(schema.settings.key, "user:%"));

    const users = userSettings.map((s: { key: string; value: string; updatedAt: string | null }) => {
      const username = s.key.replace("user:", "");
      const data = JSON.parse(s.value);
      return {
        username,
        role: data.role || "user",
        tier: data.tier || "free",
        createdAt: s.updatedAt,
      };
    });

    // Get subscription data for each user
    const subs = await db.select().from(schema.subscriptions);
    const subMap = new Map(subs.map((s: { userId: string; [key: string]: unknown }) => [s.userId, s]));

    const enriched = users.map((u: { username: string; role: string; tier: string; createdAt: string | null }) => ({
      ...u,
      subscription: subMap.get(u.username) || null,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

// POST - update user role or grant/revoke access
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { username, role, action, tier: grantTier } = body;

    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (userSettings.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = JSON.parse(userSettings[0].value);

    // Grant permanent access (beta/comped)
    if (action === "grant_access") {
      const tierName = grantTier || "operator";
      userData.tier = tierName;

      // Update user settings with new tier
      await db
        .update(schema.settings)
        .set({ value: JSON.stringify(userData) })
        .where(eq(schema.settings.key, `user:${username}`));

      // Find the matching subscription tier
      const tiers = await db.select().from(schema.subscriptionTiers);
      const matchingTier = tiers.find(
        (t: { name: string }) => t.name.toLowerCase() === tierName.toLowerCase()
      );

      const now = new Date().toISOString();
      // Far future expiry for permanent access
      const farFuture = "2099-12-31T23:59:59.000Z";

      // Check for existing subscription
      const existing = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, username));

      if (existing.length > 0) {
        await db
          .update(schema.subscriptions)
          .set({
            tierId: matchingTier?.id || existing[0].tierId,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: farFuture,
            cancelAtPeriodEnd: 0,
            updatedAt: now,
          })
          .where(eq(schema.subscriptions.userId, username));
      } else {
        await db.insert(schema.subscriptions).values({
          userId: username,
          tierId: matchingTier?.id || 1,
          stripeCustomerId: null,
          stripeSubscriptionId: `comped_${Date.now()}`,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: farFuture,
          cancelAtPeriodEnd: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      return NextResponse.json({ success: true, granted: tierName });
    }

    // Revoke comped access
    if (action === "revoke_access") {
      userData.tier = "free";

      await db
        .update(schema.settings)
        .set({ value: JSON.stringify(userData) })
        .where(eq(schema.settings.key, `user:${username}`));

      // Only revoke comped subs (not Stripe-managed ones)
      const subs = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, username));

      if (subs.length > 0) {
        const sub = subs[0];
        const isComped =
          !sub.stripeSubscriptionId ||
          sub.stripeSubscriptionId.startsWith("comped_");

        if (isComped) {
          await db
            .update(schema.subscriptions)
            .set({ status: "canceled", updatedAt: new Date().toISOString() })
            .where(eq(schema.subscriptions.userId, username));
        }
      }

      return NextResponse.json({ success: true, revoked: true });
    }

    // Update role (existing functionality)
    if (role) {
      userData.role = role;

      await db
        .update(schema.settings)
        .set({ value: JSON.stringify(userData) })
        .where(eq(schema.settings.key, `user:${username}`));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No action specified" }, { status: 400 });
  } catch (err) {
    console.error("Admin users POST error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
