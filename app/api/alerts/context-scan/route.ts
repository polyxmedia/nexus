import { NextResponse } from "next/server";
import { runContextScan, buildInterestProfile } from "@/lib/alerts/context-scan";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const result = await runContextScan();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[context-scan] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET returns the current interest profile (useful for debugging what's tracked)
export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const profile = await buildInterestProfile();
    return NextResponse.json({
      tickers: [...profile.tickers],
      keywords: [...profile.keywords].sort(),
      sources: {
        positions: profile.sources.positions,
        watchlist: profile.sources.watchlist,
        theses: [...new Set(profile.sources.theses)],
        chat: [...new Set(profile.sources.chat)],
        memory: [...new Set(profile.sources.memory)],
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
