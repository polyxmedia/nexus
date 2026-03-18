import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// GET active subscription tiers (public - no auth required)
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`public:tiers:${ip}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
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
    }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ tiers: [] });
  }
}
