import { NextResponse } from "next/server";
import { detectCurrentRegime, getLatestShifts } from "@/lib/regime/detection";
import { loadRegimeState } from "@/lib/regime/store";
import type { RegimeState } from "@/lib/regime/detection";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const latest = await loadRegimeState<RegimeState>("latest");
    const shifts = await getLatestShifts();

    return NextResponse.json({
      regime: latest || null,
      shifts,
      lastUpdated: latest?.timestamp || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const regime = await detectCurrentRegime();
    const shifts = await getLatestShifts();

    return NextResponse.json({
      regime,
      shifts,
      lastUpdated: regime.timestamp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
