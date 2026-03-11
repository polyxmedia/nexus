import { NextRequest, NextResponse } from "next/server";
import { ingestGPR } from "@/lib/gpr/ingest";
import { requireTier } from "@/lib/auth/require-tier";

// GET /api/gpr/ingest - Called by Vercel Cron (daily at 08:00 UTC)
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ingestGPR();
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}

// POST /api/gpr/ingest - Manual trigger (admin only)
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const tierCheck = await requireTier("admin");
    if ("response" in tierCheck) return tierCheck.response;
  }

  const result = await ingestGPR();
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
