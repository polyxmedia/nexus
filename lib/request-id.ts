import { NextResponse } from "next/server";

/**
 * Generate a short request correlation ID.
 * Format: "req_" + 8 hex chars (from crypto.randomUUID).
 */
export function generateRequestId(): string {
  return "req_" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

/**
 * Return a JSON error response with a correlation ID.
 * The real error details stay server-side; the client gets a safe message + requestId.
 *
 * Usage in API routes:
 *   return errorResponse("Something went wrong", 500);
 *   return errorResponse("Not found", 404, requestId);
 */
export function errorResponse(
  message: string,
  status: number,
  requestId?: string
) {
  const id = requestId || generateRequestId();
  return NextResponse.json({ error: message, requestId: id }, { status });
}
