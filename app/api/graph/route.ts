import { NextRequest, NextResponse } from "next/server";
import { syncEntityGraph, getEntityGraph, searchEntities } from "@/lib/graph/engine";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Auto-sync if entity table is empty (use COUNT instead of loading all rows)
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.entities);
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

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  const result = await syncEntityGraph();
  return NextResponse.json({ success: true, ...result });
}
