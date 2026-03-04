import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signalId = parseInt(id, 10);

    if (isNaN(signalId)) {
      return NextResponse.json({ error: "Invalid signal ID" }, { status: 400 });
    }

    const signal = db
      .select()
      .from(schema.signals)
      .where(eq(schema.signals.id, signalId))
      .get();

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    return NextResponse.json(signal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
