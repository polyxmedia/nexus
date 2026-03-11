import { NextResponse } from "next/server";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { invalidateTierCache } from "@/lib/auth/require-tier";
import type Stripe from "stripe";
import { sendEmail, notifyAdmin } from "@/lib/email";
import {
  subscriptionActiveEmail,
  subscriptionCanceledEmail,
  subscriptionPausedEmail,
  subscriptionResumedEmail,
  trialEndingEmail,
  paymentFailedEmail,
  paymentActionRequiredEmail,
  invoiceUpcomingEmail,
  invoiceOverdueEmail,
  adminNewSubscriptionEmail,
  adminSubscriptionCanceledEmail,
  adminPaymentFailedEmail,
} from "@/lib/email/templates";

// ── Helpers ──

async function getUserEmail(userId: string): Promise<string | null> {
  const key = userId.startsWith("user:") ? userId : `user:${userId}`;
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  if (rows.length === 0) return null;
  try {
    const data = JSON.parse(rows[0].value);
    // Skip blocked users — they should not receive any emails
    if (data.blocked) return null;
    return data.email || null;
  } catch {
    return null;
  }
}

// ── Tier helpers ──

async function setUserTier(userId: string, tierName: string) {
  const key = userId.startsWith("user:") ? userId : `user:${userId}`;
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  if (rows.length > 0) {
    const data = JSON.parse(rows[0].value);
    data.tier = tierName;
    await db.update(schema.settings).set({ value: JSON.stringify(data) }).where(eq(schema.settings.key, key));
    invalidateTierCache(userId.replace(/^user:/, ""));
  }
}

async function getTierNameById(tierId: number): Promise<string | null> {
  const tiers = await db.select().from(schema.subscriptionTiers).where(eq(schema.subscriptionTiers.id, tierId));
  return tiers.length > 0 ? tiers[0].name : null;
}

// ── Referral Commission Logic ──

