import { NextRequest, NextResponse } from "next/server";
import { resolvePredictions } from "@/lib/predictions/engine";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";
import { fitPlattParameters } from "@/lib/predictions/platt-scaling";

// POST - callable by cron or scheduler to auto-resolve past-deadline predictions
export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const results = await resolvePredictions();

    const summary = {
      resolved: results.length,
      outcomes: {
        confirmed: results.filter((r) => r.outcome === "confirmed").length,
        denied: results.filter((r) => r.outcome === "denied").length,
        partial: results.filter((r) => r.outcome === "partial").length,
      },
      avgScore: results.length > 0
        ? Math.round((results.reduce((s, r) => s + r.score, 0) / results.length) * 100) / 100
        : null,
      details: results.map((r) => ({
        id: r.id,
        outcome: r.outcome,
        score: r.score,
        notes: r.notes?.slice(0, 200),
      })),
      timestamp: new Date().toISOString(),
    };

    // Refit Platt scaling after resolution
    if (results.length > 0) {
      fitPlattParameters().catch(() => {});
    }
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
