import { NextRequest, NextResponse } from "next/server";
import { traverseFrom, findPaths, exploreEntity } from "@/lib/graph/traversal";

// GET - traverse from entity or find paths
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");
    const id = searchParams.get("id");
    const to = searchParams.get("to");
    const depth = parseInt(searchParams.get("depth") || "2");

    if (to && id) {
      const paths = await findPaths(parseInt(id), parseInt(to), Math.min(depth, 5));
      return NextResponse.json({ paths });
    }

    if (id) {
      const nodes = await traverseFrom(parseInt(id), Math.min(depth, 4));
      return NextResponse.json({ nodes });
    }

    if (entity) {
      const result = await exploreEntity(entity, Math.min(depth, 4));
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "entity or id parameter required" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - build context graph from text
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const { buildContextGraph } = await import("@/lib/graph/traversal");
    const result = await buildContextGraph(text);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
