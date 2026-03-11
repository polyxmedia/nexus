import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

/**
 * POST /api/credits/topup/confirm
 * Called by the frontend after Stripe payment confirmation.
 * Verifies the PaymentIntent status with Stripe and grants credits immediately.
 * Idempotent: checks the ledger to avoid double-granting (safe if webhook also fires).
 */
export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { paymentIntentId } = body;
  if (!paymentIntentId || typeof paymentIntentId !== "string") {
    return NextResponse.json({ error: "paymentIntentId required" }, { status: 400 });
  }

  const stripe = getStripe();

  // Verify the PaymentIntent with Stripe
  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: "Invalid payment intent" }, { status: 400 });
  }

  // Verify it belongs to this user and is a credit topup
  if (pi.metadata?.userId !== session.user.name) {
    return NextResponse.json({ error: "Payment does not belong to this user" }, { status: 403 });
  }
  if (pi.metadata?.type !== "credit_topup") {
    return NextResponse.json({ error: "Not a credit topup payment" }, { status: 400 });
  }
  if (pi.status !== "succeeded") {
    return NextResponse.json({ error: `Payment not succeeded (status: ${pi.status})` }, { status: 400 });
  }

  const userId = pi.metadata.userId;
  const credits = parseInt(pi.metadata.credits || "0");
  if (credits <= 0) {
    return NextResponse.json({ error: "Invalid credit amount" }, { status: 400 });
  }

  // Idempotency: check if this PI was already processed
  const existingLedger = await db
    .select()
    .from(schema.creditLedger)
    .where(
      and(
        eq(schema.creditLedger.userId, userId),
        eq(schema.creditLedger.sessionId, pi.id)
      )
    );

  if (existingLedger.length > 0) {
    // Already processed (by webhook or previous confirm call)
    return NextResponse.json({ success: true, credits, alreadyProcessed: true });
  }

  // Grant credits
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

  return NextResponse.json({ success: true, credits });
}
