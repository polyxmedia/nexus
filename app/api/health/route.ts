import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await db.select({ one: sql`1` }).from(schema.settings).limit(1);
    checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { ok: false, latencyMs: Date.now() - dbStart, error: "Connection failed" };
  }

  // Redis check
  const redisStart = Date.now();
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      });
      checks.redis = { ok: res.ok, latencyMs: Date.now() - redisStart };
    } catch {
      checks.redis = { ok: false, latencyMs: Date.now() - redisStart, error: "Connection failed" };
    }
  } else {
    checks.redis = { ok: true, latencyMs: 0 };
  }

  const healthy = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
