import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { predictAndStore, getActiveModel } from "@/lib/ml/inference";

export async function POST(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  try {
    const { modelId, symbol } = await request.json();

    let id = modelId;
    if (!id) {
      const active = await getActiveModel("direction");
      if (!active) return NextResponse.json({ error: "No active model found" }, { status: 404 });
      id = active.id;
    }

    const result = await predictAndStore(id, symbol);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Prediction failed" },
      { status: 500 }
    );
  }
}