async function handleReferralOnSubscription(userId: string, tierId: number, amountPaid: number) {
  try {
    // Only create commissions for actual payments
    if (!amountPaid || amountPaid <= 0) return;

    const fullUserId = `user:${userId}`;

    // Check if this user was referred
    const referralRows = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.referredUserId, fullUserId));

    if (referralRows.length === 0) return;

    const referral = referralRows[0];

    // Update referral status to subscribed (only on first real payment)
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
    const paymentAmount = amountPaid;

    const commissionAmount = Math.round(paymentAmount * commissionRate);
    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

    const referrerCode = codeRows[0];
    let commissionStatus = "pending";
    let paymentMethod: string | null = null;
    let paymentReference: string | null = null;
    let paidAt: string | null = null;

    // Auto-payout via Stripe Connect if referrer has a connected account
    if (referrerCode.stripeConnectId && commissionAmount > 0) {
      try {
        const stripe = getStripe();
        // Verify the connected account can receive payouts
        const account = await stripe.accounts.retrieve(referrerCode.stripeConnectId);
        if (account.payouts_enabled) {
          const transfer = await stripe.transfers.create({
            amount: commissionAmount,
            currency: "usd",
            destination: referrerCode.stripeConnectId,
            description: `Referral commission: ${referral.referredUserId.replace("user:", "")} subscription`,
            metadata: {
              referralId: String(referral.id),
              referrerId: referral.referrerId,
              period: periodStart,
            },
          });
          commissionStatus = "paid";
          paymentMethod = "stripe_connect";
          paymentReference = transfer.id;
          paidAt = now.toISOString();
        }
      } catch (transferErr) {
        console.error("Stripe Connect auto-payout failed, commission stays pending:", transferErr);
        // Falls back to pending - referrer can request manual payout
      }
    }

    await db.insert(schema.commissions).values({
      referralId: referral.id,
      referrerId: referral.referrerId,
      amount: commissionAmount,
      currency: "usd",
      status: commissionStatus,
      paymentMethod,
      paymentReference,
      paidAt,
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
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        // Handle credit top-up via PaymentIntent (Elements flow)
        if (pi.metadata?.type === "credit_topup") {
          const userId = pi.metadata.userId;
          const credits = parseInt(pi.metadata.credits || "0");
          if (userId && credits > 0) {
            const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
            const balRows = await db
              .select()
              .from(schema.creditBalances)
              .where(eq(schema.creditBalances.userId, userId));

            if (balRows.length > 0) {
              await db
                .update(schema.creditBalances)
                .set({
                  creditsGranted: balRows[0].creditsGranted + credits,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(schema.creditBalances.userId, userId));
            } else {
              await db.insert(schema.creditBalances).values({
                userId,
                period,
                creditsGranted: credits,
                creditsUsed: 0,
              });
            }

            await db.insert(schema.creditLedger).values({
              userId,
              amount: credits,
              balanceAfter: (balRows.length > 0 ? balRows[0].creditsGranted - balRows[0].creditsUsed : 0) + credits,
              reason: "topup",
              model: "stripe",
              inputTokens: 0,
              outputTokens: 0,
              sessionId: pi.id,
              period,
            });
          }
        }
        break;
      }

      case "setup_intent.succeeded": {
        // User completed payment method collection (e.g. card for trial subscription).
        // Now activate their tier since we know they have a valid payment method.
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const siCustomerId = setupIntent.customer as string;

        if (siCustomerId) {
          const siSubs = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.stripeCustomerId, siCustomerId));

          if (siSubs.length > 0 && (siSubs[0].status === "incomplete" || siSubs[0].status === "trialing")) {
            const tierName = await getTierNameById(siSubs[0].tierId);
            if (tierName) {
              await setUserTier(siSubs[0].userId, tierName.toLowerCase());
            }

            // Update status to trialing if still incomplete
            if (siSubs[0].status === "incomplete") {
              await db
                .update(schema.subscriptions)
                .set({ status: "trialing", updatedAt: new Date().toISOString() })
                .where(eq(schema.subscriptions.stripeCustomerId, siCustomerId));
            }

            // Send subscription confirmation email
            const siEmail = await getUserEmail(siSubs[0].userId);
            if (siEmail && tierName) {
              const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
              const template = subscriptionActiveEmail(
                siSubs[0].userId.replace("user:", ""),
                tierName,
                `${baseUrl}/dashboard`
              );
              sendEmail({ to: siEmail, ...template }).catch((err) =>
                console.error("Setup intent activation email failed:", err)
              );
            }

            if (tierName) {
              notifyAdmin(adminNewSubscriptionEmail(
                siSubs[0].userId.replace("user:", ""),
                tierName
              )).catch(() => {});
            }
          }
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        // Handle credit top-up (one-time payment)
        if (session.metadata?.type === "credit_topup" && userId) {
          const credits = parseInt(session.metadata.credits || "0");
          if (credits > 0) {
            const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
            const balRows = await db
              .select()
              .from(schema.creditBalances)
              .where(eq(schema.creditBalances.userId, userId));

            if (balRows.length > 0) {
              await db
                .update(schema.creditBalances)
                .set({
                  creditsGranted: balRows[0].creditsGranted + credits,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(schema.creditBalances.userId, userId));
            } else {
              await db.insert(schema.creditBalances).values({
                userId,
                period,
                creditsGranted: credits,
                creditsUsed: 0,
              });
            }

            // Log in ledger as positive entry
            await db.insert(schema.creditLedger).values({
              userId,
              amount: credits,
              balanceAfter: (balRows.length > 0 ? balRows[0].creditsGranted - balRows[0].creditsUsed : 0) + credits,
              reason: "topup",
              model: "stripe",
              inputTokens: 0,
              outputTokens: 0,
              sessionId: session.id,
              period,
            });
          }
          break;
        }

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

        // Track referral commission only on paid subscriptions (not free trials)
        const amountTotal = (session as Stripe.Checkout.Session).amount_total;
        if (amountTotal && amountTotal > 0) {
          await handleReferralOnSubscription(userId, parseInt(tierId), amountTotal);
        }

        // Send subscription confirmation email
        const email = await getUserEmail(userId);
        if (email && tiers.length > 0) {
          const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
          const template = subscriptionActiveEmail(userId, tiers[0].name, `${baseUrl}/dashboard`);
          sendEmail({ to: email, ...template }).catch((err) =>
            console.error("Subscription email failed:", err)
          );
        }

        // Notify admin of new subscription
        if (tiers.length > 0) {
          notifyAdmin(adminNewSubscriptionEmail(userId, tiers[0].name)).catch(() => {});
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
          const previousStatus = existing[0].status;

          // Don't transition from "incomplete" to "trialing" in our DB.
          // With trial_period_days, Stripe sets "trialing" immediately before the
          // user enters payment details. We keep "incomplete" until setup_intent.succeeded.
          const skipStatusSync = previousStatus === "incomplete" && sub.status === "trialing";

          await db
            .update(schema.subscriptions)
            .set({
              status: skipStatusSync ? "incomplete" : sub.status,
              currentPeriodStart: new Date((subAny.current_period_start || 0) * 1000).toISOString(),
              currentPeriodEnd: new Date((subAny.current_period_end || 0) * 1000).toISOString(),
              cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.subscriptions.stripeCustomerId, customerId));

          // When subscription transitions from incomplete to active,
          // the user has confirmed payment -- activate their tier now.
          // NOTE: Do NOT activate on incomplete → trialing. With trial_period_days,
          // Stripe sets status to "trialing" immediately before the user enters
          // payment details. The setup_intent.succeeded handler below activates
          // the tier once the user actually submits their card.
          if (
            (previousStatus === "incomplete" || previousStatus === "past_due") &&
            sub.status === "active"
          ) {
            const tierName = await getTierNameById(existing[0].tierId);
            if (tierName) {
              await setUserTier(existing[0].userId, tierName.toLowerCase());
            }

            // Send subscription confirmation email
            const activatedEmail = await getUserEmail(existing[0].userId);
            if (activatedEmail && tierName) {
              const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
              const template = subscriptionActiveEmail(
                existing[0].userId.replace("user:", ""),
                tierName,
                `${baseUrl}/dashboard`
              );
              sendEmail({ to: activatedEmail, ...template }).catch((err) =>
                console.error("Subscription activation email failed:", err)
              );
            }

            // Notify admin
            if (tierName) {
              notifyAdmin(adminNewSubscriptionEmail(
                existing[0].userId.replace("user:", ""),
                tierName
              )).catch(() => {});
            }
          }

          // When subscription is canceled or expires, downgrade to free
          if (
            (previousStatus === "active" || previousStatus === "trialing") &&
            (sub.status === "canceled" || sub.status === "unpaid")
          ) {
            await setUserTier(existing[0].userId, "free");
          }
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

        // Send cancellation email + notify admin
        const cancelSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        if (cancelSubs.length > 0) {
          const cancelUsername = cancelSubs[0].userId.replace("user:", "");
          const cancelEmail = await getUserEmail(cancelSubs[0].userId);
          if (cancelEmail) {
            const template = subscriptionCanceledEmail(cancelUsername);
            sendEmail({ to: cancelEmail, ...template }).catch((err) =>
              console.error("Cancellation email failed:", err)
            );
          }
          notifyAdmin(adminSubscriptionCanceledEmail(cancelUsername)).catch(() => {});
        }

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
          // Only create commission if actual money was paid (skip $0 trial invoices)
          if (amountPaid > 0) {
            await handleReferralOnSubscription(username, subRows[0].tierId, amountPaid);
          }
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

        // Send payment failed email + notify admin
        const failedSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        if (failedSubs.length > 0) {
          const failedUsername = failedSubs[0].userId.replace("user:", "");
          const failedEmail = await getUserEmail(failedSubs[0].userId);
          if (failedEmail) {
            const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
            const template = paymentFailedEmail(failedUsername, `${baseUrl}/settings`);
            sendEmail({ to: failedEmail, ...template }).catch((err) =>
              console.error("Payment failed email failed:", err)
            );
          }
          notifyAdmin(adminPaymentFailedEmail(failedUsername)).catch(() => {});
        }

        break;
      }

      // ── Subscription lifecycle events ──

      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Check if we already have this subscription (checkout.session.completed usually handles it)
        const createdExisting = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (createdExisting.length === 0) {
          // Subscription created outside checkout flow, sync it
          const metadata = sub.metadata || {};
          const userId = metadata.userId;
          const tierId = metadata.tierId;
          if (userId && tierId) {
            await db.insert(schema.subscriptions).values({
              userId,
              tierId: parseInt(tierId),
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              status: sub.status,
            });
            const tierName = await getTierNameById(parseInt(tierId));
            if (tierName) await setUserTier(userId, tierName.toLowerCase());
          }
        }
        break;
      }

      case "customer.subscription.resumed": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const resumedSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (resumedSubs.length > 0) {
          await db
            .update(schema.subscriptions)
            .set({
              status: "active",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.subscriptions.stripeCustomerId, customerId));

          // Restore user tier
          const tierName = await getTierNameById(resumedSubs[0].tierId);
          if (tierName) {
            await setUserTier(resumedSubs[0].userId, tierName.toLowerCase());
          }

          // Send resumed email
          const resumedEmail = await getUserEmail(resumedSubs[0].userId);
          if (resumedEmail && tierName) {
            const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
            const template = subscriptionResumedEmail(
              resumedSubs[0].userId.replace("user:", ""),
              tierName,
              `${baseUrl}/dashboard`
            );
            sendEmail({ to: resumedEmail, ...template }).catch((err) =>
              console.error("Resumed email failed:", err)
            );
          }
        }
        break;
      }

      case "customer.subscription.paused": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const pausedSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (pausedSubs.length > 0) {
          await db
            .update(schema.subscriptions)
            .set({
              status: "paused",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.subscriptions.stripeCustomerId, customerId));

          // Downgrade to free while paused
          await setUserTier(pausedSubs[0].userId, "free");

          // Send paused email
          const pausedEmail = await getUserEmail(pausedSubs[0].userId);
          if (pausedEmail) {
            const template = subscriptionPausedEmail(pausedSubs[0].userId.replace("user:", ""));
            sendEmail({ to: pausedEmail, ...template }).catch((err) =>
              console.error("Paused email failed:", err)
            );
          }
        }
        break;
      }

      case "customer.subscription.pending_update_applied": {
        // Plan change was applied (e.g. upgrade/downgrade took effect)
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const updateSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (updateSubs.length > 0) {
          // Sync the latest status
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subAny = sub as any;
          await db
            .update(schema.subscriptions)
            .set({
              status: sub.status,
              currentPeriodStart: new Date((subAny.current_period_start || 0) * 1000).toISOString(),
              currentPeriodEnd: new Date((subAny.current_period_end || 0) * 1000).toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        }
        break;
      }

      case "customer.subscription.pending_update_expired": {
        // Pending plan change expired without being applied, just log
        console.log("Subscription pending update expired:", (event.data.object as Stripe.Subscription).id);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const trialSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (trialSubs.length > 0) {
          const trialEmail = await getUserEmail(trialSubs[0].userId);
          const tierName = await getTierNameById(trialSubs[0].tierId);
          if (trialEmail && tierName) {
            const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
            const template = trialEndingEmail(
              trialSubs[0].userId.replace("user:", ""),
              tierName,
              `${baseUrl}/settings`
            );
            sendEmail({ to: trialEmail, ...template }).catch((err) =>
              console.error("Trial ending email failed:", err)
            );
          }
        }
        break;
      }

      // ── Invoice events ──

      case "invoice.payment_succeeded": {
        // Payment went through, ensure subscription is active
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (invoice.amount_paid > 0) {
          await db
            .update(schema.subscriptions)
            .set({
              status: "active",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        }
        break;
      }

      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const actionSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (actionSubs.length > 0) {
          const actionEmail = await getUserEmail(actionSubs[0].userId);
          if (actionEmail) {
            const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
            const template = paymentActionRequiredEmail(
              actionSubs[0].userId.replace("user:", ""),
              `${baseUrl}/settings`
            );
            sendEmail({ to: actionEmail, ...template }).catch((err) =>
              console.error("Payment action required email failed:", err)
            );
          }
        }
        break;
      }

      case "invoice.payment_attempt_required": {
        // Similar to payment_action_required, notify user
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const attemptSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (attemptSubs.length > 0) {
          const attemptEmail = await getUserEmail(attemptSubs[0].userId);
          if (attemptEmail) {
            const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
            const template = paymentActionRequiredEmail(
              attemptSubs[0].userId.replace("user:", ""),
              `${baseUrl}/settings`
            );
            sendEmail({ to: attemptEmail, ...template }).catch((err) =>
              console.error("Payment attempt required email failed:", err)
            );
          }
        }
        break;
      }

      case "invoice.overdue": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await db
          .update(schema.subscriptions)
          .set({
            status: "past_due",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        const overdueSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (overdueSubs.length > 0) {
          const overdueEmail = await getUserEmail(overdueSubs[0].userId);
          if (overdueEmail) {
            const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
            const template = invoiceOverdueEmail(
              overdueSubs[0].userId.replace("user:", ""),
              `${baseUrl}/settings`
            );
            sendEmail({ to: overdueEmail, ...template }).catch((err) =>
              console.error("Overdue email failed:", err)
            );
          }
        }
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const upcomingSubs = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));

        if (upcomingSubs.length > 0) {
          const upcomingEmail = await getUserEmail(upcomingSubs[0].userId);
          if (upcomingEmail) {
            const amount = invoice.amount_due
              ? `$${(invoice.amount_due / 100).toFixed(2)}`
              : "your subscription fee";
            const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
            const template = invoiceUpcomingEmail(
              upcomingSubs[0].userId.replace("user:", ""),
              amount,
              `${baseUrl}/settings`
            );
            sendEmail({ to: upcomingEmail, ...template }).catch((err) =>
              console.error("Upcoming invoice email failed:", err)
            );
          }
        }
        break;
      }

      // Informational invoice events, acknowledge without action
      case "invoice.created":
      case "invoice.deleted":
      case "invoice.finalized":
      case "invoice.sent":
      case "invoice.updated":
      case "invoice.voided":
      case "invoice.overpaid": {
        console.log(`Invoice event ${event.type}:`, (event.data.object as Stripe.Invoice).id);
        break;
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
