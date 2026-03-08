import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// GET: Admin view of all referrals and commissions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const userRows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));
  const userData = userRows[0] ? JSON.parse(userRows[0].value) : {};
  if (userData.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const codes = await db
      .select()
      .from(schema.referralCodes)
      .orderBy(desc(schema.referralCodes.createdAt));

    const allReferrals = await db
      .select()
      .from(schema.referrals)
      .orderBy(desc(schema.referrals.createdAt));

    const allCommissions = await db
      .select()
      .from(schema.commissions)
      .orderBy(desc(schema.commissions.createdAt));

    // Stats
    const totalReferrers = codes.length;
    const totalSignups = allReferrals.length;
    const totalSubscribed = allReferrals.filter(r => r.status === "subscribed").length;
    const totalPending = allCommissions.filter(c => c.status === "pending" || c.status === "approved").reduce((s, c) => s + c.amount, 0);
    const totalPaid = allCommissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);

    return NextResponse.json({
      stats: { totalReferrers, totalSignups, totalSubscribed, totalPending, totalPaid },
      codes: codes.map(c => ({
        ...c,
        userId: c.userId.replace("user:", ""),
      })),
      referrals: allReferrals.map(r => ({
        ...r,
        referrerId: r.referrerId.replace("user:", ""),
        referredUserId: r.referredUserId.replace("user:", ""),
      })),
      commissions: allCommissions.map(c => ({
        ...c,
        referrerId: c.referrerId.replace("user:", ""),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Admin actions on commissions (approve, pay, reject, update rates)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));
  const userData = userRows[0] ? JSON.parse(userRows[0].value) : {};
  if (userData.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === "approve_commission" && body.id) {
      await db
        .update(schema.commissions)
        .set({ status: "approved" })
        .where(eq(schema.commissions.id, body.id));
      return NextResponse.json({ success: true });
    }

    if (body.action === "pay_commission" && body.id) {
      await db
        .update(schema.commissions)
        .set({
          status: "paid",
          paidAt: new Date().toISOString(),
          paymentMethod: body.paymentMethod || "manual",
          paymentReference: body.paymentReference || null,
        })
        .where(eq(schema.commissions.id, body.id));
      return NextResponse.json({ success: true });
    }

    if (body.action === "reject_commission" && body.id) {
      await db
        .update(schema.commissions)
        .set({ status: "rejected", notes: body.notes || null })
        .where(eq(schema.commissions.id, body.id));
      return NextResponse.json({ success: true });
    }

    if (body.action === "set_rate" && body.codeId && body.rate !== undefined) {
      await db
        .update(schema.referralCodes)
        .set({ commissionRate: body.rate })
        .where(eq(schema.referralCodes.id, body.codeId));
      return NextResponse.json({ success: true });
    }

    if (body.action === "toggle_code" && body.codeId !== undefined) {
      const existing = await db
        .select()
        .from(schema.referralCodes)
        .where(eq(schema.referralCodes.id, body.codeId));
      if (existing.length > 0) {
        await db
          .update(schema.referralCodes)
          .set({ isActive: existing[0].isActive ? 0 : 1 })
          .where(eq(schema.referralCodes.id, body.codeId));
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
