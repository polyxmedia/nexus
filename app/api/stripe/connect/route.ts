import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

/** Sync Connect account ID to user's referral code (if they have one) */
async function syncReferralCode(userId: string, stripeConnectId: string | null) {
  const fullId = userId.startsWith("user:") ? userId : `user:${userId}`;
  await db
    .update(schema.referralCodes)
    .set({ stripeConnectId })
    .where(eq(schema.referralCodes.userId, fullId));
}

async function getUserData(userId: string) {
  const key = `user:${userId}`;
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  if (rows.length === 0) return null;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return null;
  }
}

async function updateUserData(userId: string, data: Record<string, unknown>) {
  const key = `user:${userId}`;
  await db.update(schema.settings).set({ value: JSON.stringify(data) }).where(eq(schema.settings.key, key));
}

/** GET - Check Stripe Connect account status */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await getUserData(session.user.name);
    if (!userData?.stripeConnectId) {
      return NextResponse.json({ connected: false, payoutsEnabled: false });
    }

    const stripe = getStripe();
    try {
      const account = await stripe.accounts.retrieve(userData.stripeConnectId);
      const payoutsEnabled = account.payouts_enabled ?? false;
      const detailsSubmitted = account.details_submitted ?? false;

      // Update cached status if it changed
      if (userData.payoutsEnabled !== payoutsEnabled) {
        userData.payoutsEnabled = payoutsEnabled;
        await updateUserData(session.user.name, userData);
      }

      return NextResponse.json({
        connected: true,
        payoutsEnabled,
        detailsSubmitted,
      });
    } catch {
      // Account doesn't exist anymore, clean up
      delete userData.stripeConnectId;
      delete userData.payoutsEnabled;
      await updateUserData(session.user.name, userData);
      return NextResponse.json({ connected: false, payoutsEnabled: false });
    }
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json({ connected: false, payoutsEnabled: false });
  }
}

/** POST - Create Stripe Connect Express account + onboarding link */
export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await getUserData(session.user.name);
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stripe = getStripe();
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const returnUrl = `${origin}/settings?tab=subscription&connect=complete`;
    const refreshUrl = `${origin}/settings?tab=subscription&connect=refresh`;

    let accountId = userData.stripeConnectId;

    // Create Express account if user doesn't have one yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        ...(userData.email ? { email: userData.email } : {}),
        metadata: {
          nexusUserId: session.user.name,
        },
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Save Connect account ID to user data + sync to referral code
      userData.stripeConnectId = accountId;
      await updateUserData(session.user.name, userData);
      await syncReferralCode(session.user.name, accountId);
    }

    // Create account link for onboarding (or re-onboarding if incomplete)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    const message = error instanceof Error ? error.message : "Failed to create Connect account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE - Disconnect Stripe Connect account */
export async function DELETE(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await getUserData(session.user.name);
    if (!userData?.stripeConnectId) {
      return NextResponse.json({ error: "No connected account" }, { status: 400 });
    }

    // Delete the Express account from Stripe
    const stripe = getStripe();
    try {
      await stripe.accounts.del(userData.stripeConnectId);
    } catch {
      // Account may already be deleted, continue cleanup
    }

    // Remove from user data + unsync referral code
    delete userData.stripeConnectId;
    delete userData.payoutsEnabled;
    await updateUserData(session.user.name, userData);
    await syncReferralCode(session.user.name, null);

    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error("Stripe Connect disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
