import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { runThreadReplies } from "@/lib/twitter/replies";

export async function POST() {
  const tierCheck = await requireTier("institution");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const result = await runThreadReplies();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[twitter-replies] API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
