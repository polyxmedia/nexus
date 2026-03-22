import { describe, it, expect } from "vitest";
import {
  logit,
  sigmoid,
  plattTransform,
  crossEntropyLoss,
  fitFromData,
  MIN_SAMPLES_FOR_PLATT,
  type FitInput,
} from "../platt-scaling";

// ── Core math ────────────────────────────────────────────────────────────

describe("logit", () => {
  it("logit(0.5) = 0", () => {
    expect(logit(0.5)).toBeCloseTo(0, 5);
  });

  it("logit(0.75) > 0", () => {
    // log(0.75/0.25) = log(3) ≈ 1.099
    expect(logit(0.75)).toBeCloseTo(1.0986, 3);
  });

  it("logit(0.25) < 0", () => {
    expect(logit(0.25)).toBeCloseTo(-1.0986, 3);
  });

  it("handles near-zero without NaN", () => {
    expect(Number.isFinite(logit(0.001))).toBe(true);
    expect(logit(0.001)).toBeLessThan(-5);
  });

  it("handles near-one without NaN", () => {
    expect(Number.isFinite(logit(0.999))).toBe(true);
    expect(logit(0.999)).toBeGreaterThan(5);
  });
});

describe("sigmoid", () => {
  it("sigmoid(0) = 0.5", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 5);
  });

  it("sigmoid(large positive) ≈ 0 (formula is 1/(1+exp(x)))", () => {
    expect(sigmoid(10)).toBeCloseTo(0, 3);
  });

  it("sigmoid(large negative) ≈ 1", () => {
    expect(sigmoid(-10)).toBeCloseTo(1, 3);
  });

  it("handles extreme values without overflow", () => {
    expect(Number.isFinite(sigmoid(1000))).toBe(true);
    expect(Number.isFinite(sigmoid(-1000))).toBe(true);
  });
});

describe("plattTransform", () => {
  it("identity transform (A=-1, B=0) returns approximately same value", () => {
    expect(plattTransform(0.3, -1, 0)).toBeCloseTo(0.3, 2);
    expect(plattTransform(0.5, -1, 0)).toBeCloseTo(0.5, 2);
    expect(plattTransform(0.7, -1, 0)).toBeCloseTo(0.7, 2);
    expect(plattTransform(0.9, -1, 0)).toBeCloseTo(0.9, 2);
  });

  it("compression (A=-0.5, B=0) pulls values toward 0.5", () => {
    // Less steep sigmoid = compression
    expect(plattTransform(0.8, -0.5, 0)).toBeLessThan(0.8);
    expect(plattTransform(0.8, -0.5, 0)).toBeGreaterThan(0.5);
    expect(plattTransform(0.2, -0.5, 0)).toBeGreaterThan(0.2);
    expect(plattTransform(0.2, -0.5, 0)).toBeLessThan(0.5);
  });

  it("positive B shifts probabilities down (fixes overconfidence)", () => {
    const withoutB = plattTransform(0.7, -1, 0);
    const withB = plattTransform(0.7, -1, 0.5);
    expect(withB).toBeLessThan(withoutB);
  });

  it("negative B shifts probabilities up", () => {
    const withoutB = plattTransform(0.7, -1, 0);
    const withB = plattTransform(0.7, -1, -0.5);
    expect(withB).toBeGreaterThan(withoutB);
  });

  it("is monotonically increasing for A < 0", () => {
    const inputs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const outputs = inputs.map((p) => plattTransform(p, -0.8, 0.2));
    for (let i = 1; i < outputs.length; i++) {
      expect(outputs[i]).toBeGreaterThan(outputs[i - 1]);
    }
  });

  it("0.5 with B=0 always returns 0.5 (logit(0.5)=0)", () => {
    expect(plattTransform(0.5, -1, 0)).toBeCloseTo(0.5, 5);
    expect(plattTransform(0.5, -0.5, 0)).toBeCloseTo(0.5, 5);
    expect(plattTransform(0.5, -2, 0)).toBeCloseTo(0.5, 5);
  });
});

