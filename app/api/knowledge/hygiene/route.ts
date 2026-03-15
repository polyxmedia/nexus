import { NextRequest, NextResponse } from "next/server";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";
import { runKnowledgeHygiene, getHygieneStatus } from "@/lib/knowledge/hygiene";

// POST: Run knowledge hygiene scan (grace stale entries)
export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const result = await runKnowledgeHygiene();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[knowledge-hygiene] API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: Knowledge hygiene status overview
export async function GET(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const status = await getHygieneStatus();
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[knowledge-hygiene] Status error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
