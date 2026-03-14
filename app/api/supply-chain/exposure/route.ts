import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getExposure } from "@/lib/supply-chain/graph";

export async function GET(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity");
  if (!entity) return NextResponse.json({ error: "entity required" }, { status: 400 });

  try {
    const exposure = await getExposure(entity);
    return NextResponse.json(exposure);
  } catch (err) {
    return NextResponse.json({ error: "Failed to compute exposure" }, { status: 500 });
  }
}
