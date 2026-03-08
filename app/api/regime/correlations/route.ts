import { NextResponse } from "next/server";
import { computeCorrelationMatrix, getLatestCorrelations } from "@/lib/regime/correlations";

export async function GET() {
  try {
    const latest = await getLatestCorrelations();
    return NextResponse.json(latest || { pairs: [], breaks: [], overallStress: 0, timestamp: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const matrix = await computeCorrelationMatrix();
    return NextResponse.json(matrix);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
