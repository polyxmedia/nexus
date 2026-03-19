import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { computeCountryRiskIndex } from "@/lib/warroom/country-risk";

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const risks = await computeCountryRiskIndex();
    return NextResponse.json(
      { risks, count: risks.length, computedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
