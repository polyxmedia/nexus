import { NextRequest, NextResponse } from "next/server";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";
import { runAnalystTweet } from "@/lib/twitter/analyst";

export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const tweet = await runAnalystTweet();
    return NextResponse.json({
      posted: !!tweet,
      tweet: tweet || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[twitter-analyst] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
