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
    init
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

/**
 * Create mock DB methods that return chainable query builders.
 */
export function createMockDb() {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue([]),
  };

  // Make select/insert/update/delete return the chain
  // and also make the chain itself thenable (so `await db.select().from()` works)
  const makeThenable = (chain: typeof mockChain) => {
    const proxy = new Proxy(chain, {
      get(target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve([]);
        }
        const val = target[prop as keyof typeof target];
        if (typeof val === "function") {
          return (...args: unknown[]) => {
            val(...args);
            return proxy;
          };
        }
        return val;
      },
    });
    return proxy;
  };

  return {
    select: vi.fn(() => makeThenable(mockChain)),
    insert: vi.fn(() => makeThenable(mockChain)),
    update: vi.fn(() => makeThenable(mockChain)),
    delete: vi.fn(() => makeThenable(mockChain)),
    _chain: mockChain,
  };
}

/**
 * Mock requireTier to always authorize.
 */
export function mockTierAuthorized() {
  return {
    result: {
      authorized: true,
      tier: "institution",
      tierLevel: 3,
      limits: {
        chatMessages: -1,
        monthlyCredits: -1,
        warRoomAccess: "full" as const,
        tradingIntegration: true,
        apiAccess: true,
        customSignalLayers: true,
      },
      username: "testuser",
    },
  };
}

/**
 * Mock requireTier to deny (401).
 */
export function mockTierUnauthorized() {
  const { NextResponse } = require("next/server");
  return {
    response: NextResponse.json(
      { error: "Unauthorized", upgrade: true },
      { status: 401 }
    ),
  };
}

/**
 * Mock requireTier to deny (403 - insufficient tier).
 */
export function mockTierForbidden(requiredTier: string) {
  const { NextResponse } = require("next/server");
  return {
    response: NextResponse.json(
      {
        error: `This feature requires a ${requiredTier} subscription or higher`,
        requiredTier,
        currentTier: "free",
        upgrade: true,
      },
      { status: 403 }
    ),
  };
}
