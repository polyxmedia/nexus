export const maxDuration = 60;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

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

    if (tiers.length === 0) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    let tier = tiers[0];
    const stripe = getStripe();

    // Auto-create Stripe product + price if not yet synced
    if (!tier.stripePriceId && tier.price > 0) {
      try {
        let features: string[] = [];
        try { features = JSON.parse(tier.features || "[]"); } catch { /* empty */ }

        let productId = tier.stripeProductId;
        if (!productId) {
          const product = await stripe.products.create({
            name: `NEXUS ${tier.name}`,
            description: features.slice(0, 5).join(" / ") || `NEXUS ${tier.name} subscription`,
          });
          productId = product.id;
        }

        const price = await stripe.prices.create({
          product: productId,
          unit_amount: tier.price,
          currency: "usd",
          recurring: {
            interval: (tier.interval === "year" ? "year" : "month") as "month" | "year",
          },
        });

        await db
          .update(schema.subscriptionTiers)
          .set({ stripeProductId: productId, stripePriceId: price.id })
          .where(eq(schema.subscriptionTiers.id, tierId));

        tier = { ...tier, stripeProductId: productId, stripePriceId: price.id };
      } catch (syncErr) {
        console.error("Auto Stripe sync failed:", syncErr);
        return NextResponse.json({ error: "Payment setup incomplete. Please contact support." }, { status: 500 });
      }
    }

    if (!tier.stripePriceId) {
      return NextResponse.json({ error: "This tier is not available for purchase" }, { status: 400 });
    }
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

    // Cancel any existing incomplete/past_due subscriptions for this customer
    // to prevent orphaned subs from interfering
    const existingStripeSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
    });
    await Promise.all(existingStripeSubs.data.map((s) => stripe.subscriptions.cancel(s.id)));

    // Check if user has ever had a completed subscription (no trial for returning users)
    const hadRealSub = existingSubs.length > 0
      && existingSubs[0].stripeSubscriptionId
      && existingSubs[0].stripeSubscriptionId.length > 0
      && !existingSubs[0].stripeSubscriptionId.startsWith("comped_");

    // Create subscription with incomplete payment so Elements can confirm it
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: tier.stripePriceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      ...(!hadRealSub && { trial_period_days: 2 }),
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
      metadata: {
        userId,
        tierId: String(tierId),
      },
    });

    // Persist Stripe customer + subscription IDs immediately so portal works right away
    if (existingSubs.length > 0) {
      await db.update(schema.subscriptions)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.userId, userId));
    } else {
      await db.insert(schema.subscriptions).values({
        userId,
        tierId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Extract clientSecret from the subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subAny = subscription as any;
    let clientSecret: string | null = null;
    let type: "payment" | "setup" = "payment";

    if (subAny.pending_setup_intent?.client_secret) {
      clientSecret = subAny.pending_setup_intent.client_secret;
      type = "setup";
    } else if (subAny.latest_invoice?.payment_intent?.client_secret) {
      clientSecret = subAny.latest_invoice.payment_intent.client_secret;
      type = "payment";
    }

    // Fallback: if subscription has an invoice but no expanded PI, fetch the invoice directly
    if (!clientSecret && subAny.latest_invoice?.id) {
      const invoice = await stripe.invoices.retrieve(subAny.latest_invoice.id, {
        expand: ["payment_intent"],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pi = (invoice as any).payment_intent;
      if (pi?.client_secret) {
        clientSecret = pi.client_secret;
        type = "payment";
      }
    }

    // Final fallback: create a standalone SetupIntent to collect payment method
    if (!clientSecret) {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        metadata: {
          subscriptionId: subscription.id,
          userId,
          tierId: String(tierId),
        },
      });
      if (!setupIntent.client_secret) {
        return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
      }
      clientSecret = setupIntent.client_secret;
      type = "setup";
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
