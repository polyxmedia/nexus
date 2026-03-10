import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (users.length === 0) return false;
  return JSON.parse(users[0].value).role === "admin";
}

/**
 * POST: Create or update Stripe product + price for a tier.
 * If the tier already has a stripeProductId, updates the product name.
 * Always creates a new price (Stripe prices are immutable).
 * Updates the tier record with the new Stripe IDs.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = rateLimit(`admin:stripe-sync:${session.user.name}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { tierId } = await request.json();
    if (!tierId) {
      return NextResponse.json({ error: "tierId required" }, { status: 400 });
    }

    // Fetch tier from DB
    const tiers = await db
      .select()
      .from(schema.subscriptionTiers)
      .where(eq(schema.subscriptionTiers.id, tierId));

    if (tiers.length === 0) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    const tier = tiers[0];
    const stripe = getStripe();

    // Parse features for Stripe product description
    let features: string[] = [];
    try { features = JSON.parse(tier.features || "[]"); } catch { /* empty */ }

    let productId = tier.stripeProductId;

    if (productId) {
      // Update existing product
      await stripe.products.update(productId, {
        name: `NEXUS ${tier.name}`,
        description: features.slice(0, 5).join(" / ") || `NEXUS ${tier.name} subscription`,
        active: tier.active !== 0,
      });
    } else {
      // Create new product
      const product = await stripe.products.create({
        name: `NEXUS ${tier.name}`,
        description: features.slice(0, 5).join(" / ") || `NEXUS ${tier.name} subscription`,
        active: tier.active !== 0,
      });
      productId = product.id;
    }

    // Create a new price (Stripe prices are immutable, so we always create)
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: tier.price, // already in cents
      currency: "usd",
      recurring: {
        interval: (tier.interval === "year" ? "year" : "month") as "month" | "year",
      },
      active: tier.active !== 0,
    });

    // If there was an old price, archive it
    if (tier.stripePriceId && tier.stripePriceId !== price.id) {
      try {
        await stripe.prices.update(tier.stripePriceId, { active: false });
      } catch {
        // Old price may not exist, that's fine
      }
    }

    // Update tier with new Stripe IDs
    await db
      .update(schema.subscriptionTiers)
      .set({
        stripeProductId: productId,
        stripePriceId: price.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.subscriptionTiers.id, tierId));

    return NextResponse.json({
      success: true,
      stripeProductId: productId,
      stripePriceId: price.id,
    });
  } catch (error) {
    console.error("Stripe sync error:", error);
    const message = error instanceof Error ? error.message : "Stripe sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
