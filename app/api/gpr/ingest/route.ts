import { NextRequest, NextResponse } from "next/server";
import { ingestGPR } from "@/lib/gpr/ingest";


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
  const { requireCronOrAdmin } = await import("@/lib/auth/require-cron");
  const denied = await requireCronOrAdmin(request);
  if (denied) return denied;

  const result = await ingestGPR();
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
