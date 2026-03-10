import { NextRequest, NextResponse } from "next/server";
import { getContagionEdges, findContagionPaths } from "@/lib/contagion/engine";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asset: string }> },
) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { asset } = await params;
    const { searchParams } = new URL(request.url);
    const targetAsset = searchParams.get("pathTo");

    // If pathTo is specified, find all paths between the two assets
    if (targetAsset) {
      const paths = findContagionPaths(asset, targetAsset);
      return NextResponse.json({ from: asset, to: targetAsset, paths });
    }

    // Otherwise return all edges from this asset
    const edges = getContagionEdges(asset);
    return NextResponse.json({ asset, edges, edgeCount: edges.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
