// Consistent API response envelope for all /api/v1/ endpoints.
// Success: { data, meta }
// Error:   { error: { code, message, ...extra } }

import { NextResponse } from "next/server";

interface ApiMeta {
  timestamp: string;
  tier: string;
  rateLimit?: {
    remaining: number;
    resetAt: string;
  };
}

/** Wrap a successful API response. */
export function apiSuccess(
  data: unknown,
  meta: { tier: string; remaining?: number; resetAt?: number },
  status = 200,
): NextResponse {
  const envelope: { data: unknown; meta: ApiMeta } = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      tier: meta.tier,
    },
  };
  if (meta.remaining !== undefined && meta.resetAt !== undefined) {
    envelope.meta.rateLimit = {
      remaining: meta.remaining,
      resetAt: new Date(meta.resetAt).toISOString(),
    };
  }

  const res = NextResponse.json(envelope, { status });
  if (meta.remaining !== undefined) {
    res.headers.set("X-RateLimit-Remaining", String(meta.remaining));
  }
  if (meta.resetAt !== undefined) {
    res.headers.set("X-RateLimit-Reset", String(Math.floor(meta.resetAt / 1000)));
  }
  return res;
}

/** Return a structured API error. */
export function apiError(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...extra } },
    { status },
  );
}
