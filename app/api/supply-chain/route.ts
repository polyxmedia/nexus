import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getSupplyChain, addEdge } from "@/lib/supply-chain/graph";

export async function GET(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity");
  const depth = parseInt(url.searchParams.get("depth") || "3");

  if (!entity) return NextResponse.json({ error: "entity required" }, { status: 400 });

  try {
    const chain = await getSupplyChain(entity, depth);
    return NextResponse.json({ entity, nodes: chain, totalNodes: chain.length });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch supply chain" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  try {
    const body = await request.json();
    const [edge] = await addEdge(body);
    return NextResponse.json(edge, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add edge" }, { status: 400 });
  }
}
