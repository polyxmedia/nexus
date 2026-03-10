import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
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

// GET all tiers — requires auth (not admin, tiers are shown to logged-in users)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`admin:tiers:get:${session.user.name}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

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
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = await rateLimit(`admin:tiers:post:${session.user.name}`, 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
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
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = await rateLimit(`admin:tiers:delete:${session.user.name}`, 20, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
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
