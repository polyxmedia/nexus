import { NextResponse } from "next/server";
import { getEffectiveUsername } from "@/lib/auth/effective-user";
import { getProactiveInsights } from "@/lib/chat/proactive";

/**
 * GET: Check if the analyst has something proactive to say.
 * Called when user opens a chat session. Returns an insight message
 * if something noteworthy happened since their last visit, or null.
 */
export async function GET() {
  const username = await getEffectiveUsername();
  if (!username) return NextResponse.json({ insight: null });

  try {
    const insight = await getProactiveInsights(username);
    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json({ insight: null });
  }
}
