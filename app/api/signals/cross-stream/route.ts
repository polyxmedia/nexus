import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { detectCrossStreamConvergences } from "@/lib/signals/cross-stream";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const alerts = await detectCrossStreamConvergences();
    return NextResponse.json(
      { alerts, count: alerts.length },
      { headers: { "Cache-Control": "private, s-maxage=120, stale-while-revalidate=300" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
