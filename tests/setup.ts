import { vi } from "vitest";

// Mock next/headers (prevents "headers was called outside a request scope" errors)
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
    entries: vi.fn().mockReturnValue([]),
    forEach: vi.fn(),
  }),
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
    getAll: vi.fn().mockReturnValue([]),
  }),
}));

// Mock next-auth/next
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { name: "testuser" },
  }),
}));

// Mock next-auth (some routes import from "next-auth" directly)
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { name: "testuser" },
  }),
  default: vi.fn(),
}));

// Mock auth options
vi.mock("@/lib/auth/auth", () => ({
  authOptions: {},
}));

// Mock next/dist internal request store to prevent "headers called outside request scope"
vi.mock("next/dist/server/app-render/work-unit-async-storage.external", () => ({
  workUnitAsyncStorage: {
    getStore: vi.fn().mockReturnValue({
      type: "request",
      phase: "render",
      url: { pathname: "/api/test" },
      headers: new Map(),
    }),
  },
}));
