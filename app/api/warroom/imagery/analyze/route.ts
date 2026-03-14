import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { analyzeChange } from "@/lib/satellite/analysis";

export async function POST(request: Request) {
  const check = await requireTier("institution");
  if ("response" in check) return check.response;

  try {
    const { regionName, bbox, date1, date2 } = await request.json();
    if (!regionName || !bbox || !date1 || !date2) {
      return NextResponse.json({ error: "regionName, bbox, date1, date2 required" }, { status: 400 });
    }

    const result = await analyzeChange(regionName, bbox, date1, date2);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
