import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { validateOrigin } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = session.user.name;

    const rl = await rateLimit(`account:close:${username}`, 3, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { confirmUsername } = body;

    if (confirmUsername !== username) {
      return NextResponse.json({ error: "Username confirmation does not match" }, { status: 400 });
    }

    // Check if user is an admin - admins cannot self-delete if they're the only admin
    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (userSettings.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = JSON.parse(userSettings[0].value);

    if (userData.role === "admin") {
      // Check if there are other admins
      const allUsers = await db
        .select()
        .from(schema.settings)
        .where(like(schema.settings.key, "user:%"));

      const adminCount = allUsers.filter((u) => {
        try {
          return JSON.parse(u.value).role === "admin";
        } catch {
          return false;
        }
      }).length;

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot close the only admin account. Transfer admin role to another user first." },
          { status: 400 }
        );
      }
    }

    // Cancel Stripe subscription if exists
    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, username));

    if (subs.length > 0 && subs[0].stripeSubscriptionId && !subs[0].stripeSubscriptionId.startsWith("comped_")) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(subs[0].stripeSubscriptionId);
      } catch (err) {
        console.error("Failed to cancel Stripe subscription during account closure:", err);
        // Continue with deletion even if Stripe cancel fails
      }
    }

    // Delete subscription record
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, username));

    // Delete user-scoped settings (escape _ for LIKE since usernames allow underscores)
    const escapedUsername = username.replace(/_/g, "\\_");
    const userScopedSettings = await db
      .select()
      .from(schema.settings)
      .where(like(schema.settings.key, `${escapedUsername}:%`));

    for (const row of userScopedSettings) {
      await db.delete(schema.settings).where(eq(schema.settings.key, row.key));
    }

    // Delete user account last so a retry can complete cleanup if interrupted
    await db.delete(schema.settings).where(eq(schema.settings.key, `user:${username}`));

    return NextResponse.json({ success: true, message: "Account closed successfully" });
  } catch (error) {
    console.error("Account close error:", error);
    return NextResponse.json({ error: "Failed to close account" }, { status: 500 });
  }
}