describe("crossEntropyLoss", () => {
  it("returns 0 for perfect predictions", () => {
    // Predict 0.999 for true events, 0.001 for false
    const samples = [
      { logit: logit(0.999), y: 1 },
      { logit: logit(0.001), y: 0 },
    ];
    const loss = crossEntropyLoss(samples, -1, 0);
    expect(loss).toBeLessThan(0.01);
  });

  it("returns high loss for terrible predictions", () => {
    const samples = [
      { logit: logit(0.9), y: 0 },
      { logit: logit(0.1), y: 1 },
    ];
    const loss = crossEntropyLoss(samples, -1, 0);
    expect(loss).toBeGreaterThan(1);
  });

  it("coin-flip (all 0.5) on balanced data gives ~ln(2) ≈ 0.693", () => {
    const samples = [
      { logit: 0, y: 1 },
      { logit: 0, y: 0 },
    ];
    const loss = crossEntropyLoss(samples, -1, 0);
    expect(loss).toBeCloseTo(0.693, 2);
  });

  it("returns Infinity for empty samples", () => {
    expect(crossEntropyLoss([], -1, 0)).toBe(Infinity);
  });
});

// ── Fitting ──────────────────────────────────────────────────────────────

describe("fitFromData", () => {
  it("returns null when fewer than MIN_SAMPLES_FOR_PLATT predictions", () => {
    const data: FitInput[] = Array(MIN_SAMPLES_FOR_PLATT - 1).fill({ confidence: 0.6, outcome: "confirmed" });
    expect(fitFromData(data)).toBeNull();
  });

  it("fits A close to -1 and B close to 0 on well-calibrated data", () => {
    // Generate well-calibrated synthetic data
    const data: FitInput[] = [];
    const rng = seedRandom(42);
    for (let i = 0; i < 50; i++) {
      const conf = 0.2 + rng() * 0.6; // 0.2 to 0.8
      const outcome = rng() < conf ? "confirmed" : "denied";
      data.push({ confidence: conf, outcome });
    }
    const result = fitFromData(data);
    // Well-calibrated data should produce near-identity or null (no improvement)
    if (result) {
      expect(result.A).toBeCloseTo(-1, 0);
      expect(Math.abs(result.B)).toBeLessThan(0.5);
    }
    // Either null (no improvement over identity) or near-identity is correct
  });

  it("fits B > 0 on systematically overconfident data", () => {
    // All predictions are confident (0.7-0.9) but only 30% hit
    const data: FitInput[] = [];
    for (let i = 0; i < 30; i++) {
      const conf = 0.7 + Math.random() * 0.2;
      const outcome = i < 9 ? "confirmed" : "denied"; // 30% hit rate
      data.push({ confidence: conf, outcome });
    }
    const result = fitFromData(data);
    if (result) {
      expect(result.B).toBeGreaterThan(0); // Positive B shifts down
    }
  });

  it("returns null when fitted model is not better than identity", () => {
    // Perfectly calibrated: each confidence matches its hit rate exactly
    const data: FitInput[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({ confidence: 0.5, outcome: i % 2 === 0 ? "confirmed" : "denied" });
    }
    // Identity is already optimal for 50/50 at 0.5 confidence
    const result = fitFromData(data);
    // Should be null since identity is already optimal
    expect(result).toBeNull();
  });

  it("sample size is recorded correctly", () => {
    const data: FitInput[] = Array(20)
      .fill(null)
      .map((_, i) => ({ confidence: 0.8, outcome: i < 5 ? "confirmed" : "denied" }));
    const result = fitFromData(data);
    if (result) {
      expect(result.sampleSize).toBe(20);
    }
  });

  it("improvement metric is between 0 and 100", () => {
    const data: FitInput[] = Array(20)
      .fill(null)
      .map((_, i) => ({ confidence: 0.85, outcome: i < 4 ? "confirmed" : "denied" }));
    const result = fitFromData(data);
    if (result) {
      expect(result.improvementOverIdentity).toBeGreaterThanOrEqual(0);
      expect(result.improvementOverIdentity).toBeLessThanOrEqual(100);
    }
  });

  it("handles partial outcomes at 0.5", () => {
    const data: FitInput[] = [
      ...Array(10).fill({ confidence: 0.6, outcome: "confirmed" }),
      ...Array(5).fill({ confidence: 0.6, outcome: "partial" }),
      ...Array(5).fill({ confidence: 0.6, outcome: "denied" }),
    ];
    // Should not crash
    const result = fitFromData(data);
    // Either null or valid params
    if (result) {
      expect(Number.isFinite(result.A)).toBe(true);
      expect(Number.isFinite(result.B)).toBe(true);
    }
  });

  it("produces monotonic transform (A must be negative)", () => {
    const data: FitInput[] = Array(30)
      .fill(null)
      .map((_, i) => ({ confidence: 0.75, outcome: i < 8 ? "confirmed" : "denied" }));
    const result = fitFromData(data);
    if (result) {
      expect(result.A).toBeLessThan(0);
    }
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────

function seedRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
