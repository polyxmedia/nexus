import { NextRequest, NextResponse } from "next/server";
import { runIntelligenceCycle, getAgentStatus } from "@/lib/agents/coordinator";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

// POST - trigger a full intelligence cycle: Sentinel -> Analyst -> Executor
export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const result = await runIntelligenceCycle();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - return agent status
export async function GET() {
  try {
    const status = getAgentStatus();
    return NextResponse.json({ agents: status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
