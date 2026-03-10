import { describe, it, expect } from "vitest";
import { formatNewPredictionsAlert, ALERT_TYPES } from "../alerts";

// ── formatNewPredictionsAlert ──

describe("formatNewPredictionsAlert", () => {
  it("shows count of predictions", () => {
    const result = formatNewPredictionsAlert([
      { claim: "SPY above 500", category: "market", confidence: 0.65, deadline: "2026-04-01" },
      { claim: "Iran escalation", category: "geopolitical", confidence: 0.55, deadline: "2026-04-15" },
    ]);
    expect(result).toContain("2 new predictions");
  });

  it("uses singular for single prediction", () => {
    const result = formatNewPredictionsAlert([
      { claim: "SPY above 500", category: "market", confidence: 0.65, deadline: "2026-04-01" },
    ]);
    expect(result).toContain("1 new prediction ");
    expect(result).not.toContain("1 new predictions");
  });

  it("shows category breakdown", () => {
    const result = formatNewPredictionsAlert([
      { claim: "SPY above 500", category: "market", confidence: 0.65, deadline: "2026-04-01" },
      { claim: "GLD above 2500", category: "market", confidence: 0.55, deadline: "2026-04-01" },
      { claim: "Iran tensions", category: "geopolitical", confidence: 0.50, deadline: "2026-04-15" },
    ]);
    expect(result).toContain("market: 2");
    expect(result).toContain("geopolitical: 1");
  });

  it("shows top 3 highest-confidence predictions", () => {
    const predictions = [
      { claim: "Low conf pred", category: "market", confidence: 0.30, deadline: "2026-04-01" },
      { claim: "High conf pred", category: "market", confidence: 0.80, deadline: "2026-04-01" },
      { claim: "Mid conf pred", category: "market", confidence: 0.55, deadline: "2026-04-01" },
      { claim: "Another mid pred", category: "market", confidence: 0.60, deadline: "2026-04-01" },
    ];
    const result = formatNewPredictionsAlert(predictions);
    // Should contain 80%, 60%, 55% but not 30%
    expect(result).toContain("80%");
    expect(result).toContain("60%");
    expect(result).toContain("55%");
    expect(result).not.toContain("30%");
  });

  it("includes direction when available", () => {
    const result = formatNewPredictionsAlert([
      { claim: "SPY above 500", category: "market", confidence: 0.65, deadline: "2026-04-01", direction: "up" },
    ]);
    expect(result).toContain("[UP]");
  });

  it("omits direction tag when null", () => {
    const result = formatNewPredictionsAlert([
      { claim: "Iran tensions", category: "geopolitical", confidence: 0.50, deadline: "2026-04-15" },
    ]);
    expect(result).not.toContain("[UP]");
    expect(result).not.toContain("[DOWN]");
    expect(result).not.toContain("[FLAT]");
  });

  it("truncates long claims to 80 chars", () => {
    const longClaim = "A".repeat(120);
    const result = formatNewPredictionsAlert([
      { claim: longClaim, category: "market", confidence: 0.65, deadline: "2026-04-01" },
    ]);
    expect(result).toContain("...");
    // Should not contain the full 120-char claim
    expect(result).not.toContain(longClaim);
  });

  it("includes deadline", () => {
    const result = formatNewPredictionsAlert([
      { claim: "SPY above 500", category: "market", confidence: 0.65, deadline: "2026-04-01" },
    ]);
    expect(result).toContain("2026-04-01");
  });

  it("includes HTML formatting for Telegram", () => {
    const result = formatNewPredictionsAlert([
      { claim: "SPY above 500", category: "market", confidence: 0.65, deadline: "2026-04-01" },
    ]);
    expect(result).toContain("<b>NEW PREDICTIONS GENERATED</b>");
    expect(result).toContain("<b>Highest confidence:</b>");
    expect(result).toContain("nexushq.xyz/predictions");
  });
});

// ── Alert type registration ──

describe("ALERT_TYPES", () => {
  it("includes prediction_generated alert type", () => {
    const predGenType = ALERT_TYPES.find((t) => t.id === "prediction_generated");
    expect(predGenType).toBeDefined();
    expect(predGenType!.global).toBe(true);
    expect(predGenType!.label).toBe("New Predictions");
  });

  it("prediction_generated is listed after prediction_resolved", () => {
    const resolvedIdx = ALERT_TYPES.findIndex((t) => t.id === "prediction_resolved");
    const generatedIdx = ALERT_TYPES.findIndex((t) => t.id === "prediction_generated");
    expect(resolvedIdx).toBeGreaterThanOrEqual(0);
    expect(generatedIdx).toBeGreaterThan(resolvedIdx);
  });
});
