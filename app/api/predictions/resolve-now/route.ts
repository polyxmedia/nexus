export const maxDuration = 180;

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";

/**
 * Simple, direct prediction resolution. No streaming, no phases.
 * Just runs the AI resolver and returns results.
 */
export async function POST(req: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { resolvePredictions } = await import("@/lib/predictions/engine");
    console.log("[resolve-now] Starting AI resolution...");
    const results = await resolvePredictions({ skipHousekeeping: true });
    console.log(`[resolve-now] Done: ${results.length} resolved`);
    return NextResponse.json({ resolved: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[resolve-now] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
