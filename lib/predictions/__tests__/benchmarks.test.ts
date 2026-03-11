import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMetaculusQuestions,
  fetchPolymarketQuestions,
  fetchManifoldQuestions,
} from "../benchmarks";

// Mock DB (not needed for fetch tests, but prevents import errors)
vi.mock("../../db", () => ({
  db: {},
  schema: { predictionBenchmarks: {} },
}));

// ── Fetch functions ──

describe("fetchMetaculusQuestions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed questions from Metaculus API", async () => {
    const mockData = {
      results: [
        {
          id: 12345,
          title: "Will NATO expand by 2027?",
          type: "binary",
          community_prediction: { full: { q2: 0.65 } },
          scheduled_close_time: "2027-01-01T00:00:00Z",
        },
        {
          id: 12346,
          title: "Will GDP growth exceed 3%?",
          type: "binary",
          community_prediction: { full: { q2: 0.40 } },
          scheduled_close_time: null,
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const questions = await fetchMetaculusQuestions(2);

    expect(questions).toHaveLength(2);
    expect(questions[0].source).toBe("metaculus");
    expect(questions[0].externalId).toBe("12345");
    expect(questions[0].question).toBe("Will NATO expand by 2027?");
    expect(questions[0].category).toBe("geopolitical"); // NATO → geopolitical
    expect(questions[0].crowdProbability).toBe(0.65);
    expect(questions[0].resolutionDate).toBe("2027-01-01");

    expect(questions[1].category).toBe("market"); // GDP → market
    expect(questions[1].resolutionDate).toBeNull();
  });

  it("filters out non-binary questions", async () => {
    const mockData = {
      results: [
        { id: 1, title: "Test", type: "numeric", community_prediction: 0.5 },
        { id: 2, title: "Binary Q", type: "binary", community_prediction: 0.7 },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const questions = await fetchMetaculusQuestions();
    expect(questions).toHaveLength(1);
    expect(questions[0].externalId).toBe("2");
  });

  it("filters out questions without community_prediction", async () => {
    const mockData = {
      results: [
        { id: 1, title: "No prediction", type: "binary", community_prediction: null },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const questions = await fetchMetaculusQuestions();
    expect(questions).toHaveLength(0);
  });

  it("returns empty array on fetch failure", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const questions = await fetchMetaculusQuestions();
    expect(questions).toEqual([]);
  });

  it("returns empty array on non-OK response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    const questions = await fetchMetaculusQuestions();
    expect(questions).toEqual([]);
  });
});

describe("fetchPolymarketQuestions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed questions from Polymarket API", async () => {
    const mockData = [
      {
        conditionId: "abc123",
        slug: "will-trump-win-2028",
        question: "Will Trump win the 2028 election?",
        outcomePrices: JSON.stringify([0.35, 0.65]),
        endDate: "2028-11-05T00:00:00Z",
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const questions = await fetchPolymarketQuestions(1);

    expect(questions).toHaveLength(1);
    expect(questions[0].source).toBe("polymarket");
    expect(questions[0].externalId).toBe("abc123");
    expect(questions[0].crowdProbability).toBe(0.35);
    expect(questions[0].category).toBe("politics"); // election → politics
    expect(questions[0].resolutionDate).toBe("2028-11-05");
  });

  it("handles malformed outcomePrices gracefully", async () => {
    const mockData = [
      {
        conditionId: "xyz",
        question: "Test AI question about GPT",
        outcomePrices: "not-json",
        endDate: null,
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const questions = await fetchPolymarketQuestions();
    expect(questions).toHaveLength(1);
    expect(questions[0].crowdProbability).toBe(0.5); // default
    expect(questions[0].category).toBe("technology"); // GPT → technology
  });

  it("returns empty array on fetch failure", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("timeout"));
    const questions = await fetchPolymarketQuestions();
    expect(questions).toEqual([]);
  });
});

describe("fetchManifoldQuestions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed questions from Manifold API", async () => {
    const mockData = [
      {
        id: "manifold-123",
        question: "Will a new pandemic emerge by 2027?",
        probability: 0.12,
        creatorUsername: "testuser",
        slug: "new-pandemic-2027",
        closeTime: 1798761600000, // some future timestamp
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const questions = await fetchManifoldQuestions(1);

    expect(questions).toHaveLength(1);
    expect(questions[0].source).toBe("manifold");
    expect(questions[0].externalId).toBe("manifold-123");
    expect(questions[0].crowdProbability).toBe(0.12);
    expect(questions[0].category).toBe("science"); // pandemic → science
    expect(questions[0].externalUrl).toContain("testuser");
    expect(questions[0].resolutionDate).toBeTruthy();
  });

  it("filters out questions without probability", async () => {
    const mockData = [
      { id: "1", question: "No prob", probability: null },
      { id: "2", question: "Has prob about climate change", probability: 0.3 },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const questions = await fetchManifoldQuestions();
    expect(questions).toHaveLength(1);
    expect(questions[0].category).toBe("science"); // climate → science
  });

  it("returns empty array on non-OK response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
    } as Response);
    const questions = await fetchManifoldQuestions();
    expect(questions).toEqual([]);
  });
});

// ── Question categorization (tested indirectly through fetch) ──

describe("question categorization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const testCategorization = async (question: string, expectedCategory: string) => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "1", question, probability: 0.5, creatorUsername: "u", slug: "s", closeTime: null },
      ],
    } as Response);

    const questions = await fetchManifoldQuestions(1);
    expect(questions[0].category).toBe(expectedCategory);
  };

  it("categorizes war/military as geopolitical", async () => {
    await testCategorization("Will there be a military conflict in Taiwan?", "geopolitical");
  });

  it("categorizes nuclear as geopolitical", async () => {
    await testCategorization("Will nuclear weapons be used?", "geopolitical");
  });

  it("categorizes elections as politics", async () => {
    await testCategorization("Will Biden run for re-election?", "politics");
  });

  it("categorizes congress as politics", async () => {
    await testCategorization("Will Congress pass the bill?", "politics");
  });

  it("categorizes inflation as market", async () => {
    await testCategorization("Will inflation exceed 5%?", "market");
  });

  it("categorizes bitcoin as market", async () => {
    await testCategorization("Will Bitcoin reach $100k?", "market");
  });

  it("categorizes AI as technology", async () => {
    await testCategorization("Will AI pass the Turing test?", "technology");
  });

  it("categorizes AGI as technology", async () => {
    await testCategorization("Will AGI be achieved by 2030?", "technology");
  });

  it("categorizes vaccine as science", async () => {
    await testCategorization("Will a universal flu vaccine be approved?", "science");
  });

  it("categorizes climate as science", async () => {
    await testCategorization("Will climate targets be met?", "science");
  });

  it("defaults to general for unrecognized topics", async () => {
    await testCategorization("Will the new restaurant open on time?", "general");
  });
});
