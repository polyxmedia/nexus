import { NextResponse } from "next/server";
import { detectCurrentRegime, getLatestShifts } from "@/lib/regime/detection";
import { loadRegimeState } from "@/lib/regime/store";
import type { RegimeState } from "@/lib/regime/detection";

export async function GET() {
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
