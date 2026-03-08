import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tierId, embedded } = await request.json();
    if (!tierId) {
      return NextResponse.json({ error: "Tier ID required" }, { status: 400 });
    }

    const tiers = await db
      .select()
      .from(schema.subscriptionTiers)
      .where(eq(schema.subscriptionTiers.id, tierId));

    if (tiers.length === 0 || !tiers[0].stripePriceId) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const tier = tiers[0];
    const stripe = getStripe();
    const userId = session.user.name;

    // Check for existing Stripe customer
    const existingSubs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId));

    let customerId: string | undefined;
    if (existingSubs.length > 0 && existingSubs[0].stripeCustomerId) {
      customerId = existingSubs[0].stripeCustomerId;
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : `${userId}@nexus`,
      line_items: [{ price: tier.stripePriceId, quantity: 1 }],
      ...(embedded
        ? {
            ui_mode: "embedded",
            return_url: `${origin}/settings?tab=subscription&status=success`,
          }
        : {
            success_url: `${origin}/settings?tab=subscription&status=success`,
            cancel_url: `${origin}/settings?tab=subscription&status=canceled`,
          }),
      metadata: {
        userId,
        tierId: String(tierId),
      },
    });

    if (embedded) {
      return NextResponse.json({ clientSecret: checkoutSession.client_secret });
    }
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
