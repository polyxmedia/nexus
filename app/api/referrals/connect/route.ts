import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

// GET: Get Stripe Connect onboarding link or account status
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = `user:${session.user.name}`;
  const stripe = getStripe();

  try {
    const codes = await db
      .select()
      .from(schema.referralCodes)
      .where(eq(schema.referralCodes.userId, userId));

    if (codes.length === 0) {
      return NextResponse.json({ error: "No referral code found" }, { status: 404 });
    }

    const code = codes[0];
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;

    // If they already have a Connect account, check its status
    if (code.stripeConnectId) {
      const account = await stripe.accounts.retrieve(code.stripeConnectId);
      const payoutsEnabled = account.payouts_enabled;
      const detailsSubmitted = account.details_submitted;

      if (payoutsEnabled) {
        return NextResponse.json({
          status: "active",
          payoutsEnabled: true,
          detailsSubmitted,
          accountId: code.stripeConnectId,
        });
      }

      // Account exists but onboarding incomplete - generate new link
      const accountLink = await stripe.accountLinks.create({
        account: code.stripeConnectId,
        refresh_url: `${baseUrl}/referrals?connect=refresh`,
        return_url: `${baseUrl}/referrals?connect=complete`,
        type: "account_onboarding",
      });

      return NextResponse.json({
        status: "incomplete",
        payoutsEnabled: false,
        detailsSubmitted,
        onboardingUrl: accountLink.url,
      });
    }

    // No Connect account yet - create one
    // Get user email for pre-filling
    const userRows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, userId));
    const userData = userRows[0] ? JSON.parse(userRows[0].value) : {};

    const account = await stripe.accounts.create({
      type: "express",
      email: userData.email || undefined,
      metadata: {
        referralCodeId: String(code.id),
        userId,
      },
      capabilities: {
        transfers: { requested: true },
      },
    });

    // Save the Connect account ID
    await db
      .update(schema.referralCodes)
      .set({ stripeConnectId: account.id })
      .where(eq(schema.referralCodes.id, code.id));

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/referrals?connect=refresh`,
      return_url: `${baseUrl}/referrals?connect=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      status: "created",
      payoutsEnabled: false,
      detailsSubmitted: false,
      onboardingUrl: accountLink.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe Connect error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Generate a Stripe Connect dashboard link (for existing accounts)
export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = `user:${session.user.name}`;
  const stripe = getStripe();
  const body = await request.json();

  try {
    const codes = await db
      .select()
      .from(schema.referralCodes)
      .where(eq(schema.referralCodes.userId, userId));

    if (codes.length === 0 || !codes[0].stripeConnectId) {
      return NextResponse.json({ error: "No connected account" }, { status: 404 });
    }

    if (body.action === "dashboard") {
      const loginLink = await stripe.accounts.createLoginLink(codes[0].stripeConnectId);
      return NextResponse.json({ url: loginLink.url });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
