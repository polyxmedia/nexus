import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { validateOrigin } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/rate-limit";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

// GET - Fetch Stripe transactions for a user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = await rateLimit(`admin:transactions:${session.user.name}`, 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { username } = await params;

    // Get user's Stripe customer ID from subscriptions
    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, username));

    const stripeCustomerId = subs[0]?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json({ transactions: [], message: "No Stripe customer found for this user" });
    }

    const stripe = getStripe();

    // Fetch all Stripe data in parallel
    const [paymentIntents, invoices, charges] = await Promise.all([
      stripe.paymentIntents.list({ customer: stripeCustomerId, limit: 50 }),
      stripe.invoices.list({ customer: stripeCustomerId, limit: 50 }),
      stripe.charges.list({ customer: stripeCustomerId, limit: 100 }),
    ]);

    const refundMap = new Map<string, { amount: number; status: string; created: number }>();
    for (const charge of charges.data) {
      if (charge.amount_refunded > 0) {
        refundMap.set(charge.id, {
          amount: charge.amount_refunded,
          status: charge.refunded ? "full" : "partial",
          created: charge.created,
        });
      }
    }

    // Build unified transaction list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions: any[] = invoices.data.map((_inv) => {
      // Cast to any to handle Stripe SDK type changes across versions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inv = _inv as any;
      const chargeId = typeof inv.charge === "string" ? inv.charge : inv.charge?.id;
      const piField = inv.payment_intent;
      const paymentIntentId = typeof piField === "string" ? piField : piField?.id || null;
      const refund = chargeId ? refundMap.get(chargeId) : null;

      return {
        id: inv.id,
        type: "invoice",
        amount: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        description: inv.lines?.data?.[0]?.description || "Subscription payment",
        created: inv.created,
        periodStart: inv.period_start,
        periodEnd: inv.period_end,
        invoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
        chargeId: chargeId || null,
        paymentIntentId,
        refunded: refund ? refund.status : null,
        refundedAmount: refund ? refund.amount : 0,
      };
    });

    // Add one-off payment intents that aren't tied to invoices
    const invoicePaymentIntents = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoices.data.map((inv) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const piField = (inv as any).payment_intent;
        return typeof piField === "string" ? piField : piField?.id;
      }).filter(Boolean)
    );

    for (const pi of paymentIntents.data) {
      if (!invoicePaymentIntents.has(pi.id) && pi.status === "succeeded") {
        const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
        const refund = chargeId ? refundMap.get(chargeId) : null;

        transactions.push({
          id: pi.id,
          type: "payment",
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          description: pi.description || pi.metadata?.type || "One-time payment",
          created: pi.created,
          periodStart: null,
          periodEnd: null,
          invoiceUrl: null,
          invoicePdf: null,
          chargeId: chargeId || null,
          paymentIntentId: pi.id,
          refunded: refund ? refund.status : null,
          refundedAmount: refund ? refund.amount : 0,
        });
      }
    }

    // Sort by date descending
    transactions.sort((a, b) => b.created - a.created);

    const totalPaid = transactions.reduce((sum: number, t: { status: string; amount: number }) =>
      sum + (t.status === "paid" || t.status === "succeeded" ? t.amount : 0), 0);
    const totalRefunded = transactions.reduce((sum: number, t: { refundedAmount: number }) =>
      sum + t.refundedAmount, 0);

    return NextResponse.json({
      transactions,
      stripeCustomerId,
      totalPaid,
      totalRefunded,
    });
  } catch (error) {
    console.error("Transaction fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

// POST - Issue a refund
export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = await rateLimit(`admin:refund:${session.user.name}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { username } = await params;
    const body = await request.json();
    const { chargeId, paymentIntentId, amount, reason } = body;

    if (!chargeId && !paymentIntentId) {
      return NextResponse.json({ error: "chargeId or paymentIntentId is required" }, { status: 400 });
    }

    if (amount !== undefined && (!Number.isInteger(amount) || amount <= 0)) {
      return NextResponse.json({ error: "Amount must be a positive integer (in cents)" }, { status: 400 });
    }

    const stripe = getStripe();

    const refundParams: {
      reason?: "duplicate" | "fraudulent" | "requested_by_customer";
      amount?: number;
      charge?: string;
      payment_intent?: string;
    } = {
      reason: reason === "duplicate" ? "duplicate" : reason === "fraudulent" ? "fraudulent" : "requested_by_customer",
    };

    if (amount) {
      refundParams.amount = amount;
    }

    if (chargeId) {
      refundParams.charge = chargeId;
    } else {
      refundParams.payment_intent = paymentIntentId;
    }

    const refund = await stripe.refunds.create(refundParams);

    console.log(`[ADMIN REFUND] Admin ${session.user.name} refunded ${amount || "full"} for user ${username}, refund ID: ${refund.id}`);

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error) {
    console.error("Refund error:", error);
    const message = error instanceof Error ? error.message : "Failed to process refund";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
