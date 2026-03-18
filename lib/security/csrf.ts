/**
 * CSRF protection via origin validation.
 * Checks that the Origin or Referer header matches allowed origins.
 * Call this at the top of POST/PUT/DELETE handlers on sensitive routes.
 */

import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://localhost:3000",
  "http://localhost:3001",
  "https://localhost:3001",
  "https://nexushq.xyz",
  "https://www.nexushq.xyz",
]);

// Also allow any origin that matches the NEXTAUTH_URL env
if (process.env.NEXTAUTH_URL) {
  try {
    const url = new URL(process.env.NEXTAUTH_URL);
    ALLOWED_ORIGINS.add(url.origin);
  } catch {
    // Invalid URL
  }
}

if (process.env.VERCEL_URL) {
  ALLOWED_ORIGINS.add(`https://${process.env.VERCEL_URL}`);
}

if (process.env.NEXT_PUBLIC_BASE_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_BASE_URL);
    ALLOWED_ORIGINS.add(url.origin);
  } catch {
    // Invalid URL
  }
}

if (process.env.VERCEL_BRANCH_URL) {
  ALLOWED_ORIGINS.add(`https://${process.env.VERCEL_BRANCH_URL}`);
}

/**
 * Validate that a request originates from an allowed origin.
 * Returns null if valid, or an error message if invalid.
 */
export function validateOrigin(request: Request): string | null {
  const origin = request.headers.get("origin")?.toLowerCase() || null;
  const referer = request.headers.get("referer");

  // Internal server-to-server calls (scheduler, etc.) won't have origin
  if (!origin && !referer) return null;

  if (origin && ALLOWED_ORIGINS.has(origin)) return null;

  // Allow any Vercel preview deployment for this project
  if (origin && origin.endsWith(".vercel.app") && origin.includes("andre-figueiras-projects")) return null;

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin.toLowerCase();
      if (ALLOWED_ORIGINS.has(refOrigin)) return null;
    } catch {
      // Invalid referer URL
    }
  }

  return `Origin not allowed: ${origin || referer || "unknown"}`;
}

/**
 * Return a safe error response that never leaks internal details.
 * Logs the full error server-side, returns a generic message to the client.
 */
export function safeError(
  context: string,
  error: unknown,
  status = 500,
): NextResponse {
  const raw = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, raw);
  return NextResponse.json(
    { error: "An unexpected error occurred. Please try again." },
    { status },
  );
}
