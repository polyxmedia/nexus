import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
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

const DEFAULT_TIERS = [
  {
    name: "Analyst",
    price: 15000,
    interval: "month",
    features: [
      "Signal detection engine",
      "50,000 AI credits/month",
      "Daily thesis generation",
      "Prediction tracking",
      "War Room with OSINT",
      "Game theory scenarios",
      "Calendar intelligence",
      "Timeline & graph analysis",
      "Email alerts",
    ],
    limits: {
      chatMessages: -1,
      monthlyCredits: 50000,
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
    price: 75000,
    interval: "month",
    features: [
      "Everything in Analyst",
      "250,000 AI credits/month",
      "Trading broker integration",
      "On-chain analytics & GEX",
      "GPR decomposition & BOCPD",
      "Short interest & options flow",
      "Shipping & dark fleet intel",
      "Custom signal layers",
      "Portfolio risk analytics",
      "Monte Carlo simulation",
      "Congressional trading signals",
      "Prediction markets divergence",
      "API access",
    ],
    limits: {
      chatMessages: -1,
      monthlyCredits: 250000,
      warRoomAccess: "full",
      tradingIntegration: true,
      apiAccess: true,
      customSignalLayers: true,
    },
    highlighted: 1,
    position: 1,
  },
  {
    name: "Institution",
    price: 0,
    interval: "month",
    features: [
      "Everything in Operator",
      "Unlimited AI credits",
      "Unlimited seats",
      "Custom data integrations",
      "Dedicated infrastructure",
      "White-label option",
      "SLA guarantee",
      "Direct engineering support",
      "On-premise available",
    ],
    limits: {
      chatMessages: -1,
      monthlyCredits: -1,
      warRoomAccess: "full",
      tradingIntegration: true,
      apiAccess: true,
      customSignalLayers: true,
      unlimitedSeats: true,
      whiteLabel: true,
    },
    highlighted: 0,
    position: 2,
  },
];

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rl = rateLimit(`admin:tiers-seed:${session.user.name}`, 5, 60 * 1000);
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
