import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { createDistributedRun, getRunProgress } from "@/lib/backtest/coordinator";
import { mergeChunkResults } from "@/lib/backtest/merge";

export async function GET(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  const progress = await getRunProgress(runId);

  // If complete, include merged results
  if (progress.pending === 0 && progress.processing === 0 && progress.complete > 0) {
    const merged = await mergeChunkResults(runId);
    return NextResponse.json({ ...progress, results: merged });
  }

  return NextResponse.json(progress);
}

export async function POST(request: Request) {
  const check = await requireTier("institution");
  if ("response" in check) return check.response;

  try {
    const { startDate, endDate, instruments, chunks } = await request.json();
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
    }

    const runId = `dist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const config = await createDistributedRun(runId, {
      startDate,
      endDate,
      instruments,
      chunksCount: chunks || 4,
    });

    return NextResponse.json(config, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create distributed run" }, { status: 500 });
  }
}
