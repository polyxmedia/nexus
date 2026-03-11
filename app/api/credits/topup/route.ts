import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

// Credit packs: amount in credits, price in cents
const CREDIT_PACKS = [
  { id: "pack_10k", credits: 10_000, priceCents: 1000, label: "10,000 credits" },
  { id: "pack_50k", credits: 50_000, priceCents: 4500, label: "50,000 credits" },
  { id: "pack_100k", credits: 100_000, priceCents: 8000, label: "100,000 credits" },
  { id: "pack_500k", credits: 500_000, priceCents: 35000, label: "500,000 credits" },
];


export async function GET() {
  return NextResponse.json(CREDIT_PACKS);
}

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { packId } = body;
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const userId = session.user.name;
  const stripe = getStripe();

  // Check for existing Stripe customer
  const existingSubs = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId));

  let customerId: string | undefined;
  if (existingSubs.length > 0 && existingSubs[0].stripeCustomerId) {
    const cid = existingSubs[0].stripeCustomerId;
    if (cid.startsWith("cus_") && !cid.startsWith("cus_manual") && !cid.startsWith("cus_comped")) {
      customerId = cid;
    }
  }

  // Create or retrieve Stripe customer
  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        metadata: { nexusUserId: userId },
      });
      customerId = customer.id;
    } catch {
      // Proceed without customer, payment still works
    }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.priceCents,
      currency: "usd",
      ...(customerId ? { customer: customerId } : {}),
      metadata: {
        userId,
        type: "credit_topup",
        packId: pack.id,
        credits: String(pack.credits),
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Credit top-up payment intent error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
