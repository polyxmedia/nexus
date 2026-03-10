import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { manualPositions } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = `user:${session.user.name}`;
  const showClosed = req.nextUrl.searchParams.get("closed") === "true";

  try {
    const positions = await db
      .select()
      .from(manualPositions)
      .where(
        showClosed
          ? eq(manualPositions.userId, userId)
          : and(eq(manualPositions.userId, userId), isNull(manualPositions.closedAt))
      )
      .orderBy(desc(manualPositions.createdAt));

    return NextResponse.json({ positions });
  } catch (error) {
    console.error("[manual-positions] GET error:", error);
    return NextResponse.json({ positions: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ticker, name, direction, quantity, avgCost, currency, openedAt, notes } = body;

    if (!ticker?.trim() || !quantity || !avgCost) {
      return NextResponse.json(
        { error: "Ticker, quantity, and average cost are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0 || avgCost <= 0) {
      return NextResponse.json(
        { error: "Quantity and average cost must be positive" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const [position] = await db
      .insert(manualPositions)
      .values({
        userId: `user:${session.user.name}`,
        ticker: ticker.trim().toUpperCase(),
        name: name?.trim() || null,
        direction: direction === "short" ? "short" : "long",
        quantity: Number(quantity),
        avgCost: Number(avgCost),
        currency: currency?.trim().toUpperCase() || "USD",
        openedAt: openedAt || now,
        notes: notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({ position });
  } catch (error) {
    console.error("[manual-positions] POST error:", error);
    return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Position ID required" }, { status: 400 });
    }

    const userId = `user:${session.user.name}`;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(manualPositions)
      .where(and(eq(manualPositions.id, id), eq(manualPositions.userId, userId)));

    if (!existing) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (updates.ticker) updateData.ticker = updates.ticker.trim().toUpperCase();
    if (updates.name !== undefined) updateData.name = updates.name?.trim() || null;
    if (updates.direction) updateData.direction = updates.direction === "short" ? "short" : "long";
    if (updates.quantity) updateData.quantity = Number(updates.quantity);
    if (updates.avgCost) updateData.avgCost = Number(updates.avgCost);
    if (updates.currency) updateData.currency = updates.currency.trim().toUpperCase();
    if (updates.openedAt) updateData.openedAt = updates.openedAt;
    if (updates.notes !== undefined) updateData.notes = updates.notes?.trim() || null;

    // Close position
    if (updates.closedAt) {
      updateData.closedAt = updates.closedAt;
      if (updates.closePrice) updateData.closePrice = Number(updates.closePrice);
    }

    const [updated] = await db
      .update(manualPositions)
      .set(updateData)
      .where(and(eq(manualPositions.id, id), eq(manualPositions.userId, userId)))
      .returning();

    return NextResponse.json({ position: updated });
  } catch (error) {
    console.error("[manual-positions] PUT error:", error);
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Position ID required" }, { status: 400 });
    }

    const userId = `user:${session.user.name}`;
    const [deleted] = await db
      .delete(manualPositions)
      .where(and(eq(manualPositions.id, id), eq(manualPositions.userId, userId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[manual-positions] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete position" }, { status: 500 });
  }
}
