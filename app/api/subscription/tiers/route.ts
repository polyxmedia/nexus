import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET active subscription tiers (public - no auth required)
export async function GET() {
  try {
    const tiers = await db
      .select()
      .from(schema.subscriptionTiers)
      .where(eq(schema.subscriptionTiers.active, 1))
      .orderBy(schema.subscriptionTiers.position);

    return NextResponse.json({
      tiers: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        interval: t.interval,
        features: (() => { try { return JSON.parse(t.features); } catch { return []; } })(),
        highlighted: t.highlighted === 1,
      })),
    });
  } catch {
    return NextResponse.json({ tiers: [] });
  }
}
