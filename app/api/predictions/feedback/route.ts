import { NextResponse } from "next/server";
import { computePerformanceReport } from "@/lib/predictions/feedback";

export async function GET() {
  try {
    const report = await computePerformanceReport();
    if (!report) {
      return NextResponse.json({
        message: "Not enough resolved predictions to generate feedback (minimum 5 required)",
        report: null,
      });
    }
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
