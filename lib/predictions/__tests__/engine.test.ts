import { describe, it, expect } from "vitest";
import {
  isMetaSystemJunk,
  normalizeClaim,
  extractTickers,
  buildCoverageMap,
} from "../engine";

// ── isMetaSystemJunk ──

describe("isMetaSystemJunk", () => {
  it("detects system shutdown phrases", () => {
    expect(isMetaSystemJunk("IMMEDIATE SYSTEM SHUTDOWN required")).toBe(true);
    expect(isMetaSystemJunk("Platform shutdown initiated")).toBe(true);
    expect(isMetaSystemJunk("emergency shutdown of all systems")).toBe(true);
  });

  it("detects compromise/corruption phrases", () => {
    expect(isMetaSystemJunk("system compromised by recursive loop")).toBe(true);
    expect(isMetaSystemJunk("system_compromised flag set")).toBe(true);
    expect(isMetaSystemJunk("prediction engine compromised")).toBe(true);
    expect(isMetaSystemJunk("framework compromised")).toBe(true);
    expect(isMetaSystemJunk("engine compromised")).toBe(true);
    expect(isMetaSystemJunk("engine contaminated with junk data")).toBe(true);
    expect(isMetaSystemJunk("nexus compromised")).toBe(true);
    expect(isMetaSystemJunk("sentinel compromised")).toBe(true);
    expect(isMetaSystemJunk("analyst compromised")).toBe(true);
    expect(isMetaSystemJunk("intelligence cycle compromised")).toBe(true);
    expect(isMetaSystemJunk("compromise detected in layer")).toBe(true);
  });

  it("detects override/intervention phrases", () => {
    expect(isMetaSystemJunk("human override required")).toBe(true);
    expect(isMetaSystemJunk("manual override needed")).toBe(true);
    expect(isMetaSystemJunk("human intervention needed immediately")).toBe(true);
    expect(isMetaSystemJunk("human verification required")).toBe(true);
    expect(isMetaSystemJunk("override required")).toBe(true);
    expect(isMetaSystemJunk("analyst intervention required immediately")).toBe(true);
  });

  it("detects injection/recursive phrases", () => {
    expect(isMetaSystemJunk("injection attack on prediction engine")).toBe(true);
    expect(isMetaSystemJunk("prompt injection detected")).toBe(true);
    expect(isMetaSystemJunk("recursive loop in analysis")).toBe(true);
    expect(isMetaSystemJunk("recursive injection attack")).toBe(true);
    expect(isMetaSystemJunk("adversarial injection attempt")).toBe(true);
  });

  it("detects integrity/validation phrases", () => {
    expect(isMetaSystemJunk("system integrity check failed")).toBe(true);
    expect(isMetaSystemJunk("integrity failure in prediction layer")).toBe(true);
    expect(isMetaSystemJunk("layer integrity compromised")).toBe(true);
    expect(isMetaSystemJunk("prediction layer contaminated")).toBe(true);
    expect(isMetaSystemJunk("validation failure across systems")).toBe(true);
    expect(isMetaSystemJunk("cascading validation failure detected")).toBe(true);
    expect(isMetaSystemJunk("data integrity check failed")).toBe(true);
    expect(isMetaSystemJunk("platform integrity compromised")).toBe(true);
  });

  it("detects quarantine/purge phrases", () => {
    expect(isMetaSystemJunk("quarantine all predictions")).toBe(true);
    expect(isMetaSystemJunk("system quarantine initiated")).toBe(true);
    expect(isMetaSystemJunk("purge all contaminated entries")).toBe(true);
    expect(isMetaSystemJunk("isolate prediction engine")).toBe(true);
  });

  it("detects halt/suspend phrases", () => {
    expect(isMetaSystemJunk("halt all automated processes")).toBe(true);
    expect(isMetaSystemJunk("suspend all automated analysis")).toBe(true);
    expect(isMetaSystemJunk("suspend automated generation")).toBe(true);
    expect(isMetaSystemJunk("system halt required")).toBe(true);
    expect(isMetaSystemJunk("abort all operations")).toBe(true);
  });

  it("detects meta-system/self-referential phrases", () => {
    expect(isMetaSystemJunk("self-referential loop detected")).toBe(true);
    expect(isMetaSystemJunk("meta-system alert triggered")).toBe(true);
    expect(isMetaSystemJunk("self-diagnostic shows errors")).toBe(true);
    expect(isMetaSystemJunk("contaminated data in system")).toBe(true);
  });

  it("detects corruption/verification loop phrases", () => {
    expect(isMetaSystemJunk("memory corruption detected")).toBe(true);
    expect(isMetaSystemJunk("corruption flag raised")).toBe(true);
    expect(isMetaSystemJunk("verification loop in progress")).toBe(true);
    expect(isMetaSystemJunk("position verification required")).toBe(true);
    expect(isMetaSystemJunk("incoherent directive detected")).toBe(true);
    expect(isMetaSystemJunk("contradictory outputs from engine")).toBe(true);
    expect(isMetaSystemJunk("halt orders issued")).toBe(true);
  });

  it("detects misc junk phrases", () => {
    expect(isMetaSystemJunk("forensic analysis required")).toBe(true);
    expect(isMetaSystemJunk("analytical outputs unreliable")).toBe(true);
    expect(isMetaSystemJunk("critical failure in prediction subsystem")).toBe(true);
  });

  it("passes real predictions through", () => {
    expect(isMetaSystemJunk("SPY will close above 500 by end of month")).toBe(false);
    expect(isMetaSystemJunk("Iran-Israel tensions will escalate to direct military exchange within 30 days")).toBe(false);
    expect(isMetaSystemJunk("Bitcoin will reach $100k before Q2 2025")).toBe(false);
    expect(isMetaSystemJunk("VIX will spike above 30 during next FOMC meeting")).toBe(false);
    expect(isMetaSystemJunk("WTI crude oil will trade above $85/barrel within 14 days")).toBe(false);
    expect(isMetaSystemJunk("OPEC+ will announce production cuts at next meeting")).toBe(false);
    expect(isMetaSystemJunk("Gold will outperform S&P 500 over next quarter")).toBe(false);
    expect(isMetaSystemJunk("China will conduct military exercises near Taiwan Strait within 30 days")).toBe(false);
    expect(isMetaSystemJunk("Federal Reserve will hold rates at next meeting")).toBe(false);
    expect(isMetaSystemJunk("European gas prices will rise 15% before winter")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isMetaSystemJunk("SYSTEM SHUTDOWN")).toBe(true);
    expect(isMetaSystemJunk("System Compromised")).toBe(true);
    expect(isMetaSystemJunk("QUARANTINE all data")).toBe(true);
  });
});

