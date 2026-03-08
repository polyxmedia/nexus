import { NextRequest, NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/alerts/engine";
import { resolvePredictions } from "@/lib/predictions/engine";

// POST - master monitoring endpoint, designed for 5-minute cron calls
// Runs alert evaluation + prediction resolution in one sweep
export async function POST(req: NextRequest) {
  try {
    // Optional auth for external cron
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
    };

    // 1. Evaluate all alert conditions
    try {
      const alertsTriggered = await evaluateAlerts();
      results.alerts = { triggered: alertsTriggered };
    } catch (err) {
      results.alerts = { error: err instanceof Error ? err.message : "failed" };
    }

    // 2. Auto-resolve expired predictions (only run every 6 hours to save API calls)
    const hour = new Date().getUTCHours();
    const minute = new Date().getUTCMinutes();
    if (hour % 6 === 0 && minute < 10) {
      try {
        const resolved = await resolvePredictions();
        results.predictions = {
          resolved: resolved.length,
          outcomes: resolved.map((r) => `${r.id}:${r.outcome}`),
        };
      } catch (err) {
        results.predictions = { error: err instanceof Error ? err.message : "failed" };
      }
    } else {
      results.predictions = { skipped: "runs every 6 hours" };
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
