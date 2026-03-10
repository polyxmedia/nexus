import { NextRequest, NextResponse } from "next/server";
import { propagateShock, getFullGraph, type ContagionEvent } from "@/lib/contagion/engine";
import { requireTier } from "@/lib/auth/require-tier";

// POST: Propagate a shock through the contagion graph
export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const body = await request.json();
    const { trigger, sourceAsset, shockMagnitude, shockType, maxOrder } = body;

    if (!sourceAsset || shockMagnitude === undefined) {
      return NextResponse.json(
        { error: "sourceAsset and shockMagnitude are required" },
        { status: 400 },
      );
    }

    const event: ContagionEvent = {
      trigger: trigger || `${sourceAsset} ${shockMagnitude > 0 ? "+" : ""}${(shockMagnitude * 100).toFixed(1)}% shock`,
      sourceAsset,
      shockMagnitude,
      shockType: shockType || "price",
    };

    const result = propagateShock(event, maxOrder || 3);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: Return the full contagion graph
export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const graph = getFullGraph();
    return NextResponse.json(graph);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