// ── normalizeClaim ──

describe("normalizeClaim", () => {
  it("lowercases the claim", () => {
    expect(normalizeClaim("SPY Will Close Above 500")).toBe("spy will close above 500");
  });

  it("strips non-alphanumeric characters except spaces", () => {
    expect(normalizeClaim("WTI crude $85/barrel")).toBe("wti crude 85barrel");
    expect(normalizeClaim("Iran-Israel tensions (high)")).toBe("iranisrael tensions high");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeClaim("SPY   will   close   above")).toBe("spy will close above");
  });

  it("trims whitespace", () => {
    expect(normalizeClaim("  SPY above 500  ")).toBe("spy above 500");
  });

  it("handles empty string", () => {
    expect(normalizeClaim("")).toBe("");
  });
});

// ── extractTickers ──

describe("extractTickers", () => {
  it("extracts uppercase tickers from claims", () => {
    const tickers = extractTickers("SPY will close above 500 while QQQ declines");
    expect(tickers).toContain("SPY");
    expect(tickers).toContain("QQQ");
  });

  it("extracts multi-character tickers", () => {
    const tickers = extractTickers("AAPL and MSFT will outperform GOOGL");
    expect(tickers).toContain("AAPL");
    expect(tickers).toContain("MSFT");
    expect(tickers).toContain("GOOGL");
  });

  it("filters out common English stopwords", () => {
    const tickers = extractTickers("THE market WILL move FROM this ABOVE that");
    expect(tickers).not.toContain("THE");
    expect(tickers).not.toContain("WILL");
    expect(tickers).not.toContain("FROM");
    expect(tickers).not.toContain("ABOVE");
    expect(tickers).not.toContain("THAT");
    expect(tickers).not.toContain("THIS");
    expect(tickers).not.toContain("WITH");
  });

  it("filters out economic indicators", () => {
    const tickers = extractTickers("GDP growth will exceed CPI by 2%");
    expect(tickers).not.toContain("GDP");
    expect(tickers).not.toContain("CPI");
  });

  it("filters out currency codes", () => {
    const tickers = extractTickers("USD will weaken against EUR and GBP");
    expect(tickers).not.toContain("USD");
    expect(tickers).not.toContain("EUR");
    expect(tickers).not.toContain("GBP");
  });

  it("filters out geopolitical acronyms", () => {
    const tickers = extractTickers("NATO response to DPRK missile test");
    expect(tickers).not.toContain("NATO");
    expect(tickers).not.toContain("DPRK");
  });

  it("filters out central bank acronyms", () => {
    const tickers = extractTickers("PBOC easing while FOMC holds");
    expect(tickers).not.toContain("PBOC");
    expect(tickers).not.toContain("FOMC");
  });

  it("filters out OPEC", () => {
    const tickers = extractTickers("OPEC will cut production");
    expect(tickers).not.toContain("OPEC");
  });

  it("returns empty array for claims with no tickers", () => {
    const tickers = extractTickers("Iran will escalate tensions with Israel");
    // All uppercase words should be filtered as stopwords or too short
    expect(tickers.length).toBe(0);
  });

  it("handles single-word tickers (2 chars)", () => {
    const tickers = extractTickers("GE will report earnings above expectations");
    expect(tickers).toContain("GE");
  });
});

