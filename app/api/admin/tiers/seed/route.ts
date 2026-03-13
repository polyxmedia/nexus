import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/security/csrf";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));

  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

const DEFAULT_TIERS = [
  {
    name: "Observer",
    price: 19900, // $199/mo in cents
    interval: "month",
    features: [
      "Signal detection engine",
      "Daily thesis generation",
      "Market sentiment analysis",
      "Prediction tracking with Brier scores",
      "War Room with OSINT feeds",
      "Calendar intelligence",
      "Email alerts",
    ],
    limits: {
      chatMessages: -1,
      monthlyCredits: 30000,
      warRoomAccess: "full",
      tradingIntegration: false,
      apiAccess: false,
      customSignalLayers: false,
    },
    highlighted: 0,
    position: 0,
  },
  {
    name: "Operator",
    price: 59900, // $599/mo in cents
    interval: "month",
    features: [
      "Everything in Observer",
      "Game theory scenarios",
      "Vessel tracking & dark fleet intel",
      "Monte Carlo simulation",
      "Prediction engine with full calibration",
      "Portfolio risk analytics",
      "GEX, BOCPD & regime detection",
      "Short interest & options flow",
      "On-chain analytics",
      "Congressional trading signals",
    ],
    limits: {
      chatMessages: -1,
      monthlyCredits: 200000,
      warRoomAccess: "full",
      tradingIntegration: true,
      apiAccess: false,
      customSignalLayers: true,
    },
    highlighted: 1,
    position: 1,
  },
  {
    name: "Institution",
    price: 99900, // $999/mo in cents
    interval: "month",
    features: [
      "Everything in Operator",
      "API access",
      "White-label briefings",
      "PDF intelligence exports",
      "Unlimited AI credits",
      "Custom data integrations",
      "Priority support",
    ],
    limits: {
      chatMessages: -1,
      monthlyCredits: -1,
      warRoomAccess: "full",
      tradingIntegration: true,
      apiAccess: true,
      customSignalLayers: true,
    },
    highlighted: 0,
    position: 2,
  },
];

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = await rateLimit(`admin:tiers-seed:${session.user.name}`, 5, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const existing = await db.select().from(schema.subscriptionTiers);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Tiers already exist. Delete them first to re-seed." }, { status: 400 });
    }

    for (const tier of DEFAULT_TIERS) {
      await db.insert(schema.subscriptionTiers).values({
        name: tier.name,
        price: tier.price,
        interval: tier.interval,
        features: JSON.stringify(tier.features),
        limits: JSON.stringify(tier.limits),
        highlighted: tier.highlighted,
        position: tier.position,
        active: 1,
      });
    }

    return NextResponse.json({ success: true, count: DEFAULT_TIERS.length });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed tiers" }, { status: 500 });
  }
}
