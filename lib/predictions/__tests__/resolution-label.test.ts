import { describe, it, expect } from "vitest";
import { getResolutionLabel } from "../resolution-label";

describe("getResolutionLabel", () => {
  // ── HIT: high confidence + confirmed ──
  it("high confidence confirmed = HIT", () => {
    const result = getResolutionLabel("confirmed", 0.75);
    expect(result.label).toBe("HIT");
    expect(result.color).toContain("emerald");
  });

  it("60% confidence confirmed = HIT", () => {
    const result = getResolutionLabel("confirmed", 0.60);
    expect(result.label).toBe("HIT");
  });

  // ── MISS: high confidence + denied ──
  it("high confidence denied = MISS", () => {
    const result = getResolutionLabel("denied", 0.75);
    expect(result.label).toBe("MISS");
    expect(result.color).toContain("rose");
  });

  it("60% confidence denied = MISS", () => {
    const result = getResolutionLabel("denied", 0.60);
    expect(result.label).toBe("MISS");
  });

  // ── CORRECT REJECT: low confidence + denied ──
  it("low confidence denied = CORRECT REJECT", () => {
    const result = getResolutionLabel("denied", 0.25);
    expect(result.label).toBe("CORRECT REJECT");
    expect(result.color).toContain("emerald");
  });

  it("27% confidence denied = CORRECT REJECT (the OPEC case)", () => {
    const result = getResolutionLabel("denied", 0.27);
    expect(result.label).toBe("CORRECT REJECT");
    expect(result.brierQuality).toBe("Excellent");
    expect(result.brierScore).toBeLessThan(0.10);
    expect(result.calibrationNote).toContain("Low-confidence denial confirmed");
  });

  it("40% confidence denied = CORRECT REJECT", () => {
    const result = getResolutionLabel("denied", 0.40);
    expect(result.label).toBe("CORRECT REJECT");
  });

  // ── SURPRISE: low confidence + confirmed ──
  it("low confidence confirmed = SURPRISE", () => {
    const result = getResolutionLabel("confirmed", 0.25);
    expect(result.label).toBe("SURPRISE");
    expect(result.color).toContain("amber");
  });

  it("27% confidence confirmed = SURPRISE (the actual OPEC case)", () => {
    const result = getResolutionLabel("confirmed", 0.27);
    expect(result.label).toBe("SURPRISE");
    expect(result.calibrationNote).toContain("Underconfident");
  });

  // ── 50% edge case ──
  it("exactly 50% confirmed = HIT with neutral color", () => {
    const result = getResolutionLabel("confirmed", 0.50);
    expect(result.label).toBe("HIT");
    expect(result.calibrationNote).toContain("50/50");
  });

  it("exactly 50% denied = MISS with neutral color", () => {
    const result = getResolutionLabel("denied", 0.50);
    expect(result.label).toBe("MISS");
    expect(result.calibrationNote).toContain("50/50");
  });

  // ── PARTIAL ──
  it("partial always = PARTIAL regardless of confidence", () => {
    expect(getResolutionLabel("partial", 0.80).label).toBe("PARTIAL");
    expect(getResolutionLabel("partial", 0.20).label).toBe("PARTIAL");
    expect(getResolutionLabel("partial", 0.50).label).toBe("PARTIAL");
  });

  // ── EXPIRED ──
  it("expired always = EXPIRED", () => {
    expect(getResolutionLabel("expired", 0.70).label).toBe("EXPIRED");
  });

  // ── POST-EVENT ──
  it("post_event always = POST-EVENT", () => {
    expect(getResolutionLabel("post_event", 0.50).label).toBe("POST-EVENT");
  });

  // ── Brier quality bands ──
  it("Brier <= 0.10 = Excellent", () => {
    // 90% confidence confirmed: Brier = (0.9 - 1)^2 = 0.01
    const result = getResolutionLabel("confirmed", 0.90);
    expect(result.brierQuality).toBe("Excellent");
    expect(result.brierScore).toBeLessThanOrEqual(0.10);
  });

  it("Brier 0.10-0.20 = Good", () => {
    // 60% confidence confirmed: Brier = (0.6 - 1)^2 = 0.16
    const result = getResolutionLabel("confirmed", 0.60);
    expect(result.brierQuality).toBe("Good");
  });

  it("Brier 0.20-0.30 = Fair", () => {
    // 50% confidence confirmed: Brier = (0.5 - 1)^2 = 0.25
    const result = getResolutionLabel("confirmed", 0.50);
    expect(result.brierQuality).toBe("Fair");
  });

  it("Brier > 0.30 = Poor", () => {
    // 30% confidence confirmed: Brier = (0.3 - 1)^2 = 0.49
    const result = getResolutionLabel("confirmed", 0.30);
    expect(result.brierQuality).toBe("Poor");
  });

  // ── Score override ──
  it("uses provided score instead of computing Brier", () => {
    const result = getResolutionLabel("confirmed", 0.75, 0.05);
    expect(result.brierScore).toBe(0.05);
    expect(result.brierQuality).toBe("Excellent");
  });

  // ── All labels have required fields ──
  for (const outcome of ["confirmed", "denied", "partial", "expired", "post_event"]) {
    for (const conf of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      it(`${outcome} at ${conf * 100}% has all required fields`, () => {
        const result = getResolutionLabel(outcome, conf);
        expect(result.label).toBeTruthy();
        expect(result.color).toBeTruthy();
        expect(result.bg).toBeTruthy();
        expect(result.border).toBeTruthy();
        expect(result.brierQuality).toBeTruthy();
        expect(typeof result.brierScore).toBe("number");
        expect(result.brierScore).toBeGreaterThanOrEqual(0);
        expect(result.brierScore).toBeLessThanOrEqual(1);
        expect(result.calibrationNote).toBeTruthy();
      });
    }
  }
});
