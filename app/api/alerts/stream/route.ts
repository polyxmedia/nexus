import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send initial undismissed alerts
      const recent = db
        .select()
        .from(schema.alertHistory)
        .where(eq(schema.alertHistory.dismissed, 0))
        ;
      sendEvent({ type: "init", alerts: recent });

      // Poll for new alerts every 30 seconds
      const interval = setInterval(() => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        const newAlerts = db
          .select()
          .from(schema.alertHistory)
          .where(eq(schema.alertHistory.dismissed, 0))
          ;
        sendEvent({ type: "update", alerts: newAlerts });
      }, 30_000);

      // Keepalive
      const keepalive = setInterval(() => {
        if (closed) {
          clearInterval(keepalive);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          closed = true;
          clearInterval(keepalive);
          clearInterval(interval);
        }
      }, 15_000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
