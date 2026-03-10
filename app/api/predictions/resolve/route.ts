import { NextRequest, NextResponse } from "next/server";
import { resolvePredictions } from "@/lib/predictions/engine";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const results = await resolvePredictions();
    return NextResponse.json({ results, count: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
