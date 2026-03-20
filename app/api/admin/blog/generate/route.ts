/**
 * Streaming article generation endpoint (SSE).
 * Emits progress events as the synthesis pipeline runs.
 */

export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateArticle, type GenerationEvent } from "@/lib/blog/writer";

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return false;
  const rows = await db.select().from(schema.settings).where(
    eq(schema.settings.key, `user:${session.user.name}`)
  );
  if (rows.length === 0) return false;
  try {
    const data = JSON.parse(rows[0].value);
    return data.role === "admin";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { autoPublish?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: GenerationEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // stream may have been closed
        }
      };

      try {
        await generateArticle({
          autoPublish: body.autoPublish,
          onProgress: send,
        });

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
