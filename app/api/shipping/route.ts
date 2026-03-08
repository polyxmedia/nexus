import { NextRequest, NextResponse } from "next/server";
import { getShippingSnapshot, type ChokepointId } from "@/lib/shipping";

const VALID_CHOKEPOINTS = new Set<ChokepointId>([
  "hormuz",
  "suez",
  "malacca",
  "mandeb",
  "panama",
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chokepointParam = searchParams.get("chokepoint") || undefined;

    let filterChokepoint: ChokepointId | undefined;
    if (chokepointParam && VALID_CHOKEPOINTS.has(chokepointParam as ChokepointId)) {
      filterChokepoint = chokepointParam as ChokepointId;
    }

    const snapshot = await getShippingSnapshot(filterChokepoint);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
