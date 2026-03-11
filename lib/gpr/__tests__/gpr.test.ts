import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock DB ──

let mockDbRows: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: () => Promise.resolve(mockDbRows),
        }),
      }),
    }),
  },
  schema: {
    gprReadings: {
      date: "date",
      composite: "composite",
      threats: "threats",
      acts: "acts",
      threatsToActsRatio: "threats_to_acts_ratio",
      id: "id",
      createdAt: "created_at",
    },
  },
}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn((col) => col),
}));

// Mock fetch to return empty GDELT data instantly
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ articles: [] }),
});
vi.stubGlobal("fetch", mockFetch);

import { getGPRSnapshot } from "../index";
import type { GPRSnapshot } from "../index";

// ── Helpers ──

function makeRow(date: string, composite: number, threats: number, acts: number) {
  const ratio = acts > 0 ? Math.round((threats / acts) * 100) / 100 : threats > 0 ? 999 : 1;
  return {
    id: Math.floor(Math.random() * 10000),
    date,
    composite,
    threats,
    acts,
    threatsToActsRatio: ratio,
    createdAt: new Date().toISOString(),
  };
}

function makeSampleRows(count: number) {
  const rows = [];
  const baseDate = new Date("2026-03-09");
  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const composite = 100 + Math.floor(Math.random() * 300);
    const threats = Math.round(composite * 0.6);
    const acts = Math.round(composite * 0.4);
    rows.push(makeRow(dateStr, composite, threats, acts));
  }
  return rows;
}

// ── Tests ──

describe("getGPRSnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles: [] }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function callWithTimers() {
    // Start the snapshot call, then advance timers to flush GDELT delays
    const promise = getGPRSnapshot();
    // 5 regions * 5500ms delays
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(6000);
    }
    return promise;
  }

  it("returns valid snapshot with data from DB", async () => {
    mockDbRows = makeSampleRows(30);

    const snapshot: GPRSnapshot = await callWithTimers();

    expect(snapshot).toBeDefined();
    expect(snapshot.current).toBeDefined();
    expect(snapshot.current.date).toBe("2026-03-09");
    expect(snapshot.current.composite).toBeGreaterThan(0);
    expect(snapshot.history).toHaveLength(30);
    expect(snapshot.history[0].date).toBe("2026-03-09");
    expect(Array.isArray(snapshot.regional)).toBe(true);
    expect(Array.isArray(snapshot.thresholdCrossings)).toBe(true);
    expect(snapshot.lastUpdated).toBeDefined();
  });

  it("returns empty state when DB has no data", async () => {
    mockDbRows = [];

    const snapshot = await callWithTimers();

    expect(snapshot.current.composite).toBe(0);
    expect(snapshot.current.threats).toBe(0);
    expect(snapshot.current.acts).toBe(0);
    expect(snapshot.history).toHaveLength(1);
  });

  it("returns correct current reading as most recent row", async () => {
    mockDbRows = [
      makeRow("2026-03-09", 394.17, 441.22, 589.44),
      makeRow("2026-03-08", 250.01, 194.89, 358.28),
      makeRow("2026-03-07", 279.37, 132.75, 411.14),
    ];

    const snapshot = await callWithTimers();

    expect(snapshot.current.date).toBe("2026-03-09");
    expect(snapshot.current.composite).toBe(394.17);
    expect(snapshot.current.threats).toBe(441.22);
    expect(snapshot.current.acts).toBe(589.44);
  });

  it("detects threshold crossings correctly", async () => {
    mockDbRows = [
      makeRow("2026-03-05", 310, 200, 150),
      makeRow("2026-03-04", 190, 120, 90),
      makeRow("2026-03-03", 145, 90, 70),
      makeRow("2026-03-02", 160, 100, 80),
      makeRow("2026-03-01", 90, 50, 40),
    ];

    const snapshot = await callWithTimers();

    expect(snapshot.thresholdCrossings.length).toBeGreaterThan(0);
    const elevatedCrossing = snapshot.thresholdCrossings.find(
      (tc) => tc.level === "elevated" && tc.direction === "crossed_above"
    );
    expect(elevatedCrossing).toBeDefined();
  });

  it("history is ordered most recent first", async () => {
    mockDbRows = makeSampleRows(10);

    const snapshot = await callWithTimers();

    for (let i = 1; i < snapshot.history.length; i++) {
      expect(snapshot.history[i - 1].date >= snapshot.history[i].date).toBe(true);
    }
  });
});

// ── Threshold crossing unit tests ──

describe("threshold crossing detection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles: [] }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function callWithTimers() {
    const promise = getGPRSnapshot();
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(6000);
    }
    return promise;
  }

  it("detects crossing above extreme (300)", async () => {
    mockDbRows = [
      makeRow("2026-03-03", 350, 200, 150),
      makeRow("2026-03-02", 290, 170, 120),
    ];

    const snapshot = await callWithTimers();
    const extreme = snapshot.thresholdCrossings.find(
      (tc) => tc.level === "extreme" && tc.direction === "crossed_above"
    );
    expect(extreme).toBeDefined();
    expect(extreme!.value).toBe(350);
  });

  it("detects crossing below crisis (200)", async () => {
    mockDbRows = [
      makeRow("2026-03-03", 180, 100, 80),
      makeRow("2026-03-02", 220, 130, 90),
    ];

    const snapshot = await callWithTimers();
    const crisis = snapshot.thresholdCrossings.find(
      (tc) => tc.level === "crisis" && tc.direction === "crossed_below"
    );
    expect(crisis).toBeDefined();
  });

  it("returns no crossings when values stay flat", async () => {
    mockDbRows = [
      makeRow("2026-03-03", 120, 70, 50),
      makeRow("2026-03-02", 115, 65, 50),
      makeRow("2026-03-01", 118, 68, 50),
    ];

    const snapshot = await callWithTimers();
    expect(snapshot.thresholdCrossings).toHaveLength(0);
  });
});

// ── GPR reading structure validation ──

describe("GPR reading structure", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles: [] }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function callWithTimers() {
    const promise = getGPRSnapshot();
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(6000);
    }
    return promise;
  }

  it("every reading has required fields", async () => {
    mockDbRows = makeSampleRows(5);

    const snapshot = await callWithTimers();

    for (const reading of snapshot.history) {
      expect(reading).toHaveProperty("date");
      expect(reading).toHaveProperty("composite");
      expect(reading).toHaveProperty("threats");
      expect(reading).toHaveProperty("acts");
      expect(reading).toHaveProperty("threatsToActsRatio");
      expect(typeof reading.date).toBe("string");
      expect(typeof reading.composite).toBe("number");
      expect(typeof reading.threats).toBe("number");
      expect(typeof reading.acts).toBe("number");
    }
  });

  it("threats-to-acts ratio is calculated correctly", async () => {
    mockDbRows = [makeRow("2026-03-09", 300, 180, 120)];

    const snapshot = await callWithTimers();
    expect(snapshot.current.threatsToActsRatio).toBe(1.5);
  });
});
