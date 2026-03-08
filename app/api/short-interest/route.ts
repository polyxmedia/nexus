import { NextRequest, NextResponse } from "next/server";
import { getShortInterestSnapshot } from "@/lib/short-interest";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get("sector") || undefined;

    const snapshot = await getShortInterestSnapshot(sector);

    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
