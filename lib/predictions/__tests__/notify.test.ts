import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
  schema: {
    alerts: { id: "id", name: "name" },
    alertHistory: {},
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ _tag: "eq", args })),
}));

const mockBroadcastAlert = vi.fn();
const mockFormatNewPredictionsAlert = vi.fn();

vi.mock("@/lib/telegram/alerts", () => ({
  broadcastAlert: (...args: unknown[]) => mockBroadcastAlert(...args),
  formatNewPredictionsAlert: (...args: unknown[]) => mockFormatNewPredictionsAlert(...args),
}));

// ── Import after mocks ──

import { notifyNewPredictions } from "../notify";

// ── Helpers ──

function makePrediction(overrides: Partial<{
  id: number;
  claim: string;
  category: string;
  confidence: number;
  deadline: string;
  direction: string | null;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    claim: overrides.claim ?? "SPY will close above 500 by end of month",
    category: overrides.category ?? "market",
    confidence: overrides.confidence ?? 0.65,
    deadline: overrides.deadline ?? "2026-04-01",
    direction: overrides.direction ?? "up",
  };
}

// ── Tests ──

describe("notifyNewPredictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: system alert already exists
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ id: 42 }]);

    // Insert returns successfully
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: 1 }]);

    // Telegram broadcast succeeds
    mockBroadcastAlert.mockResolvedValue(2);
    mockFormatNewPredictionsAlert.mockReturnValue("<b>NEW PREDICTIONS</b>");
  });

  it("returns 0 for empty predictions array", async () => {
    const result = await notifyNewPredictions([]);
    expect(result).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockBroadcastAlert).not.toHaveBeenCalled();
  });

  it("creates in-app alert history entry", async () => {
    const predictions = [makePrediction()];
    await notifyNewPredictions(predictions);

    // Should insert into alertHistory
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        alertId: 42,
        title: "1 new prediction generated",
        severity: 2,
      })
    );
  });

  it("uses plural title for multiple predictions", async () => {
    const predictions = [
      makePrediction({ id: 1 }),
      makePrediction({ id: 2, claim: "GLD above 2500" }),
      makePrediction({ id: 3, claim: "Oil rises 10%" }),
    ];
    await notifyNewPredictions(predictions);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "3 new predictions generated",
      })
    );
  });

  it("broadcasts via Telegram with prediction_generated type", async () => {
    const predictions = [makePrediction()];
    await notifyNewPredictions(predictions);

    expect(mockFormatNewPredictionsAlert).toHaveBeenCalledWith(predictions);
    expect(mockBroadcastAlert).toHaveBeenCalledWith(
      "prediction_generated",
      "<b>NEW PREDICTIONS</b>"
    );
  });

  it("returns the number of notified users from Telegram", async () => {
    mockBroadcastAlert.mockResolvedValue(5);
    const result = await notifyNewPredictions([makePrediction()]);
    expect(result).toBe(5);
  });

  it("creates system alert if none exists", async () => {
    // No existing system alert
    mockWhere.mockResolvedValue([]);
    // Insert of system alert returns new id
    mockValues.mockReturnValueOnce({ returning: () => Promise.resolve([{ id: 99 }]) });

    const predictions = [makePrediction()];
    await notifyNewPredictions(predictions);

    // Should have inserted the system alert first, then the history entry
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("stores prediction IDs and categories in alert data", async () => {
    const predictions = [
      makePrediction({ id: 10, category: "market" }),
      makePrediction({ id: 11, category: "geopolitical", claim: "Iran escalation" }),
    ];
    await notifyNewPredictions(predictions);

    const historyCall = mockValues.mock.calls[0][0];
    const data = JSON.parse(historyCall.data);
    expect(data.type).toBe("prediction_generated");
    expect(data.count).toBe(2);
    expect(data.predictionIds).toContain(10);
    expect(data.predictionIds).toContain(11);
    expect(data.categories).toContain("market");
    expect(data.categories).toContain("geopolitical");
  });

  it("includes top 3 predictions by confidence in message", async () => {
    const predictions = [
      makePrediction({ id: 1, confidence: 0.40, claim: "Low confidence prediction" }),
      makePrediction({ id: 2, confidence: 0.75, claim: "High confidence prediction" }),
      makePrediction({ id: 3, confidence: 0.60, claim: "Medium confidence prediction" }),
    ];
    await notifyNewPredictions(predictions);

    const historyCall = mockValues.mock.calls[0][0];
    // Message should contain the highest confidence first
    expect(historyCall.message).toContain("75%");
  });

  it("continues Telegram broadcast even if in-app notification fails", async () => {
    // Make the alert history insert fail
    mockWhere.mockRejectedValue(new Error("DB error"));

    const predictions = [makePrediction()];
    await notifyNewPredictions(predictions);

    // Telegram should still be called
    expect(mockBroadcastAlert).toHaveBeenCalledWith(
      "prediction_generated",
      expect.any(String)
    );
  });

  it("returns 0 if Telegram broadcast fails", async () => {
    mockBroadcastAlert.mockRejectedValue(new Error("Telegram down"));
    const result = await notifyNewPredictions([makePrediction()]);
    expect(result).toBe(0);
  });

  it("handles predictions without IDs gracefully", async () => {
    const predictions = [
      { claim: "Test claim", category: "market", confidence: 0.5, deadline: "2026-04-01", direction: null },
    ];
    await notifyNewPredictions(predictions);

    const historyCall = mockValues.mock.calls[0][0];
    const data = JSON.parse(historyCall.data);
    // IDs should be filtered out (no undefined in array)
    expect(data.predictionIds).toEqual([]);
  });
});
