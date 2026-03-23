import { describe, it, expect } from "vitest";
import { normalizeToDateString } from "../engine";

// ── normalizeToDateString ──

describe("normalizeToDateString", () => {
  it("parses YYYYMMDD format (GDELT seendate)", () => {
    expect(normalizeToDateString("20260316")).toBe("2026-03-16");
    expect(normalizeToDateString("20260303T120000Z")).toBe("2026-03-03");
  });

  it("parses YYYY-MM-DD format", () => {
    expect(normalizeToDateString("2026-03-16")).toBe("2026-03-16");
  });

  it("parses full ISO datetime", () => {
    expect(normalizeToDateString("2026-03-16T14:30:00.000Z")).toBe("2026-03-16");
  });

  it("parses RFC 2822 date (Google News RSS pubDate)", () => {
    const result = normalizeToDateString("Mon, 16 Mar 2026 14:30:00 GMT");
    expect(result).toBe("2026-03-16");
  });

  it("returns null for empty or unknown strings", () => {
    expect(normalizeToDateString("")).toBe(null);
    expect(normalizeToDateString("unknown")).toBe(null);
  });

  it("returns null for garbage input", () => {
    expect(normalizeToDateString("not-a-date")).toBe(null);
  });
});

// ── Evidence date-gating logic ──
// These tests verify the filtering behavior that happens inside the tool handlers.
// We extract the core filtering logic and test it directly.

interface Article {
  date: string;
  title: string;
  source: string;
}

interface EvidenceWindow {
  windowStart: string; // YYYY-MM-DD
  windowEnd: string; // YYYY-MM-DD
}

/**
 * Replicates the filtering logic from executeResolutionTool's search_news handler.
 */
function filterArticlesByWindow(
  articles: Article[],
  window: EvidenceWindow
): { kept: Article[]; excluded: Article[] } {
  const kept: Article[] = [];
  const excluded: Article[] = [];

  for (const a of articles) {
    const articleDate = normalizeToDateString(a.date);
    if (!articleDate) {
      // Keep unparseable dates (let AI evaluate)
      kept.push(a);
      continue;
    }
    if (articleDate < window.windowStart || articleDate > window.windowEnd) {
      excluded.push(a);
    } else {
      kept.push(a);
    }
  }

  return { kept, excluded };
}

