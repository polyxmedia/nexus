import { vi } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock next-auth/next
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { name: "testuser" },
  }),
}));

// Mock auth options
vi.mock("@/lib/auth/auth", () => ({
  authOptions: {},
}));
