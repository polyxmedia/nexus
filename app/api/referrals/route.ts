import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

function generateCode(username: string): string {
  const suffix = crypto.randomBytes(3).toString("hex").slice(0, 4);
  return `${username}-${suffix}`.toLowerCase();
}

// GET: Fetch referral dashboard data for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = `user:${session.user.name}`;

  try {
    // Get or create referral code
    let codes = await db
      .select()
      .from(schema.referralCodes)
      .where(eq(schema.referralCodes.userId, userId));

    if (codes.length === 0) {
      const newCodes = await db
        .insert(schema.referralCodes)
        .values({
          userId,
          code: generateCode(session.user.name),
          commissionRate: 0.20,
          createdAt: new Date().toISOString(),
        })
        .returning();
      codes = newCodes;
    }

    const code = codes[0];

    // Get referrals
    const referrals = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.referrerId, userId))
      .orderBy(desc(schema.referrals.createdAt));

    // Get commissions
    const commissionRows = await db
      .select()
      .from(schema.commissions)
      .where(eq(schema.commissions.referrerId, userId))
      .orderBy(desc(schema.commissions.createdAt));

    // Calculate stats
    const totalSignups = referrals.length;
    const totalSubscribed = referrals.filter(r => r.status === "subscribed").length;
    const conversionRate = totalSignups > 0 ? (totalSubscribed / totalSignups) * 100 : 0;
    const totalEarned = commissionRows
      .filter(c => c.status === "paid")
      .reduce((sum, c) => sum + c.amount, 0);
    const pendingEarnings = commissionRows
      .filter(c => c.status === "pending" || c.status === "approved")
      .reduce((sum, c) => sum + c.amount, 0);

    return NextResponse.json({
      code: {
        code: code.code,
        commissionRate: code.commissionRate,
        clicks: code.clicks,
        isActive: code.isActive,
      },
      stats: {
        totalSignups,
        totalSubscribed,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalEarned,
        pendingEarnings,
        totalClicks: code.clicks,
      },
      referrals: referrals.map(r => ({
        id: r.id,
        referredUser: r.referredUserId.replace("user:", ""),
        status: r.status,
        subscribedAt: r.subscribedAt,
        createdAt: r.createdAt,
      })),
      commissions: commissionRows.map(c => ({
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        status: c.status,
        periodStart: c.periodStart,
        periodEnd: c.periodEnd,
        paidAt: c.paidAt,
        paymentMethod: c.paymentMethod,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Admin actions (update commission rate, regenerate code)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = `user:${session.user.name}`;
  const body = await request.json();

  try {
    if (body.action === "regenerate") {
      const newCode = generateCode(session.user.name);
      await db
        .update(schema.referralCodes)
        .set({ code: newCode })
        .where(eq(schema.referralCodes.userId, userId));
      return NextResponse.json({ code: newCode });
    }

    if (body.action === "update_rate" && body.rate !== undefined) {
      // Admin only: check role
      const userRows = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, `user:${session.user.name}`));
      const userData = userRows[0] ? JSON.parse(userRows[0].value) : {};
      if (userData.role !== "admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }

      const targetUser = body.userId;
      if (!targetUser) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
      }

      await db
        .update(schema.referralCodes)
        .set({ commissionRate: body.rate })
        .where(eq(schema.referralCodes.userId, targetUser));

      return NextResponse.json({ success: true });
    }

    if (body.action === "payout" && body.commissionId) {
      // Admin only
      const userRows = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, `user:${session.user.name}`));
      const userData = userRows[0] ? JSON.parse(userRows[0].value) : {};
      if (userData.role !== "admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }

      await db
        .update(schema.commissions)
        .set({
          status: "paid",
          paidAt: new Date().toISOString(),
          paymentMethod: body.paymentMethod || "manual",
          paymentReference: body.paymentReference || null,
        })
        .where(eq(schema.commissions.id, body.commissionId));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
