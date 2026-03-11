import { NextRequest, NextResponse } from "next/server";
import { startScheduler, stopScheduler, getJobStatus } from "@/lib/scheduler";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

export async function GET(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ jobs: getJobStatus() });
}

export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const { action } = await req.json();

    if (action === "start") {
      await startScheduler();
      return NextResponse.json({ status: "started", jobs: getJobStatus() });
    }

    if (action === "stop") {
      stopScheduler();
      return NextResponse.json({ status: "stopped" });
    }

    if (action === "restart") {
      stopScheduler();
      await startScheduler();
      return NextResponse.json({ status: "restarted", jobs: getJobStatus() });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
