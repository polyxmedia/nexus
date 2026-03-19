import { describe, it, expect } from "vitest";
import { CONFLICT_ZONES, CHOKEPOINT_INTEL, STRATEGIC_LOCATIONS } from "../geo-constants";

describe("Conflict Zones", () => {
  it("has all expected zones", () => {
    const ids = CONFLICT_ZONES.map(z => z.id);
    // Original 5
    expect(ids).toContain("taiwan-strait");
    expect(ids).toContain("hormuz");
    expect(ids).toContain("persian-gulf");
    expect(ids).toContain("ukraine");
    expect(ids).toContain("korean-peninsula");
    // New 5
    expect(ids).toContain("south-china-sea");
    expect(ids).toContain("baltic-sea");
    expect(ids).toContain("red-sea");
    expect(ids).toContain("east-med");
    expect(ids).toContain("arctic");
  });

  it("has unique IDs", () => {
    const ids = CONFLICT_ZONES.map(z => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all zones have valid escalation levels (1-5)", () => {
    for (const zone of CONFLICT_ZONES) {
      expect(zone.escalationLevel).toBeGreaterThanOrEqual(1);
      expect(zone.escalationLevel).toBeLessThanOrEqual(5);
    }
  });

  it("all zones have positive radius", () => {
    for (const zone of CONFLICT_ZONES) {
      expect(zone.radiusKm).toBeGreaterThan(0);
    }
  });

  it("all zones have valid coordinates", () => {
    for (const zone of CONFLICT_ZONES) {
      expect(zone.center.lat).toBeGreaterThanOrEqual(-90);
      expect(zone.center.lat).toBeLessThanOrEqual(90);
      expect(zone.center.lng).toBeGreaterThanOrEqual(-180);
      expect(zone.center.lng).toBeLessThanOrEqual(180);
    }
  });

  it("all zones have a scenarioId", () => {
    for (const zone of CONFLICT_ZONES) {
      expect(zone.scenarioId).toBeTruthy();
    }
  });

  it("Red Sea is rated escalation 5 (active Houthi zone)", () => {
    const redSea = CONFLICT_ZONES.find(z => z.id === "red-sea");
    expect(redSea?.escalationLevel).toBe(5);
  });

  it("Arctic is rated escalation 1 (low current tension)", () => {
    const arctic = CONFLICT_ZONES.find(z => z.id === "arctic");
    expect(arctic?.escalationLevel).toBe(1);
  });
});

describe("Chokepoint Intel", () => {
  it("has all 4 chokepoints", () => {
    const ids = Object.keys(CHOKEPOINT_INTEL);
    expect(ids).toContain("hormuz-choke");
    expect(ids).toContain("malacca-choke");
    expect(ids).toContain("suez-choke");
    expect(ids).toContain("bab-el-mandeb");
  });

  it("all chokepoints have valid threat levels (1-5)", () => {
    for (const cp of Object.values(CHOKEPOINT_INTEL)) {
      expect(cp.threatLevel).toBeGreaterThanOrEqual(1);
      expect(cp.threatLevel).toBeLessThanOrEqual(5);
    }
  });

  it("all chokepoints have oil flow data", () => {
    for (const cp of Object.values(CHOKEPOINT_INTEL)) {
      expect(cp.oilFlowMbpd).toBeGreaterThan(0);
    }
  });
});

describe("Strategic Locations", () => {
  it("includes both institutions and chokepoints", () => {
    const types = new Set(STRATEGIC_LOCATIONS.map(l => l.type));
    expect(types.has("institution")).toBe(true);
    expect(types.has("chokepoint")).toBe(true);
  });

  it("all locations have valid coordinates", () => {
    for (const loc of STRATEGIC_LOCATIONS) {
      expect(loc.coords.lat).toBeGreaterThanOrEqual(-90);
      expect(loc.coords.lat).toBeLessThanOrEqual(90);
      expect(loc.coords.lng).toBeGreaterThanOrEqual(-180);
      expect(loc.coords.lng).toBeLessThanOrEqual(180);
    }
  });
});
