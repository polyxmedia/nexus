import { calculateCredits } from "@/lib/credits";

describe("calculateCredits", () => {
  it("calculates Haiku credits correctly", () => {
    // Haiku: 1 input / 4 output per 1K tokens
    const credits = calculateCredits("claude-haiku-4-5-20251001", 1000, 1000);
    expect(credits).toBe(1 + 4); // 5
  });

  it("calculates Sonnet 4.6 credits correctly", () => {
    // Sonnet: 3 input / 15 output per 1K tokens
    const credits = calculateCredits("claude-sonnet-4-6", 1000, 1000);
    expect(credits).toBe(3 + 15); // 18
  });

  it("calculates Sonnet 4 credits correctly", () => {
    const credits = calculateCredits("claude-sonnet-4-20250514", 1000, 1000);
    expect(credits).toBe(3 + 15); // 18
  });

  it("calculates Opus credits correctly", () => {
    // Opus: 15 input / 75 output per 1K tokens
    const credits = calculateCredits("claude-opus-4-6", 1000, 1000);
    expect(credits).toBe(15 + 75); // 90
  });

  it("rounds up partial thousands", () => {
    // 500 tokens = ceil(500/1000) = 1 unit
    const credits = calculateCredits("claude-haiku-4-5-20251001", 500, 500);
    expect(credits).toBe(1 + 4); // 5
  });

  it("handles zero tokens", () => {
    const credits = calculateCredits("claude-sonnet-4-6", 0, 0);
    expect(credits).toBe(0);
  });

  it("handles large token counts", () => {
    // 10K input, 5K output on Opus
    const credits = calculateCredits("claude-opus-4-6", 10000, 5000);
    expect(credits).toBe(10 * 15 + 5 * 75); // 150 + 375 = 525
  });

  it("falls back to Sonnet rates for unknown models", () => {
    const credits = calculateCredits("unknown-model", 1000, 1000);
    expect(credits).toBe(3 + 15); // 18 (Sonnet fallback)
  });

  it("Opus costs 5x more than Sonnet for same tokens", () => {
    const sonnet = calculateCredits("claude-sonnet-4-6", 5000, 2000);
    const opus = calculateCredits("claude-opus-4-6", 5000, 2000);
    expect(opus).toBe(5 * sonnet);
  });
});
