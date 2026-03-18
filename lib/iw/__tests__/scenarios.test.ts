import { describe, it, expect } from "vitest";
import { THREAT_SCENARIOS, getScenario, getAllScenarios } from "../scenarios";

describe("THREAT_SCENARIOS", () => {
  it("has at least 5 predefined threat scenarios", () => {
    expect(THREAT_SCENARIOS.length).toBeGreaterThanOrEqual(5);
  });

  it("all scenarios have unique IDs", () => {
    const ids = THREAT_SCENARIOS.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all scenarios have required fields", () => {
    for (const scenario of THREAT_SCENARIOS) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.name).toBeTruthy();
      expect(scenario.description).toBeTruthy();
      expect(scenario.region).toBeTruthy();
      expect(scenario.actors.length).toBeGreaterThan(0);
      expect(scenario.indicators.length).toBeGreaterThan(0);
      expect(scenario.escalationLevels.length).toBeGreaterThanOrEqual(5);
      expect(scenario.marketSectors.length).toBeGreaterThan(0);
      expect(scenario.historicalPrecedent).toBeTruthy();
    }
  });

  it("all indicators have unique IDs within their scenario", () => {
    for (const scenario of THREAT_SCENARIOS) {
      const ids = scenario.indicators.map(i => i.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });

  it("all indicators have valid weights (1-10)", () => {
    for (const scenario of THREAT_SCENARIOS) {
      for (const indicator of scenario.indicators) {
        expect(indicator.weight).toBeGreaterThanOrEqual(1);
        expect(indicator.weight).toBeLessThanOrEqual(10);
      }
    }
  });

  it("all indicators have detection query keywords", () => {
    for (const scenario of THREAT_SCENARIOS) {
      for (const indicator of scenario.indicators) {
        expect(indicator.detectionQuery.trim().length).toBeGreaterThan(0);
        // Detection query should have multiple keywords for matching
        const words = indicator.detectionQuery.split(/\s+/);
        expect(words.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("escalation levels are in ascending order", () => {
    for (const scenario of THREAT_SCENARIOS) {
      for (let i = 1; i < scenario.escalationLevels.length; i++) {
        expect(scenario.escalationLevels[i].level).toBeGreaterThan(scenario.escalationLevels[i - 1].level);
        expect(scenario.escalationLevels[i].thresholdPercent).toBeGreaterThanOrEqual(scenario.escalationLevels[i - 1].thresholdPercent);
      }
    }
  });

  it("first escalation level starts at 0%", () => {
    for (const scenario of THREAT_SCENARIOS) {
      expect(scenario.escalationLevels[0].thresholdPercent).toBe(0);
    }
  });

  it("Middle East Regional War scenario has Hormuz blockade indicator", () => {
    const mewar = THREAT_SCENARIOS.find(s => s.id === "mideast-regional-war");
    expect(mewar).toBeDefined();
    const hormuz = mewar!.indicators.find(i => i.id === "me-12");
    expect(hormuz).toBeDefined();
    expect(hormuz!.title).toContain("Hormuz");
    expect(hormuz!.weight).toBe(10); // max weight
  });

  it("Global Energy Crisis scenario has OPEC indicator", () => {
    const energy = THREAT_SCENARIOS.find(s => s.id === "energy-crisis");
    expect(energy).toBeDefined();
    const opec = energy!.indicators.find(i => i.detectionQuery.includes("OPEC"));
    expect(opec).toBeDefined();
  });
});

describe("getScenario", () => {
  it("returns scenario by valid ID", () => {
    const scenario = getScenario("taiwan-strait");
    expect(scenario).toBeDefined();
    expect(scenario!.name).toBe("Taiwan Strait Crisis");
  });

  it("returns undefined for invalid ID", () => {
    expect(getScenario("nonexistent")).toBeUndefined();
  });
});

describe("getAllScenarios", () => {
  it("returns all scenarios", () => {
    const all = getAllScenarios();
    expect(all.length).toBe(THREAT_SCENARIOS.length);
  });
});
