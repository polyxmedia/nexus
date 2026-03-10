vi.mock("@/lib/news/feeds", () => ({
  getNewsFeed: vi.fn().mockResolvedValue([
    { title: "Test Article", url: "https://example.com/1", source: "reuters", publishedAt: "2025-01-01" },
    { title: "Test Article 2", url: "https://example.com/2", source: "bbc", publishedAt: "2025-01-02" },
  ]),
}));

import { createRequest, parseResponse } from "../helpers";

describe("GET /api/news", () => {
  it("returns news articles", async () => {
    const { GET } = await import("@/app/api/news/route");
    const req = createRequest("/api/news");
    const res = await GET(req);
    const { status, data } = await parseResponse<Array<{ title: string }>>(res);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
  });

  it("passes category filter", async () => {
    const { getNewsFeed } = await import("@/lib/news/feeds");
    const { GET } = await import("@/app/api/news/route");
    const req = createRequest("/api/news?category=geopolitics");
    await GET(req);
    expect(getNewsFeed).toHaveBeenCalledWith("geopolitics", 30);
  });

  it("passes limit", async () => {
    const { getNewsFeed } = await import("@/lib/news/feeds");
    const { GET } = await import("@/app/api/news/route");
    const req = createRequest("/api/news?limit=10");
    await GET(req);
    expect(getNewsFeed).toHaveBeenCalledWith(undefined, 10);
  });

  it("sets cache headers", async () => {
    const { GET } = await import("@/app/api/news/route");
    const req = createRequest("/api/news");
    const res = await GET(req);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  it("returns 500 on error", async () => {
    const { getNewsFeed } = await import("@/lib/news/feeds");
    (getNewsFeed as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Feed error"));

    const { GET } = await import("@/app/api/news/route");
    const req = createRequest("/api/news");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
