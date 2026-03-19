import { describe, it, expect } from "vitest";

// Extract the titleHash function for testing (same implementation as context-scan.ts)
function titleHash(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
}

describe("Context Scan Dedup - titleHash", () => {
  it("normalizes to lowercase alphanumeric", () => {
    expect(titleHash("Breaking: Oil Prices SURGE!")).toBe("breakingoilpricessurge");
  });

  it("strips all punctuation and special characters", () => {
    expect(titleHash("U.S.-China Trade War: What's Next?")).toBe("uschinatradewarwhatsnext");
  });

  it("truncates to 80 characters", () => {
    const longTitle = "A".repeat(200);
    expect(titleHash(longTitle)).toHaveLength(80);
  });

  it("produces same hash for articles with different formatting", () => {
    const h1 = titleHash("Oil Prices Rise on OPEC Decision");
    const h2 = titleHash("oil prices rise on opec decision");
    const h3 = titleHash("Oil-Prices Rise On OPEC+ Decision!");
    expect(h1).toBe(h2);
    // h3 strips the hyphen and plus, so matches too
    expect(h1).toBe("oilpricesriseonopecdecision");
    expect(h3).toBe("oilpricesriseonopecdecision");
  });

  it("produces different hashes for different articles", () => {
    const h1 = titleHash("Oil Prices Rise");
    const h2 = titleHash("Oil Prices Fall");
    expect(h1).not.toBe(h2);
  });

  it("handles empty string", () => {
    expect(titleHash("")).toBe("");
  });

  it("handles unicode and non-latin characters", () => {
    // Only a-z0-9 survive
    expect(titleHash("台湾海峡 tensions rise")).toBe("tensionsrise");
  });

  it("handles numbers in titles", () => {
    expect(titleHash("VIX hits 45.3 - highest since 2020")).toBe("vixhits453highestsince2020");
  });
});

describe("Context Scan Dedup - Cache Persistence Logic", () => {
  it("trimming keeps most recent entries", () => {
    const MAX = 1000;
    const cache = new Set<string>();
    // Add 1500 entries
    for (let i = 0; i < 1500; i++) {
      cache.add(`hash_${i}`);
    }
    const hashes = [...cache];
    const trimmed = hashes.slice(-MAX);

    expect(trimmed).toHaveLength(MAX);
    // Should keep the last 1000 (500-1499)
    expect(trimmed[0]).toBe("hash_500");
    expect(trimmed[trimmed.length - 1]).toBe("hash_1499");
  });

  it("no trimming when under limit", () => {
    const MAX = 1000;
    const hashes = Array.from({ length: 50 }, (_, i) => `hash_${i}`);
    const trimmed = hashes.slice(-MAX);
    expect(trimmed).toHaveLength(50);
  });
});
