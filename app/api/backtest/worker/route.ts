import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runWorker } from "@/lib/backtest/worker";

export async function POST() {
  // Auth: only allow CRON_SECRET or internal calls
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const result = await runWorker(workerId);
    return NextResponse.json({ workerId, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Worker failed" },
      { status: 500 }
    );
  }
}
