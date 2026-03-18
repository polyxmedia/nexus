export const maxDuration = 180;

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";

/**
 * Streaming prediction resolution endpoint.
 * Runs fast data-resolve first, then AI resolve, with real-time SSE progress.
 * Available to any analyst+ user (not just cron/admin) so the resolve button works.
 */
export async function POST(req: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream may be closed
        }
      };

      let totalResolved = 0;
      const allResults: Array<{ id: number; outcome: string; score: number; notes: string }> = [];

      try {
        const engine = await import("@/lib/predictions/engine");

        // ── Phase 1: Fast data-driven resolve (30s timeout to avoid blocking AI resolver) ──
        send("step", { id: "fast-init", label: "Starting data-driven resolution (no AI, 30s timeout)", status: "running" });

        try {
          const fastPromise = engine.resolveByData();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 30_000)
          );
          const fastResults = await Promise.race([fastPromise, timeoutPromise]).catch(() => [] as Awaited<ReturnType<typeof engine.resolveByData>>);
          if (fastResults.length > 0) {
            totalResolved += fastResults.length;
            allResults.push(...fastResults);
            for (const r of fastResults) {
              send("step", { id: `fast-${r.id}`, label: `[DATA] ${r.outcome.toUpperCase()}: prediction #${r.id} -- ${r.notes.slice(0, 120)}`, status: r.outcome === "confirmed" ? "done" : r.outcome === "partial" ? "warn" : "done" });
            }
            send("step", { id: "fast-done", label: `Data resolver: ${fastResults.length} prediction${fastResults.length !== 1 ? "s" : ""} resolved`, status: "done" });
          } else {
            send("step", { id: "fast-done", label: "Data resolver: no predictions resolved (or timed out)", status: "done" });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          send("step", { id: "fast-err", label: `Data resolver: ${msg}`, status: "warn" });
        }

        // Phase 2 (auto-expire) removed from manual resolve flow.
        // Auto-expire is a housekeeping concern that runs on the daily cron only.
        // Predictions should never expire just because a data fetch failed.

        // ── Phase 3: AI-powered resolution for remaining ──
        send("step", { id: "ai-init", label: "Starting AI resolver for remaining overdue predictions", status: "running" });
        console.log("[resolve-stream] Phase 3: calling resolvePredictions()...");

        try {
          const aiResults = await engine.resolvePredictions({ skipHousekeeping: true });
          console.log(`[resolve-stream] Phase 3 result: ${aiResults.length} resolved`);
          if (aiResults.length > 0) {
            totalResolved += aiResults.length;
            allResults.push(...aiResults);
            for (const r of aiResults) {
              const icon = r.outcome === "confirmed" ? "done" : r.outcome === "partial" ? "warn" : "done";
              send("step", { id: `ai-${r.id}`, label: `[AI] ${r.outcome.toUpperCase()}: prediction #${r.id} -- ${r.notes.slice(0, 120)}`, status: icon });
            }
            send("step", { id: "ai-done", label: `AI resolver: ${aiResults.length} prediction${aiResults.length !== 1 ? "s" : ""} resolved`, status: "done" });
          } else {
            send("step", { id: "ai-done", label: "AI resolver: no remaining predictions to resolve", status: "done" });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          send("step", { id: "ai-err", label: `AI resolver failed: ${msg}`, status: "error" });
        }

        send("complete", { count: totalResolved, results: allResults });

      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
