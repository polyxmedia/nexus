import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tierId } = await request.json();
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

    // Get user's email from settings
    let userEmail: string | undefined;
    try {
      const userRows = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, `user:${userId}`));
      if (userRows[0]?.value) {
        const userData = JSON.parse(userRows[0].value);
        if (userData.email) userEmail = userData.email;
      }
    } catch {
      // Fall through
    }

    // Get or create Stripe customer
    const existingSubs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId));

    let customerId: string | undefined;
    if (existingSubs.length > 0 && existingSubs[0].stripeCustomerId) {
      const cid = existingSubs[0].stripeCustomerId;
      if (cid.startsWith("cus_") && !cid.startsWith("cus_manual") && !cid.startsWith("cus_comped")) {
        // Verify customer exists in Stripe
        try {
          await stripe.customers.retrieve(cid);
          customerId = cid;
        } catch {
          // Customer doesn't exist, create new
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        ...(userEmail ? { email: userEmail } : {}),
        metadata: { nexusUserId: userId },
      });
      customerId = customer.id;
    }

    // Check if user has ever had a real subscription (no trial for returning users)
    const hadSub = existingSubs.length > 0 && existingSubs[0].stripeSubscriptionId &&
      !existingSubs[0].stripeSubscriptionId.startsWith("comped_");

    // Create subscription with incomplete payment so Elements can confirm it
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: tier.stripePriceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      ...(!hadSub && { trial_period_days: 2 }),
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
      metadata: {
        userId,
        tierId: String(tierId),
      },
    });

    // With trial: no PaymentIntent (invoice is $0), use SetupIntent instead
    // Without trial: PaymentIntent on the latest invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subAny = subscription as any;
    let clientSecret: string | null = null;
    let type: "payment" | "setup" = "payment";

    if (subAny.pending_setup_intent?.client_secret) {
      // Trial subscription: SetupIntent to collect payment method for later
      clientSecret = subAny.pending_setup_intent.client_secret;
      type = "setup";
    } else if (subAny.latest_invoice?.payment_intent?.client_secret) {
      // Immediate payment subscription
      clientSecret = subAny.latest_invoice.payment_intent.client_secret;
      type = "payment";
    }

    if (!clientSecret) {
      return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret,
      type,
      subscriptionId: subscription.id,
      customerId,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
