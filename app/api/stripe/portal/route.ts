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

    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, session.user.name));

    if (subs.length === 0 || !subs[0].stripeCustomerId) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    const stripe = getStripe();
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subs[0].stripeCustomerId,
      return_url: `${origin}/settings?tab=subscription`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
