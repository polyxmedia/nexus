/**
 * CSRF protection via origin validation.
 * Checks that the Origin or Referer header matches allowed origins.
 * Call this at the top of POST/PUT/DELETE handlers on sensitive routes.
 */

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://localhost:3000",
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
