import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
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

      // Select only needed columns instead of SELECT *
      const selectColumns = {
        id: schema.alertHistory.id,
        title: schema.alertHistory.title,
        message: schema.alertHistory.message,
        severity: schema.alertHistory.severity,
        triggeredAt: schema.alertHistory.triggeredAt,
        dismissed: schema.alertHistory.dismissed,
      };

      // Send initial undismissed alerts
      const recent = await db
        .select(selectColumns)
        .from(schema.alertHistory)
        .where(eq(schema.alertHistory.dismissed, 0))
        .orderBy(desc(schema.alertHistory.id))
        .limit(50);
      sendEvent({ type: "init", alerts: recent });

      // Poll every 60s instead of 10s - alerts don't need sub-minute updates
      // This alone cuts DB reads by 6x per connected client
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        const newAlerts = await db
          .select(selectColumns)
          .from(schema.alertHistory)
          .where(eq(schema.alertHistory.dismissed, 0))
          .orderBy(desc(schema.alertHistory.id))
          .limit(50);
        sendEvent({ type: "update", alerts: newAlerts });
      }, 60_000);

      // Keepalive every 30s
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
      }, 30_000);
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
