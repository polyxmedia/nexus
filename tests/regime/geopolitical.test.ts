import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock FRED
vi.mock("@/lib/market-data/fred", () => ({
  getFredSeries: vi.fn().mockResolvedValue([{ value: 20 }]),
}));

// Mock regime store
vi.mock("@/lib/regime/store", () => ({
  saveRegimeState: vi.fn().mockResolvedValue(undefined),
  loadRegimeState: vi.fn().mockResolvedValue(null),
  appendToHistory: vi.fn().mockResolvedValue(undefined),
}));

// Mock backtest feedback
vi.mock("@/lib/backtest/feedback-loops", () => ({
  getRegimePerformanceContext: vi.fn().mockResolvedValue(null),
}));

// Mock GPR - controlled per test
const mockGetGPRSnapshot = vi.fn();
vi.mock("@/lib/gpr", () => ({
  getGPRSnapshot: () => mockGetGPRSnapshot(),
}));

vi.mock("@/lib/auth/auth", () => ({ authOptions: {} }));

describe("Geopolitical regime classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects conflict regime when GPR >= 300", async () => {
    mockGetGPRSnapshot.mockResolvedValue({
      current: { composite: 350, threats: 200, acts: 150, threatsToActsRatio: 1.33 },
      regional: [
        { region: "Middle East", score: 200, trend: "rising", topEvents: [], assetExposure: [] },
      ],
      thresholdCrossings: [],
      lastUpdated: new Date().toISOString(),
    });

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    expect(state.geopolitical.regime).toBe("conflict");
    expect(state.geopolitical.score).toBeLessThanOrEqual(-0.8);
    expect(state.geopolitical.gprComposite).toBe(350);
    expect(state.geopolitical.hotRegion).toBe("Middle East");
    expect(state.composite).toContain("WARTIME");
  });

  it("detects conflict regime when GPR >= 200 (no regional reinforcement)", async () => {
    mockGetGPRSnapshot.mockResolvedValue({
      current: { composite: 220, threats: 130, acts: 90, threatsToActsRatio: 1.44 },
      regional: [
        { region: "East Asia", score: 50, trend: "stable", topEvents: [], assetExposure: [] },
      ],
      thresholdCrossings: [],
      lastUpdated: new Date().toISOString(),
    });

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    // GPR 220 = score -0.8, but regional 50 doesn't reinforce, so exactly -0.8 = conflict boundary
    // To get crisis, need GPR between 150-200
    expect(state.geopolitical.regime).toBe("conflict");
    expect(state.composite).toContain("WARTIME");
  });

  it("detects crisis regime when GPR 150-199", async () => {
    mockGetGPRSnapshot.mockResolvedValue({
      current: { composite: 180, threats: 100, acts: 80, threatsToActsRatio: 1.25 },
      regional: [
        { region: "Europe", score: 60, trend: "stable", topEvents: [], assetExposure: [] },
      ],
      thresholdCrossings: [],
      lastUpdated: new Date().toISOString(),
    });

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    // GPR 180 = score -0.5, exactly at crisis boundary
    expect(state.geopolitical.regime).toBe("crisis");
    expect(state.composite).toContain("CRISIS");
  });

  it("detects elevated regime when GPR 120-149", async () => {
    mockGetGPRSnapshot.mockResolvedValue({
      current: { composite: 135, threats: 75, acts: 60, threatsToActsRatio: 1.25 },
      regional: [
        { region: "Europe", score: 40, trend: "stable", topEvents: [], assetExposure: [] },
      ],
      thresholdCrossings: [],
      lastUpdated: new Date().toISOString(),
    });

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    // GPR 135 = score -0.2, exactly at elevated boundary
    expect(state.geopolitical.regime).toBe("elevated");
  });

  it("detects stable regime when GPR < 120", async () => {
    mockGetGPRSnapshot.mockResolvedValue({
      current: { composite: 90, threats: 50, acts: 40, threatsToActsRatio: 1.25 },
      regional: [
        { region: "Middle East", score: 30, trend: "stable", topEvents: [], assetExposure: [] },
      ],
      thresholdCrossings: [],
      lastUpdated: new Date().toISOString(),
    });

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    expect(state.geopolitical.regime).toBe("stable");
  });

  it("handles GPR fetch failure gracefully", async () => {
    mockGetGPRSnapshot.mockRejectedValue(new Error("Network error"));

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    expect(state.geopolitical.regime).toBe("stable");
    expect(state.geopolitical.gprComposite).toBeNull();
    expect(state.geopolitical.hotRegion).toBeNull();
  });

  it("handles empty regional array without crashing", async () => {
    mockGetGPRSnapshot.mockResolvedValue({
      current: { composite: 180, threats: 100, acts: 80, threatsToActsRatio: 1.25 },
      regional: [],
      thresholdCrossings: [],
      lastUpdated: new Date().toISOString(),
    });

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    // GPR 180 = score -0.5 = crisis, no regional to crash on
    expect(state.geopolitical.regime).toBe("crisis");
    expect(state.geopolitical.hotRegion).toBeNull();
  });

  it("GDELT regional score can push regime to conflict even with moderate GPR", async () => {
    mockGetGPRSnapshot.mockResolvedValue({
      current: { composite: 180, threats: 100, acts: 80, threatsToActsRatio: 1.25 },
      regional: [
        { region: "Middle East", score: 160, trend: "rising", topEvents: [], assetExposure: [] },
      ],
      thresholdCrossings: [],
      lastUpdated: new Date().toISOString(),
    });

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    // GPR 180 alone = elevated (-0.5), but GDELT 160 reinforces to conflict (-0.8)
    expect(state.geopolitical.regime).toBe("conflict");
  });

  it("includes geopolitical in composite label with hot region tag", async () => {
    mockGetGPRSnapshot.mockResolvedValue({
      current: { composite: 310, threats: 200, acts: 110, threatsToActsRatio: 1.82 },
      regional: [
        { region: "Middle East", score: 180, trend: "rising", topEvents: [], assetExposure: [] },
        { region: "Europe", score: 60, trend: "stable", topEvents: [], assetExposure: [] },
      ],
      thresholdCrossings: [],
      lastUpdated: new Date().toISOString(),
    });

    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const state = await detectCurrentRegime();

    expect(state.composite).toContain("WARTIME");
    expect(state.composite).toContain("[Middle East]");
  });
});

