import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const row = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "system:ai_outage"))
      .limit(1);

    if (!row[0]?.value) {
      return NextResponse.json({ status: "operational" });
    }

    const data = JSON.parse(row[0].value);
    // Auto-expire after 1 hour - if it's been longer, treat as resolved
    const age = Date.now() - (data.timestamp || 0);
    if (age > 3600_000) {
      return NextResponse.json({ status: "operational" });
    }

    return NextResponse.json({
      status: "degraded",
      message: data.message || "AI services are temporarily unavailable. Our team is working on it.",
      since: data.timestamp,
    });
  } catch {
    return NextResponse.json({ status: "operational" });
  }
}