describe("evidence date-gating filter", () => {
  const window: EvidenceWindow = {
    windowStart: "2026-03-16",
    windowEnd: "2026-03-23",
  };

  it("keeps articles within the prediction window", () => {
    const articles: Article[] = [
      { date: "20260317", title: "Event happened", source: "reuters.com" },
      { date: "20260320", title: "Follow-up report", source: "bbc.com" },
    ];

    const { kept, excluded } = filterArticlesByWindow(articles, window);
    expect(kept).toHaveLength(2);
    expect(excluded).toHaveLength(0);
  });

  it("excludes articles before the prediction was created", () => {
    const articles: Article[] = [
      { date: "20260303", title: "Old article used as false evidence", source: "cnn.com" },
      { date: "20260310", title: "Another pre-creation article", source: "bbc.com" },
      { date: "20260318", title: "Valid in-window article", source: "reuters.com" },
    ];

    const { kept, excluded } = filterArticlesByWindow(articles, window);
    expect(kept).toHaveLength(1);
    expect(kept[0].title).toBe("Valid in-window article");
    expect(excluded).toHaveLength(2);
    expect(excluded[0].date).toBe("20260303");
    expect(excluded[1].date).toBe("20260310");
  });

  it("excludes articles after the deadline", () => {
    const articles: Article[] = [
      { date: "20260318", title: "In window", source: "reuters.com" },
      { date: "20260325", title: "After deadline", source: "bbc.com" },
    ];

    const { kept, excluded } = filterArticlesByWindow(articles, window);
    expect(kept).toHaveLength(1);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].title).toBe("After deadline");
  });

  it("keeps articles on window boundary dates (inclusive)", () => {
    const articles: Article[] = [
      { date: "20260316", title: "On creation date", source: "reuters.com" },
      { date: "20260323", title: "On deadline date", source: "bbc.com" },
    ];

    const { kept, excluded } = filterArticlesByWindow(articles, window);
    expect(kept).toHaveLength(2);
    expect(excluded).toHaveLength(0);
  });

  it("keeps articles with unparseable dates (lets AI evaluate)", () => {
    const articles: Article[] = [
      { date: "unknown", title: "No date available", source: "gdelt.org" },
      { date: "", title: "Empty date", source: "gdelt.org" },
    ];

    const { kept, excluded } = filterArticlesByWindow(articles, window);
    expect(kept).toHaveLength(2);
    expect(excluded).toHaveLength(0);
  });

  it("handles RFC 2822 dates from Google News RSS", () => {
    const articles: Article[] = [
      { date: "Tue, 03 Mar 2026 10:00:00 GMT", title: "Pre-creation via RSS", source: "cnn.com" },
      { date: "Wed, 18 Mar 2026 14:00:00 GMT", title: "In-window via RSS", source: "bbc.com" },
    ];

    const { kept, excluded } = filterArticlesByWindow(articles, window);
    expect(kept).toHaveLength(1);
    expect(kept[0].title).toBe("In-window via RSS");
    expect(excluded).toHaveLength(1);
    expect(excluded[0].title).toBe("Pre-creation via RSS");
  });

  it("reproduces the bug scenario: prediction #279 created March 16, March 3 article excluded", () => {
    // This is the exact bug report scenario
    const prediction279Window: EvidenceWindow = {
      windowStart: "2026-03-16",
      windowEnd: "2026-03-23",
    };

    const articles: Article[] = [
      { date: "20260303", title: "March 3 article cited as confirming evidence", source: "example.com" },
      { date: "20260318", title: "Legitimate in-window evidence", source: "reuters.com" },
    ];

    const { kept, excluded } = filterArticlesByWindow(articles, prediction279Window);

    // The March 3 article (13 days before creation) must be excluded
    expect(excluded).toHaveLength(1);
    expect(excluded[0].date).toBe("20260303");

    // Only the in-window article should remain
    expect(kept).toHaveLength(1);
    expect(kept[0].title).toBe("Legitimate in-window evidence");
  });

  it("excludes all articles when none fall within the window", () => {
    const articles: Article[] = [
      { date: "20260301", title: "Too early", source: "a.com" },
      { date: "20260305", title: "Also too early", source: "b.com" },
      { date: "20260330", title: "Too late", source: "c.com" },
    ];

    const { kept, excluded } = filterArticlesByWindow(articles, window);
    expect(kept).toHaveLength(0);
    expect(excluded).toHaveLength(3);
  });
});

// ── Evidence window computation ──

describe("evidence window computation", () => {
  it("computes broadest window from multiple predictions", () => {
    const due = [
      { createdAt: "2026-03-16T10:00:00Z", deadline: "2026-03-23" },
      { createdAt: "2026-03-10T10:00:00Z", deadline: "2026-03-20" },
      { createdAt: "2026-03-18T10:00:00Z", deadline: "2026-03-25" },
    ];

    const windowStart = due.reduce((earliest, p) => {
      const created = p.createdAt.split("T")[0];
      return created < earliest ? created : earliest;
    }, due[0].createdAt.split("T")[0]);

    const windowEnd = due.reduce((latest, p) => {
      return p.deadline > latest ? p.deadline : latest;
    }, due[0].deadline);

    expect(windowStart).toBe("2026-03-10");
    expect(windowEnd).toBe("2026-03-25");
  });

  it("uses single prediction's window when only one is due", () => {
    const due = [
      { createdAt: "2026-03-16T10:00:00Z", deadline: "2026-03-23" },
    ];

    const windowStart = due[0].createdAt.split("T")[0];
    const windowEnd = due[0].deadline;

    expect(windowStart).toBe("2026-03-16");
    expect(windowEnd).toBe("2026-03-23");
  });
});
