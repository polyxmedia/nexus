import { NextResponse } from "next/server";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import type Stripe from "stripe";

// ── Referral Commission Logic ──

async function handleReferralOnSubscription(userId: string, tierId: number, amountPaid?: number) {
  try {
    const fullUserId = `user:${userId}`;

    // Check if this user was referred
    const referralRows = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.referredUserId, fullUserId));

    if (referralRows.length === 0) return;

    const referral = referralRows[0];

    // Update referral status to subscribed
    if (referral.status === "signed_up") {
      await db
        .update(schema.referrals)
        .set({
          status: "subscribed",
          subscribedAt: new Date().toISOString(),
          subscriptionTierId: tierId,
        })
        .where(eq(schema.referrals.id, referral.id));
    }

    // Get the referrer's commission rate
    const codeRows = await db
      .select()
      .from(schema.referralCodes)
      .where(eq(schema.referralCodes.id, referral.referralCodeId));

    if (codeRows.length === 0 || !codeRows[0].isActive) return;

    const commissionRate = codeRows[0].commissionRate;

    // Get the tier price if amount not provided
    let paymentAmount = amountPaid;
    if (!paymentAmount) {
      const tiers = await db
        .select()
        .from(schema.subscriptionTiers)
        .where(eq(schema.subscriptionTiers.id, tierId));
      // Tier price is in dollars, commissions in cents
      paymentAmount = tiers.length > 0 ? Math.round(tiers[0].price * 100) : 0;
    }

    if (paymentAmount <= 0) return;

    const commissionAmount = Math.round(paymentAmount * commissionRate);
    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

    await db.insert(schema.commissions).values({
      referralId: referral.id,
      referrerId: referral.referrerId,
      amount: commissionAmount,
      currency: "usd",
      status: "pending",
      periodStart,
      periodEnd,
    });
  } catch (err) {
    console.error("Referral commission error:", err);
    // Non-blocking: don't fail the webhook
  }
}

async function handleReferralChurn(customerId: string) {
  try {
    // Find the subscription to get the userId
    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.stripeCustomerId, customerId));

    if (subs.length === 0) return;

    const userId = subs[0].userId;

    // Update referral status to churned
    await db
      .update(schema.referrals)
      .set({ status: "churned" })
      .where(
        and(
          eq(schema.referrals.referredUserId, userId),
          eq(schema.referrals.status, "subscribed")
        )
      );
  } catch (err) {
    console.error("Referral churn tracking error:", err);
  }
}

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

        // Track referral commission on new subscription
        await handleReferralOnSubscription(userId, parseInt(tierId));
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

        // Mark referral as churned
        await handleReferralChurn(customerId);
        break;
      }

      case "invoice.paid": {
        // Recurring payment: create commission for referred users
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find subscription to get userId and tierId
        const subRows = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (subRows.length > 0 && subRows[0].status === "active") {
          const username = subRows[0].userId.replace("user:", "");
          const amountPaid = invoice.amount_paid; // in cents
          await handleReferralOnSubscription(username, subRows[0].tierId, amountPaid);
        }
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
