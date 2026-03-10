import { NextResponse } from "next/server";
import { generateAttributionReport, getSignalPerformance } from "@/lib/attribution/engine";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const report = await generateAttributionReport(tierCheck.result.username);
    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[attribution] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