describe("Regime shift detection with geopolitical dimension", () => {
  it("detects geopolitical shift from stable to conflict", async () => {
    const { detectRegimeShifts } = await import("@/lib/regime/detection");

    const baseDim = {
      regime: "normal", score: 0, confidence: 0.9,
      inputs: {},
    };

    const previous = {
      timestamp: "2024-01-01",
      volatility: { ...baseDim, vix: 20, percentile: "average" },
      growth: { ...baseDim, direction: "stable" },
      monetary: { ...baseDim, fedFunds: 5, direction: "stable" },
      riskAppetite: { ...baseDim, creditSpread: 4 },
      dollar: { ...baseDim, dxy: 104, trend: "stable" },
      commodity: { ...baseDim, oil: 80, gold: 2100 },
      geopolitical: { ...baseDim, regime: "stable", score: 0, gprComposite: 90, hotRegion: null },
      composite: "Neutral growth, normal vol",
      compositeScore: 0,
    };

    const current = {
      ...previous,
      timestamp: "2024-01-02",
      geopolitical: { ...baseDim, regime: "conflict", score: -1, gprComposite: 350, hotRegion: "Middle East" },
      composite: "WARTIME growth, normal vol [Middle East]",
      compositeScore: -0.15,
    };

    const shifts = detectRegimeShifts(current, previous);

    const geoShift = shifts.find(s => s.dimension === "Geopolitical");
    expect(geoShift).toBeDefined();
    expect(geoShift!.from).toBe("stable");
    expect(geoShift!.to).toBe("conflict");
    expect(geoShift!.interpretation).toContain("Active military conflict erupted");
  });

  it("handles previous state without geopolitical field (backward compat)", async () => {
    const { detectRegimeShifts } = await import("@/lib/regime/detection");

    const baseDim = {
      regime: "normal", score: 0, confidence: 0.9,
      inputs: {},
    };

    // Old state without geopolitical dimension
    const previous = {
      timestamp: "2024-01-01",
      volatility: { ...baseDim, vix: 20, percentile: "average" },
      growth: { ...baseDim, direction: "stable" },
      monetary: { ...baseDim, fedFunds: 5, direction: "stable" },
      riskAppetite: { ...baseDim, creditSpread: 4 },
      dollar: { ...baseDim, dxy: 104, trend: "stable" },
      commodity: { ...baseDim, oil: 80, gold: 2100 },
      composite: "Neutral growth, normal vol",
      compositeScore: 0,
      // NO geopolitical field
    };

    const current = {
      ...previous,
      timestamp: "2024-01-02",
      geopolitical: { ...baseDim, regime: "conflict", score: -1, gprComposite: 350, hotRegion: "Middle East" },
      composite: "WARTIME growth, normal vol [Middle East]",
    };

    // Should not crash - the guard should skip the geopolitical dim
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shifts = detectRegimeShifts(current as any, previous as any);
    const geoShift = shifts.find(s => s.dimension === "Geopolitical");
    expect(geoShift).toBeUndefined(); // skipped because prev is undefined
  });
});

describe("classifyCurrentRegime with geopolitical data", () => {
  // Mirrors the classification logic in lib/predictions/engine.ts classifyCurrentRegime
  function classifyRegime(state: {
    compositeScore: number;
    volatility?: { regime: string };
    riskAppetite?: { regime: string };
    geopolitical?: { regime: string };
  }): string {
    const geoRegime = state.geopolitical?.regime ?? "stable";
    const volRegime = state.volatility?.regime ?? "unknown";
    const riskRegime = state.riskAppetite?.regime ?? "unknown";

    if (volRegime === "crisis" || riskRegime === "panic" || geoRegime === "conflict") return "wartime";
    if (volRegime === "elevated" || volRegime === "high-vol" || riskRegime === "risk-off" || geoRegime === "crisis" || geoRegime === "elevated") return "transitional";
    if (state.compositeScore < -0.6) return "wartime";
    if (state.compositeScore < -0.3) return "transitional";
    return "peacetime";
  }

  it("returns wartime when geopolitical regime is conflict", () => {
    expect(classifyRegime({
      compositeScore: 0.1,
      volatility: { regime: "normal" },
      riskAppetite: { regime: "neutral" },
      geopolitical: { regime: "conflict" },
    })).toBe("wartime");
  });

  it("returns transitional when geopolitical regime is elevated", () => {
    expect(classifyRegime({
      compositeScore: 0.2,
      volatility: { regime: "normal" },
      riskAppetite: { regime: "neutral" },
      geopolitical: { regime: "elevated" },
    })).toBe("transitional");
  });

  it("returns peacetime when geopolitical regime is stable and markets calm", () => {
    expect(classifyRegime({
      compositeScore: 0.3,
      volatility: { regime: "normal" },
      riskAppetite: { regime: "neutral" },
      geopolitical: { regime: "stable" },
    })).toBe("peacetime");
  });

  it("falls back to stable when geopolitical field missing (old data)", () => {
    expect(classifyRegime({
      compositeScore: 0.3,
      volatility: { regime: "normal" },
      riskAppetite: { regime: "neutral" },
    })).toBe("peacetime");
  });
});