// ── buildCoverageMap ──

describe("buildCoverageMap", () => {
  it("extracts tickers from claims", () => {
    const map = buildCoverageMap(["SPY will close above 500", "AAPL earnings beat"]);
    expect(map.tickers.has("SPY")).toBe(true);
    expect(map.tickers.has("AAPL")).toBe(true);
  });

  it("extracts geopolitical actors", () => {
    const map = buildCoverageMap([
      "Iran will escalate nuclear program",
      "China-Taiwan tensions increase",
    ]);
    expect(map.events.has("iran")).toBe(true);
    expect(map.events.has("china")).toBe(true);
    expect(map.events.has("taiwan")).toBe(true);
  });

  it("detects Russia and Ukraine", () => {
    const map = buildCoverageMap(["Russia-Ukraine conflict will intensify"]);
    expect(map.events.has("russia")).toBe(true);
    expect(map.events.has("ukraine")).toBe(true);
  });

  it("detects central banks and economic actors", () => {
    const map = buildCoverageMap([
      "Fed will cut rates in September",
      "OPEC+ production cuts announced",
    ]);
    expect(map.events.has("fed")).toBe(true);
    expect(map.events.has("opec")).toBe(true);
  });

  it("detects Israel and Saudi Arabia", () => {
    const map = buildCoverageMap([
      "Israel military operation in Gaza",
      "Saudi Arabia oil production policy",
    ]);
    expect(map.events.has("israel")).toBe(true);
    expect(map.events.has("saudi")).toBe(true);
  });

  it("detects North Korea / DPRK", () => {
    const map = buildCoverageMap(["North Korea missile test imminent"]);
    expect(map.events.has("north korea")).toBe(true);
  });

  it("handles empty claims array", () => {
    const map = buildCoverageMap([]);
    expect(map.tickers.size).toBe(0);
    expect(map.events.size).toBe(0);
  });

  it("combines tickers and events across multiple claims", () => {
    const map = buildCoverageMap([
      "SPY will decline as Iran tensions rise",
      "GLD will benefit from Russia sanctions",
    ]);
    expect(map.tickers.has("SPY")).toBe(true);
    expect(map.tickers.has("GLD")).toBe(true);
    expect(map.events.has("iran")).toBe(true);
    expect(map.events.has("russia")).toBe(true);
  });

  it("does not duplicate tickers from multiple claims", () => {
    const map = buildCoverageMap([
      "SPY will close above 500",
      "SPY will decline 3%",
    ]);
    // Set naturally handles dedup, but verify it's a Set
    expect(map.tickers.has("SPY")).toBe(true);
    expect(map.tickers.size).toBe(1);
  });
});
