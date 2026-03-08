import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));

  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

// GET all tiers — requires auth (not admin, tiers are shown to logged-in users)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tiers = await db
      .select()
      .from(schema.subscriptionTiers)
      .orderBy(schema.subscriptionTiers.position);

    return NextResponse.json(tiers);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

// POST create/update tier
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, stripePriceId, stripeProductId, price, interval, features, limits, highlighted, position, active } = body;

    if (id) {
      // Update existing
      await db
        .update(schema.subscriptionTiers)
        .set({
          name,
          stripePriceId: stripePriceId || null,
          stripeProductId: stripeProductId || null,
          price,
          interval: interval || "month",
          features: JSON.stringify(features),
          limits: JSON.stringify(limits),
          highlighted: highlighted ? 1 : 0,
          position: position ?? 0,
          active: active !== undefined ? (active ? 1 : 0) : 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.subscriptionTiers.id, id));

      return NextResponse.json({ success: true });
    } else {
      // Create new
      const result = await db.insert(schema.subscriptionTiers).values({
        name,
        stripePriceId: stripePriceId || null,
        stripeProductId: stripeProductId || null,
        price,
        interval: interval || "month",
        features: JSON.stringify(features),
        limits: JSON.stringify(limits),
        highlighted: highlighted ? 1 : 0,
        position: position ?? 0,
        active: active !== undefined ? (active ? 1 : 0) : 1,
      }).returning();

      return NextResponse.json(result[0]);
    }
  } catch (error) {
    console.error("Tier save error:", error);
    return NextResponse.json({ error: "Failed to save tier" }, { status: 500 });
  }
}

// DELETE tier
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await request.json();
    await db
      .delete(schema.subscriptionTiers)
      .where(eq(schema.subscriptionTiers.id, id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete tier" }, { status: 500 });
  }
}
