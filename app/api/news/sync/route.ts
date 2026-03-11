import { NextRequest, NextResponse } from "next/server";
import { syncNewsToDb } from "@/lib/news/sync";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const result = await syncNewsToDb();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[news-sync] cron error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
