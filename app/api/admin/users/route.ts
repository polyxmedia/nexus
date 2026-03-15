import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hashPassword } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateThrottleCache } from "@/lib/auth/user-throttle";
import { invalidateTierCache } from "@/lib/auth/require-tier";

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

    const rl = await rateLimit(`admin:users:get:${session.user.name}`, 60, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
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
        compedGrant: data.compedGrant || null,
        email: data.email || null,
        blocked: data.blocked || false,
        blockedAt: data.blockedAt || null,
        throttle: data.throttle || null,
      };
    });

    // Get subscription data for each user
    const subs = await db.select().from(schema.subscriptions);
    const subMap = new Map(subs.map((s: { userId: string; [key: string]: unknown }) => [s.userId, s]));

    const enriched = users.map((u: { username: string; role: string; tier: string; createdAt: string | null; compedGrant: { tier: string; grantedAt: string; expiresAt: string | null; note: string | null } | null; email: string | null }) => ({
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
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = await rateLimit(`admin:users:post:${session.user.name}`, 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { username, role, action, tier: grantTier } = body;

    // For create_user, skip the existing-user lookup
    if (action === "create_user") {
      const { password, email, newRole, newTier } = body;

      if (!username || !password) {
        return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
      }

      if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
        return NextResponse.json({ error: "Username must be 3-32 chars, letters/numbers/underscores" }, { status: 400 });
      }

      if (password.length < 10) {
        return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
      }

      const existingUser = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, `user:${username}`));

      if (existingUser.length > 0) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }

      const hashed = await hashPassword(password);
      const userPayload: Record<string, string> = {
        password: hashed,
        role: newRole || "user",
        email: email || "",
      };
      if (newTier && newTier !== "free") userPayload.tier = newTier;

      await db.insert(schema.settings).values({
        key: `user:${username}`,
        value: JSON.stringify(userPayload),
      });

      return NextResponse.json({ success: true, created: true });
    }

    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (userSettings.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = JSON.parse(userSettings[0].value);

    // Grant access (comped) with optional expiry and notes
    if (action === "grant_access") {
      const tierName = grantTier || "operator";
      const { expiresAt, note } = body;
      userData.tier = tierName;

      // Store grant metadata on the user record
      userData.compedGrant = {
        tier: tierName,
        grantedAt: new Date().toISOString(),
        expiresAt: expiresAt || null,
        note: note || null,
      };

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
      // Use provided expiry or far future for permanent
      const periodEnd = expiresAt || "2099-12-31T23:59:59.000Z";

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
            currentPeriodEnd: periodEnd,
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
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Invalidate server-side tier cache so access is immediate
      invalidateTierCache(username);

      return NextResponse.json({ success: true, granted: tierName, expiresAt: periodEnd });
    }

    // Revoke comped access
    if (action === "revoke_access") {
      userData.tier = "free";
      delete userData.compedGrant;

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

      invalidateTierCache(username);

      return NextResponse.json({ success: true, revoked: true });
    }

    // Block user (sets blocked flag, cancels subscription)
    if (action === "block_user") {
      userData.blocked = true;
      userData.blockedAt = new Date().toISOString();
      userData.blockedBy = session.user!.name;
      userData.tier = "free";

      await db
        .update(schema.settings)
        .set({ value: JSON.stringify(userData) })
        .where(eq(schema.settings.key, `user:${username}`));

      // Cancel any active subscription
      const subs = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, username));

      if (subs.length > 0) {
        await db
          .update(schema.subscriptions)
          .set({ status: "canceled", updatedAt: new Date().toISOString() })
          .where(eq(schema.subscriptions.userId, username));
      }

      return NextResponse.json({ success: true, blocked: true });
    }

    // Unblock user
    if (action === "unblock_user") {
      delete userData.blocked;
      delete userData.blockedAt;
      delete userData.blockedBy;

      await db
        .update(schema.settings)
        .set({ value: JSON.stringify(userData) })
        .where(eq(schema.settings.key, `user:${username}`));

      return NextResponse.json({ success: true, unblocked: true });
    }

    // Delete user (removes user record, subscription, and all user-scoped settings)
    if (action === "delete_user") {
      // Prevent self-deletion
      if (username === session.user!.name) {
        return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
      }

      // Delete user account key
      await db.delete(schema.settings).where(eq(schema.settings.key, `user:${username}`));

      // Delete user-scoped settings
      const userScopedSettings = await db
        .select()
        .from(schema.settings)
        .where(like(schema.settings.key, `${username}:%`));

      for (const row of userScopedSettings) {
        await db.delete(schema.settings).where(eq(schema.settings.key, row.key));
      }

      // Delete subscription
      await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, username));

      return NextResponse.json({ success: true, deleted: true });
    }

    // Set throttle limits for a user
    if (action === "set_throttle") {
      const { throttle } = body;
      if (throttle === null) {
        delete userData.throttle;
      } else {
        userData.throttle = {
          chatMessagesPerDay: throttle.chatMessagesPerDay ?? null,
          predictionsPerHour: throttle.predictionsPerHour ?? null,
          apiCallsPerMinute: throttle.apiCallsPerMinute ?? null,
        };
        // Remove nulls to keep the record clean
        if (!userData.throttle.chatMessagesPerDay && !userData.throttle.predictionsPerHour && !userData.throttle.apiCallsPerMinute) {
          delete userData.throttle;
        }
      }

      await db
        .update(schema.settings)
        .set({ value: JSON.stringify(userData) })
        .where(eq(schema.settings.key, `user:${username}`));

      invalidateThrottleCache(username);
      return NextResponse.json({ success: true });
    }

    // Edit user fields (email, role, tier)
    if (action === "edit_user") {
      const { email, newRole, newTier } = body;
      if (email !== undefined) userData.email = email || null;
      if (newRole) userData.role = newRole;
      if (newTier) userData.tier = newTier;

      await db
        .update(schema.settings)
        .set({ value: JSON.stringify(userData) })
        .where(eq(schema.settings.key, `user:${username}`));

      return NextResponse.json({ success: true });
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
