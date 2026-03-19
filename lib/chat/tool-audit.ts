import { db, schema } from "@/lib/db";

/**
 * Fire-and-forget tool execution audit logging.
 * Never blocks or throws - failures are silently logged to console.
 */
export function logToolExecution(params: {
  sessionId?: number;
  toolName: string;
  input: Record<string, unknown>;
  outputSizeBytes: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  username?: string;
}): void {
  // Truncate input to ~2KB to avoid bloating the table
  let truncatedInput: Record<string, unknown> | null = null;
  try {
    const inputStr = JSON.stringify(params.input);
    if (inputStr.length <= 2048) {
      truncatedInput = params.input;
    } else {
      truncatedInput = { _truncated: true, _originalSize: inputStr.length, ...Object.fromEntries(
        Object.entries(params.input).map(([k, v]) => {
          const valStr = JSON.stringify(v);
          return [k, valStr.length > 500 ? `[truncated, ${valStr.length} chars]` : v];
        })
      )};
    }
  } catch {
    truncatedInput = { _error: "Could not serialize input" };
  }

  db.insert(schema.toolAuditLog)
    .values({
      sessionId: params.sessionId ?? null,
      toolName: params.toolName,
      input: truncatedInput,
      outputSizeBytes: params.outputSizeBytes,
      durationMs: params.durationMs,
      success: params.success,
      errorMessage: params.errorMessage ?? null,
      username: params.username ?? null,
    })
    .then(() => {})
    .catch((err: unknown) => {
      console.error("[tool-audit] Failed to log:", err instanceof Error ? err.message : err);
    });
}
