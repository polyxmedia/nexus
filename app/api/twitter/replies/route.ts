import { NextRequest, NextResponse } from "next/server";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";
import { runThreadReplies } from "@/lib/twitter/replies";

export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const result = await runThreadReplies();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[twitter-replies] API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
