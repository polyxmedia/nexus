import { describe, it, expect } from "vitest";

// Extract the decay logic for testing (same implementation as engine.ts)
const DECAY_TIERS_HOURS = [0, 6, 12, 24];

function getEffectiveCooldownMs(baseCooldownMinutes: number, triggerCount: number): number {
  const tierIndex = Math.min(triggerCount, DECAY_TIERS_HOURS.length - 1);
  const decayMinutes = DECAY_TIERS_HOURS[tierIndex] * 60;
  const effectiveMinutes = Math.max(baseCooldownMinutes, decayMinutes);
  return effectiveMinutes * 60 * 1000;
}

describe("Alert Decay Suppression", () => {
  const BASE_COOLDOWN = 60; // 60 minutes

  it("first trigger (count=0) uses base cooldown, no decay", () => {
    const ms = getEffectiveCooldownMs(BASE_COOLDOWN, 0);
    // tier 0 = 0 hours, max(60, 0) = 60 minutes
    expect(ms).toBe(60 * 60 * 1000);
  });

  it("second trigger (count=1) escalates to 6 hours", () => {
    const ms = getEffectiveCooldownMs(BASE_COOLDOWN, 1);
    // tier 1 = 6 hours = 360 minutes, max(60, 360) = 360
    expect(ms).toBe(6 * 60 * 60 * 1000);
  });

  it("third trigger (count=2) escalates to 12 hours", () => {
    const ms = getEffectiveCooldownMs(BASE_COOLDOWN, 2);
    expect(ms).toBe(12 * 60 * 60 * 1000);
  });

  it("fourth trigger (count=3) escalates to 24 hours", () => {
    const ms = getEffectiveCooldownMs(BASE_COOLDOWN, 3);
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });

  it("count beyond tiers caps at max tier (24h)", () => {
    const ms = getEffectiveCooldownMs(BASE_COOLDOWN, 100);
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });

  it("never reduces below base cooldown", () => {
    // If base cooldown is 48 hours (2880 min), decay tiers should not reduce it
    const longCooldown = 2880;
    for (let count = 0; count < 5; count++) {
      const ms = getEffectiveCooldownMs(longCooldown, count);
      expect(ms).toBeGreaterThanOrEqual(longCooldown * 60 * 1000);
    }
  });

  it("uses decay tier when it exceeds base cooldown", () => {
    // Base = 5 min, but after 1 trigger decay = 6h which is larger
    const ms = getEffectiveCooldownMs(5, 1);
    expect(ms).toBe(6 * 60 * 60 * 1000);
  });

  it("after reset (count=0), decay returns to base cooldown", () => {
    // Simulates the triggerCount reset when condition clears
    const beforeReset = getEffectiveCooldownMs(BASE_COOLDOWN, 3);
    expect(beforeReset).toBe(24 * 60 * 60 * 1000);

    const afterReset = getEffectiveCooldownMs(BASE_COOLDOWN, 0);
    expect(afterReset).toBe(60 * 60 * 1000);
  });
});
