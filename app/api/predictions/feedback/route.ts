import { NextRequest, NextResponse } from "next/server";
import { computePerformanceReport } from "@/lib/predictions/feedback";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`public:feedback:${ip}`, 20, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const report = await computePerformanceReport();
    if (!report) {
      return NextResponse.json({
        message: "Not enough resolved predictions to generate feedback (minimum 5 required)",
        report: null,
      });
    }
    return NextResponse.json({ report }, { headers: { "Cache-Control": "private, s-maxage=120, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Prediction feedback error:", error);
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
  }
}
