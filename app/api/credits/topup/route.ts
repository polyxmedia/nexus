import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { packId, embedded } = body;
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
    customerId = existingSubs[0].stripeCustomerId;
  }

  const origin = request.headers.get("origin") || "http://localhost:3000";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      ...(embedded
        ? { ui_mode: "embedded", return_url: `${origin}/settings?tab=credits&status=topup_success` }
        : { success_url: `${origin}/settings?tab=credits&status=topup_success`, cancel_url: `${origin}/settings?tab=credits` }
      ),
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pack.priceCents,
            product_data: {
              name: `Nexus Credit Top-Up: ${pack.label}`,
              description: `${pack.credits.toLocaleString()} AI credits for your Nexus account`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        type: "credit_topup",
        packId: pack.id,
        credits: String(pack.credits),
      },
    });

    if (embedded) {
      return NextResponse.json({ clientSecret: checkoutSession.client_secret });
    }
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Credit top-up checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
