import { NextResponse } from "next/server";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tierId = session.metadata?.tierId;

        if (!userId || !tierId) break;

        // Upsert subscription record
        const existing = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.userId, userId));

        if (existing.length > 0) {
          await db
            .update(schema.subscriptions)
            .set({
              tierId: parseInt(tierId),
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              status: "active",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.subscriptions.userId, userId));
        } else {
          await db.insert(schema.subscriptions).values({
            userId,
            tierId: parseInt(tierId),
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            status: "active",
          });
        }

        // Update user role based on tier
        const tiers = await db
          .select()
          .from(schema.subscriptionTiers)
          .where(eq(schema.subscriptionTiers.id, parseInt(tierId)));

        if (tiers.length > 0) {
          const userSettings = await db
            .select()
            .from(schema.settings)
            .where(eq(schema.settings.key, `user:${userId}`));

          if (userSettings.length > 0) {
            const userData = JSON.parse(userSettings[0].value);
            userData.tier = tiers[0].name.toLowerCase();
            await db
              .update(schema.settings)
              .set({ value: JSON.stringify(userData) })
              .where(eq(schema.settings.key, `user:${userId}`));
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const existing = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (existing.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subAny = sub as any;
          await db
            .update(schema.subscriptions)
            .set({
              status: sub.status,
              currentPeriodStart: new Date((subAny.current_period_start || 0) * 1000).toISOString(),
              currentPeriodEnd: new Date((subAny.current_period_end || 0) * 1000).toISOString(),
              cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await db
          .update(schema.subscriptions)
          .set({
            status: "canceled",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await db
          .update(schema.subscriptions)
          .set({
            status: "past_due",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        break;
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
