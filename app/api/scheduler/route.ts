import { NextRequest, NextResponse } from "next/server";
import { startScheduler, stopScheduler, getJobStatus } from "@/lib/scheduler";

export async function GET() {
  return NextResponse.json({ jobs: getJobStatus() });
}

export async function POST(req: NextRequest) {
  const { action } = await req.json();

  if (action === "start") {
    startScheduler();
    return NextResponse.json({ status: "started", jobs: getJobStatus() });
  }

  if (action === "stop") {
    stopScheduler();
    return NextResponse.json({ status: "stopped" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
