import { NextRequest, NextResponse } from "next/server";
import { getPublishedBacktestBySlug } from "@/lib/backtest/engine";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit public access by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`public:backtest:${ip}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { slug } = await params;
    const run = await getPublishedBacktestBySlug(slug);

    if (!run) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Strip predictions array for public view (keep results, config, metadata only)
    return NextResponse.json({
      id: run.id,
      config: run.config,
      status: run.status,
      results: run.results,
      predictionCount: run.predictions.length,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
