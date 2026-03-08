import { NextRequest, NextResponse } from "next/server";
import { syncEntityGraph, getEntityGraph, searchEntities } from "@/lib/graph/engine";
import { db, schema } from "@/lib/db";

export async function GET(request: NextRequest) {
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
  const result = await syncEntityGraph();
  return NextResponse.json({ success: true, ...result });
}
