import { NextRequest, NextResponse } from "next/server";
import { getSignalAttribution } from "@/lib/attribution/engine";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ signalId: string }> },
) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { signalId } = await params;
    const id = parseInt(signalId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid signal ID" }, { status: 400 });
    }

    const attribution = await getSignalAttribution(id);
    return NextResponse.json(attribution);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
