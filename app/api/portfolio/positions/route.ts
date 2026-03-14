import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const positions = await db.select().from(schema.unifiedPositions)
    .where(eq(schema.unifiedPositions.userId, check.result.username));

  return NextResponse.json(positions);
}
