import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role === "admin";
}

// GET: list all base rates
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rows = await db.execute(sql`
      SELECT * FROM prediction_base_rates ORDER BY category, pattern
    `);
    return NextResponse.json({ rates: rows.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch base rates" }, { status: 500 });
  }
}

// PATCH: update a single base rate
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, base_rate, label, keywords, timeframe } = body;

    if (!id || base_rate == null) {
      return NextResponse.json({ error: "id and base_rate required" }, { status: 400 });
    }

    const rate = Number(base_rate);
    if (rate < 0 || rate > 1) {
      return NextResponse.json({ error: "base_rate must be between 0 and 1" }, { status: 400 });
    }

    await db.execute(sql`
      UPDATE prediction_base_rates
      SET base_rate = ${rate},
          label = COALESCE(${label || null}, label),
          keywords = COALESCE(${keywords || null}, keywords),
          timeframe = COALESCE(${timeframe || null}, timeframe),
          last_updated = ${new Date().toISOString().split("T")[0]}
      WHERE id = ${id}
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update base rate" }, { status: 500 });
  }
}

// POST: add a new base rate
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { category, pattern, label, timeframe, base_rate, keywords } = body;

    if (!category || !pattern || !label || base_rate == null) {
      return NextResponse.json({ error: "category, pattern, label, and base_rate required" }, { status: 400 });
    }

    const rate = Number(base_rate);
    if (rate < 0 || rate > 1) {
      return NextResponse.json({ error: "base_rate must be between 0 and 1" }, { status: 400 });
    }

    const result = await db.execute(sql`
      INSERT INTO prediction_base_rates (category, pattern, label, timeframe, base_rate, keywords, last_updated)
      VALUES (${category}, ${pattern}, ${label}, ${timeframe || "week"}, ${rate}, ${keywords || ""}, ${new Date().toISOString().split("T")[0]})
      RETURNING *
    `);

    return NextResponse.json({ rate: result.rows[0] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Pattern already exists for this category" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create base rate" }, { status: 500 });
  }
}

// DELETE: remove a base rate
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db.execute(sql`DELETE FROM prediction_base_rates WHERE id = ${Number(id)}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete base rate" }, { status: 500 });
  }
}
