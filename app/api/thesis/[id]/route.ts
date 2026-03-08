import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const resultRows = await db.select().from(schema.theses).where(eq(schema.theses.uuid, id));
    const result = resultRows[0];

    if (!result) {
      return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
    }

    const thesis = {
      ...result,
      tradingActions: JSON.parse(result.tradingActions),
      layerInputs: JSON.parse(result.layerInputs),
      symbols: JSON.parse(result.symbols),
    };

    return NextResponse.json({ thesis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingRows = await db.select().from(schema.theses).where(eq(schema.theses.uuid, id));

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
    }

    const updates: Record<string, string> = {};
    if (body.status && ["active", "expired", "superseded"].includes(body.status)) {
      updates.status = body.status;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(schema.theses).set(updates).where(eq(schema.theses.uuid, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
