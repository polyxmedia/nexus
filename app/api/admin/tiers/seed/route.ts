import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

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
    price: 29900,
    interval: "month",
    features: [
      "Signal detection engine",
      "AI chat analyst (100 msgs/day)",
      "Daily thesis generation",
      "Prediction tracking",
      "Narrative & sentiment tracking",
      "War Room (view only)",
      "Email alerts",
    ],
    limits: {
      chatMessages: 100,
      warRoomAccess: "view",
      tradingIntegration: false,
      apiAccess: false,
      customSignalLayers: false,
    },
    highlighted: 0,
    position: 0,
  },
  {
    name: "Operator",
    price: 99900,
    interval: "month",
    features: [
      "Everything in Analyst",
      "Unlimited AI analyst access",
      "Trading broker integration",
      "Real-time War Room + OSINT",
      "On-chain analytics & GEX",
      "GPR decomposition & BOCPD",
      "Short interest signals",
      "Shipping & dark fleet intel",
      "Custom signal layers",
      "Portfolio risk analytics",
      "Priority intelligence feeds",
      "API access",
    ],
    limits: {
      chatMessages: -1,
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
