import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { generateSignals } from "@/lib/signals/engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const intensity = searchParams.get("intensity");
    const status = searchParams.get("status");

    let query = db.select().from(schema.signals).orderBy(asc(schema.signals.date));

    const results = query.all();

    let filtered = results;

    if (intensity) {
      const intensityNum = parseInt(intensity, 10);
      filtered = filtered.filter((s) => s.intensity === intensityNum);
    }

    if (status) {
      filtered = filtered.filter((s) => s.status === status);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year } = body;

    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "year is required and must be a number" },
        { status: 400 }
      );
    }

    const result = generateSignals(year);

    for (const signal of result.signals) {
      db.insert(schema.signals).values(signal).run();
    }

    return NextResponse.json({
      inserted: result.signals.length,
      stats: result.stats,
      shmitaInfo: result.shmitaInfo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
