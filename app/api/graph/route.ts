import { NextRequest, NextResponse } from "next/server";
import { syncEntityGraph, getEntityGraph, searchEntities } from "@/lib/graph/engine";
import { db, schema } from "@/lib/db";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Auto-sync if entity table is empty
  const count = (await db.select().from(schema.entities)).length;
  if (count === 0) {
    syncEntityGraph();
  }

  if (action === "search") {
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || undefined;
    const results = await searchEntities(q, type);
    return NextResponse.json({ results });
  }

  const centerId = searchParams.get("center");
  const depth = parseInt(searchParams.get("depth") || "2", 10);

  const graph = await getEntityGraph(
    centerId ? parseInt(centerId, 10) : undefined,
    depth
  );

  return NextResponse.json(graph);
}

export async function POST() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const result = await syncEntityGraph();
  return NextResponse.json({ success: true, ...result });
}
