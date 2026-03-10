import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for testing API routes.
 */
export function createRequest(
  url: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): NextRequest {
  const init: RequestInit & { headers?: Record<string, string> } = {
    method: options?.method || "GET",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...(options?.headers || {}),
    },
  };

  if (options?.body) {
    init.body = JSON.stringify(options.body);
  }

  return new NextRequest(
    url.startsWith("http") ? url : `http://localhost:3000${url}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    init as any
  );
}

/**
 * Parse a Response to JSON.
 */
export async function parseResponse<T = Record<string, unknown>>(
  response: Response
): Promise<{ status: number; data: T }> {
  const data = (await response.json()) as T;
  return { status: response.status, data };
}

