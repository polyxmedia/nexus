export const maxDuration = 120;

import { NextRequest } from "next/server";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

/**
 * Streaming prediction generation endpoint.
 * Emits real SSE progress updates from the prediction engine's onProgress
 * callback as each intelligence-gathering and analysis step completes.
 */
export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const engine = await import("@/lib/predictions/engine");

        send("step", { id: "init", label: "Initializing prediction engine", status: "running" });

        // Real progress callback wired into the engine
        const onProgress = (label: string, status: "running" | "done") => {
          send("step", { id: label, label, status });
        };

        send("step", { id: "init", label: "Engine initialized", status: "done" });

        const predictions = await engine.generatePredictions({ onProgress });

        // Notify
        let notified = 0;
        if (predictions.length > 0) {
          send("step", { id: "notify", label: "Dispatching notifications", status: "running" });
          try {
            const { notifyNewPredictions } = await import("@/lib/predictions/notify");
            notified = await notifyNewPredictions(predictions);
          } catch { /* best effort */ }
          send("step", { id: "notify", label: `${notified} notification(s) sent`, status: "done" });
        }

        send("complete", { count: predictions.length, notified });

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
