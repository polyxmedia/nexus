import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getIGClient, checkDuplicate, type IGDealConfirmation } from "@/lib/ig/client";
import { createDedupeHash } from "@/lib/utils";
import { requireTier } from "@/lib/auth/require-tier";
import { rateLimit } from "@/lib/rate-limit";

// GET — list working orders
export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ig = await getIGClient();
    if (!ig) {
      return NextResponse.json({ error: "IG Markets not configured." }, { status: 400 });
    }

    const data = await ig.client.getWorkingOrders();

    const orders = data.workingOrders.map(o => ({
      dealId: o.workingOrderData.dealId,
      epic: o.workingOrderData.epic,
      instrumentName: o.marketData.instrumentName,
      direction: o.workingOrderData.direction,
      size: o.workingOrderData.orderSize,
      level: o.workingOrderData.orderLevel,
      type: o.workingOrderData.orderType,
      timeInForce: o.workingOrderData.timeInForce,
      goodTillDate: o.workingOrderData.goodTillDate,
      createdDate: o.workingOrderData.createdDateUTC,
      currency: o.workingOrderData.currencyCode,
      bid: o.marketData.bid,
      offer: o.marketData.offer,
      marketStatus: o.marketData.marketStatus,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — open a position
export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = session.user.name;

  try {
    const body = await request.json();
    const { epic, size, direction, orderType, currencyCode, limitDistance, stopDistance, signalId, predictionId } = body;

    if (!epic || !size || !direction) {
      return NextResponse.json({ error: "epic, size, and direction are required" }, { status: 400 });
    }

    // Rate limit: 30 orders per hour
    const rl = rateLimit(`trading:${username}`, 30, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 orders per hour." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // Dedup
    const hash = createDedupeHash(epic, size, orderType || "MARKET", direction);
    if (checkDuplicate(hash)) {
      return NextResponse.json({ error: "Duplicate order detected, please wait before retrying" }, { status: 409 });
    }

    // Risk controls
    const maxSizeRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "max_order_size"));
    if (maxSizeRows.length > 0) {
      const maxSize = parseFloat(maxSizeRows[0].value);
      if (size > maxSize) {
        return NextResponse.json({ error: `Order size ${size} exceeds max order size of ${maxSize}` }, { status: 400 });
      }
    }

    const ig = await getIGClient();
    if (!ig) {
      return NextResponse.json({ error: "IG Markets not configured." }, { status: 400 });
    }

    const dealResult = await ig.client.openPosition({
      epic,
      direction,
      size,
      orderType: orderType || "MARKET",
      currencyCode: currencyCode || "GBP",
      limitDistance: limitDistance || undefined,
      stopDistance: stopDistance || undefined,
    });

    // Get deal confirmation
    let confirmation: IGDealConfirmation | null = null;
    try {
      confirmation = await ig.client.getDealConfirmation(dealResult.dealReference);
    } catch {
      // Non-critical, continue
    }

    // Record in trades table
    const trade = await db
      .insert(schema.trades)
      .values({
        userId: username,
        signalId: signalId || null,
        predictionId: predictionId || null,
        ticker: epic,
        direction,
        orderType: orderType || "MARKET",
        quantity: size,
        limitPrice: null,
        stopPrice: null,
        t212OrderId: confirmation?.dealId || dealResult.dealReference,
        status: confirmation?.dealStatus === "ACCEPTED" ? "filled" : "pending",
        environment: ig.environment,
        dedupeHash: hash,
      })
      .returning();

    return NextResponse.json({ trade, igResult: confirmation || dealResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — close position or cancel working order
export async function DELETE(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("dealId");
    const type = searchParams.get("type") || "position"; // "position" or "order"

    if (!dealId) {
      return NextResponse.json({ error: "dealId query parameter is required" }, { status: 400 });
    }

    const ig = await getIGClient();
    if (!ig) {
      return NextResponse.json({ error: "IG Markets not configured." }, { status: 400 });
    }

    if (type === "order") {
      const result = await ig.client.deleteWorkingOrder(dealId);
      return NextResponse.json({ success: true, ...result });
    }

    // For positions, we need direction and size from existing position data
    const direction = searchParams.get("direction") as "BUY" | "SELL";
    const size = parseFloat(searchParams.get("size") || "0");

    if (!direction || !size) {
      return NextResponse.json({ error: "direction and size are required to close a position" }, { status: 400 });
    }

    // To close: sell if long, buy if short
    const closeDirection = direction === "BUY" ? "SELL" : "BUY";
    const result = await ig.client.closePosition(dealId, closeDirection, size);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
