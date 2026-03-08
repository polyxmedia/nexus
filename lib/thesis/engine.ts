import Anthropic from "@anthropic-ai/sdk";
import { loadPrompt } from "@/lib/prompts/loader";
import { computeTechnicalSnapshot } from "../market-data/indicators";
import { getDailySeries } from "../market-data/alpha-vantage";
import { getMarketSentiment } from "../market-data/sentiment";
import { SCENARIOS } from "../game-theory/actors";
import { analyzeScenario } from "../game-theory/analysis";
import { db, schema } from "../db";
import { eq, desc, and, gte } from "drizzle-orm";
import type {
  Thesis,
  TradingAction,
  ThesisLayerInput,
  TechnicalSnapshot,
  MarketSentiment,
  GameTheoryAnalysis,
} from "./types";
import { getModel } from "@/lib/ai/model";

export async function generateThesis(symbols: string[]): Promise<Thesis> {
  // 1. Gather settings
  const anthropicKeyRows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "anthropic_api_key"));

  const anthropicApiKey = anthropicKeyRows[0]?.value || process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey) {
    throw new Error("Anthropic API key not configured");
  }

  const alphaVantageKeyRows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "alpha_vantage_api_key"));

  const alphaVantageApiKey = alphaVantageKeyRows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY;

  // 2. Gather market data (if API key available)
  const technicalSnapshots: TechnicalSnapshot[] = [];
  if (alphaVantageApiKey) {
    for (const symbol of symbols) {
      try {
        const dailyData = await getDailySeries(symbol, alphaVantageApiKey);
        const ohlcv = dailyData.map((d) => ({
          date: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));
        const snapshot = computeTechnicalSnapshot(symbol, ohlcv);
        technicalSnapshots.push(snapshot);

        // Cache snapshot
        await db.insert(schema.marketSnapshots)
          .values({
            symbol,
            snapshot: JSON.stringify(snapshot),
          })
          ;
      } catch {
        // Skip symbols that fail
      }
    }
  }

  // 3. Gather sentiment
  let sentiment: MarketSentiment | null = null;
  if (alphaVantageApiKey) {
    try {
      sentiment = await getMarketSentiment(alphaVantageApiKey);
    } catch {
      // Sentiment is optional
    }
  }

  // 4. Gather signal data
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const activeSignals = await db
    .select()
    .from(schema.signals)
    .where(
      and(
        gte(schema.signals.date, today),
      )
    )
    .orderBy(schema.signals.date)
    .limit(20);

  const celestialEvents = activeSignals
    .filter((s) => s.celestialType)
    .map((s) => s.celestialType!);
  const hebrewHolidays = activeSignals
    .filter((s) => s.hebrewHoliday)
    .map((s) => s.hebrewHoliday!);
  const geopoliticalEvents = activeSignals
    .filter((s) => s.geopoliticalContext)
    .map((s) => s.geopoliticalContext!);

  const convergenceIntensity =
    activeSignals.length > 0
      ? activeSignals.reduce((sum, s) => sum + s.intensity, 0) /
        activeSignals.length
      : 0;

  // 5. Run game theory analysis
  const gameTheoryAnalyses: GameTheoryAnalysis[] = SCENARIOS.map((s) =>
    analyzeScenario(s)
  );

  // Store analyses
  for (const analysis of gameTheoryAnalyses) {
    const scenario = SCENARIOS.find((s) => s.id === analysis.scenarioId);
    if (scenario) {
      await db.insert(schema.gameTheoryScenarios)
        .values({
          scenarioId: scenario.id,
          title: scenario.title,
          analysis: JSON.stringify(analysis),
        })
        ;
    }
  }

  // 6. Compute quantitative assessments
  const marketRegime = computeMarketRegime(technicalSnapshots, sentiment);
  const volatilityOutlook = computeVolatilityOutlook(
    technicalSnapshots,
    sentiment
  );
  const convergenceDensity = Math.min(10, convergenceIntensity * 2);
  const overallConfidence = await computeOverallConfidence(
    technicalSnapshots,
    gameTheoryAnalyses,
    convergenceIntensity
  );

  // 7. Derive trading actions from rules
  const tradingActions = deriveTradingActions(
    technicalSnapshots,
    sentiment,
    gameTheoryAnalyses,
    convergenceIntensity
  );

  // 8. Build layer inputs
  const layerInputs: ThesisLayerInput = {
    celestial: {
      activeEvents: celestialEvents,
      convergenceIntensity,
    },
    hebrew: {
      activeHolidays: hebrewHolidays,
      shmitaRelevance: null,
    },
    geopolitical: {
      activeEvents: geopoliticalEvents,
      escalationRisk:
        gameTheoryAnalyses.reduce(
          (max, a) =>
            Math.max(
              max,
              a.escalationLadder.reduce(
                (m, s) => Math.max(m, s.probability),
                0
              )
            ),
          0
        ),
    },
    market: {
      regime: marketRegime,
      volatilityOutlook: volatilityOutlook,
      technicalSnapshots,
      sentiment,
    },
    gameTheory: {
      activeScenarios: SCENARIOS.map((s) => s.id),
      analyses: gameTheoryAnalyses,
    },
  };

  // 9. Generate narrative via Claude
  const client = new Anthropic({ apiKey: anthropicApiKey });
  const briefingPrompt = await buildBriefingPrompt(
    layerInputs,
    tradingActions,
    marketRegime,
    volatilityOutlook,
    convergenceDensity,
    overallConfidence
  );

  const response = await client.messages.create({
    model: await getModel(),
    max_tokens: 3000,
    system: await loadPrompt("thesis_system"),
    messages: [{ role: "user", content: briefingPrompt }],
  });

  const narrativeText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse sections from narrative
  const { executiveSummary, situationAssessment, riskScenarios } =
    parseNarrativeSections(narrativeText);

  // 10. Assemble thesis
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const thesis: Thesis = {
    title: `Intelligence Briefing - ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    status: "active",
    generatedAt: new Date().toISOString(),
    validUntil,
    marketRegime,
    volatilityOutlook,
    convergenceDensity,
    overallConfidence,
    tradingActions,
    executiveSummary,
    situationAssessment,
    riskScenarios,
    layerInputs,
    symbols,
  };

  // 11. Store in DB
  const records = await db
    .insert(schema.theses)
    .values({
      title: thesis.title,
      status: thesis.status,
      validUntil: thesis.validUntil,
      marketRegime: thesis.marketRegime,
      volatilityOutlook: thesis.volatilityOutlook,
      convergenceDensity: thesis.convergenceDensity,
      overallConfidence: thesis.overallConfidence,
      tradingActions: JSON.stringify(thesis.tradingActions),
      executiveSummary: thesis.executiveSummary,
      situationAssessment: thesis.situationAssessment,
      riskScenarios: thesis.riskScenarios,
      layerInputs: JSON.stringify(thesis.layerInputs),
      symbols: JSON.stringify(thesis.symbols),
    })
    .returning();

  const record = records[0];
  thesis.id = record.id;

  // Supersede previous active theses
  const previousTheses = await db
    .select()
    .from(schema.theses)
    .where(
      and(
        eq(schema.theses.status, "active"),
      )
    );

  for (const prev of previousTheses) {
    if (prev.id !== record.id) {
      await db.update(schema.theses)
        .set({ status: "superseded" })
        .where(eq(schema.theses.id, prev.id))
        ;
    }
  }

  return thesis;
}

// ── Rule-based computations ──

function computeMarketRegime(
  snapshots: TechnicalSnapshot[],
  sentiment: MarketSentiment | null
): Thesis["marketRegime"] {
  if (snapshots.length === 0) return "transitioning";

  const bullishCount = snapshots.filter((s) => s.trend === "bullish").length;
  const bearishCount = snapshots.filter((s) => s.trend === "bearish").length;
  const ratio = bullishCount / snapshots.length;

  if (sentiment?.fearGreedLabel === "extreme_fear") return "risk_off";
  if (sentiment?.fearGreedLabel === "extreme_greed") return "risk_on";

  if (ratio > 0.6) return "risk_on";
  if (ratio < 0.4) return "risk_off";
  return "transitioning";
}

function computeVolatilityOutlook(
  snapshots: TechnicalSnapshot[],
  sentiment: MarketSentiment | null
): Thesis["volatilityOutlook"] {
  if (sentiment?.vixRegime === "panic") return "extreme";
  if (sentiment?.vixRegime === "elevated") return "elevated";
  if (sentiment?.vixRegime === "complacent") return "low";

  const highVolCount = snapshots.filter(
    (s) => s.volatilityRegime === "high" || s.volatilityRegime === "extreme"
  ).length;

  if (highVolCount > snapshots.length * 0.5) return "elevated";
  if (highVolCount === 0 && snapshots.length > 0) return "low";
  return "normal";
}

async function computeOverallConfidence(
  snapshots: TechnicalSnapshot[],
  gameTheoryAnalyses: GameTheoryAnalysis[],
  convergenceIntensity: number
): Promise<number> {
  let confidence = 0.5;

  // Higher convergence intensity = higher confidence
  confidence += convergenceIntensity * 0.05;

  // More data = higher confidence
  if (snapshots.length > 0) confidence += 0.1;

  // Game theory consensus boosts confidence
  const avgGTConfidence =
    gameTheoryAnalyses.length > 0
      ? gameTheoryAnalyses.reduce(
          (sum, a) => sum + a.marketAssessment.confidence,
          0
        ) / gameTheoryAnalyses.length
      : 0;
  confidence += avgGTConfidence * 0.2;

  // Adjust based on prediction track record (if available)
  // If predictions have been poorly calibrated, dampen thesis confidence
  try {
    const { computePerformanceReport } = require("@/lib/predictions/feedback");
    const report = await computePerformanceReport();
    if (report && report.sampleSufficient) {
      // Brier > 0.25 means worse than coin flip, reduce confidence
      // Brier < 0.15 means well-calibrated, slight boost
      if (report.brierScore > 0.3) {
        confidence *= 0.85;
      } else if (report.brierScore > 0.25) {
        confidence *= 0.92;
      } else if (report.brierScore < 0.15) {
        confidence *= 1.05;
      }
    }
  } catch {
    // feedback module not available, proceed without
  }

  return Math.max(0.1, Math.min(0.95, confidence));
}

function deriveTradingActions(
  snapshots: TechnicalSnapshot[],
  sentiment: MarketSentiment | null,
  gameTheoryAnalyses: GameTheoryAnalysis[],
  convergenceIntensity: number
): TradingAction[] {
  const actions: TradingAction[] = [];

  for (const snap of snapshots) {
    const sources: string[] = ["market"];

    // RSI oversold + high convergence = potential long
    if (snap.rsi14 !== null && snap.rsi14 < 30 && convergenceIntensity >= 3) {
      actions.push({
        ticker: snap.symbol,
        direction: "BUY",
        rationale: `RSI at ${snap.rsi14.toFixed(1)} (oversold) with convergence intensity ${convergenceIntensity.toFixed(1)}. Mean reversion setup.`,
        entryCondition: `RSI < 30 and convergence intensity >= 3`,
        riskLevel: "medium",
        confidence: 0.6,
        sources: [...sources, "convergence"],
      });
    }

    // RSI overbought + bearish game theory = potential short
    if (snap.rsi14 !== null && snap.rsi14 > 70) {
      const bearishGT = gameTheoryAnalyses.filter(
        (a) => a.marketAssessment.direction === "bearish"
      );
      if (bearishGT.length > 0) {
        actions.push({
          ticker: snap.symbol,
          direction: "SELL",
          rationale: `RSI at ${snap.rsi14.toFixed(1)} (overbought). ${bearishGT.length} game theory scenario(s) point bearish.`,
          entryCondition: `RSI > 70 and bearish game theory consensus`,
          riskLevel: "high",
          confidence: 0.5,
          sources: [...sources, "gameTheory"],
        });
      }
    }

    // Strong bullish trend + bullish MACD = hold/buy
    if (
      snap.trend === "bullish" &&
      snap.macd !== null &&
      snap.macd.histogram > 0 &&
      snap.momentum === "strong"
    ) {
      actions.push({
        ticker: snap.symbol,
        direction: "BUY",
        rationale: `Bullish trend with MACD histogram positive (${snap.macd.histogram.toFixed(2)}). Strong momentum.`,
        entryCondition: `Trend bullish, MACD histogram > 0, momentum strong`,
        riskLevel: "low",
        confidence: 0.65,
        sources,
      });
    }

    // Bearish trend + elevated volatility = reduce exposure
    if (snap.trend === "bearish" && snap.volatilityRegime === "high") {
      actions.push({
        ticker: snap.symbol,
        direction: "SELL",
        rationale: `Bearish trend with high volatility regime (ATR: ${snap.atr14?.toFixed(2) || "N/A"}). Risk management exit.`,
        entryCondition: `Trend bearish, volatility regime high`,
        riskLevel: "medium",
        confidence: 0.55,
        sources,
      });
    }

    // Bollinger Band squeeze near lower band + fear sentiment
    if (
      snap.bollingerBands !== null &&
      snap.price < snap.bollingerBands.lower * 1.02 &&
      sentiment?.fearGreedLabel === "fear"
    ) {
      actions.push({
        ticker: snap.symbol,
        direction: "BUY",
        rationale: `Price near lower Bollinger Band ($${snap.bollingerBands.lower.toFixed(2)}) with market in fear zone (F&G: ${sentiment.fearGreedComposite}). Contrarian entry.`,
        entryCondition: `Price within 2% of lower BB, fear/greed < 40`,
        riskLevel: "high",
        confidence: 0.45,
        sources: [...sources, "sentiment"],
      });
    }
  }

  // Game theory driven sector plays
  for (const analysis of gameTheoryAnalyses) {
    if (
      analysis.marketAssessment.direction === "bearish" &&
      analysis.marketAssessment.confidence > 0.5
    ) {
      for (const sector of analysis.marketAssessment.keySectors.slice(0, 2)) {
        const existingAction = actions.find(
          (a) => a.sources.includes("gameTheory") && a.rationale.includes(sector)
        );
        if (!existingAction) {
          actions.push({
            ticker: sector.toUpperCase(),
            direction: "SELL",
            rationale: `Game theory analysis "${analysis.scenarioId}" indicates bearish outcome for ${sector} sector (confidence: ${(analysis.marketAssessment.confidence * 100).toFixed(0)}%).`,
            entryCondition: `Scenario-driven sector exposure reduction`,
            riskLevel: "medium",
            confidence: analysis.marketAssessment.confidence * 0.8,
            sources: ["gameTheory"],
          });
        }
      }
    }
  }

  return actions;
}

// ── Prompt Builder ──

async function buildBriefingPrompt(
  layerInputs: ThesisLayerInput,
  tradingActions: TradingAction[],
  marketRegime: string,
  volatilityOutlook: string,
  convergenceDensity: number,
  overallConfidence: number
): Promise<string> {
  const technicalSummary = layerInputs.market.technicalSnapshots
    .map(
      (s) =>
        `${s.symbol}: Price $${s.price.toFixed(2)}, RSI ${s.rsi14?.toFixed(1) || "N/A"}, Trend ${s.trend}, Momentum ${s.momentum}, Vol ${s.volatilityRegime}${s.macd ? `, MACD hist ${s.macd.histogram.toFixed(3)}` : ""}`
    )
    .join("\n");

  const sentimentSummary = layerInputs.market.sentiment
    ? `VIX: ${layerInputs.market.sentiment.vixLevel ?? "N/A"} (${layerInputs.market.sentiment.vixRegime ?? "unknown"}), Fear/Greed: ${layerInputs.market.sentiment.fearGreedComposite} (${layerInputs.market.sentiment.fearGreedLabel})`
    : "Sentiment data unavailable";

  const gameTheorySummary = layerInputs.gameTheory.analyses
    .map(
      (a) =>
        `${a.scenarioId}: Most likely "${a.marketAssessment.mostLikelyOutcome}" (${a.marketAssessment.direction}, confidence ${(a.marketAssessment.confidence * 100).toFixed(0)}%). Nash equilibria: ${a.nashEquilibria.length}. Schelling points: ${a.schellingPoints.length}.`
    )
    .join("\n");

  const actionsSummary = tradingActions
    .map(
      (a) =>
        `${a.direction} ${a.ticker}: ${a.rationale} [confidence: ${(a.confidence * 100).toFixed(0)}%, risk: ${a.riskLevel}]`
    )
    .join("\n");

  return `Write an intelligence briefing from the following pre-computed data. Do NOT add, modify, or remove any trading actions. Explain why each action makes sense given the data.

QUANTITATIVE ASSESSMENT:
- Market Regime: ${marketRegime}
- Volatility Outlook: ${volatilityOutlook}
- Convergence Density: ${convergenceDensity.toFixed(1)}/10
- Overall Confidence: ${(overallConfidence * 100).toFixed(0)}%

MARKET TECHNICALS:
${technicalSummary || "No technical data available"}

MARKET SENTIMENT:
${sentimentSummary}

CELESTIAL EVENTS (next 14 days):
${layerInputs.celestial.activeEvents.length > 0 ? layerInputs.celestial.activeEvents.join(", ") : "None active"}

HEBREW CALENDAR:
${layerInputs.hebrew.activeHolidays.length > 0 ? layerInputs.hebrew.activeHolidays.join(", ") : "None active"}

GEOPOLITICAL EVENTS:
${layerInputs.geopolitical.activeEvents.length > 0 ? layerInputs.geopolitical.activeEvents.join(", ") : "None active"}
Escalation Risk: ${(layerInputs.geopolitical.escalationRisk * 100).toFixed(0)}%

GAME THEORY ANALYSIS:
${gameTheorySummary}

PRE-DETERMINED TRADING ACTIONS:
${actionsSummary || "No trading actions generated from current data"}

${await buildPredictionTrackRecord()}

Write the briefing with three sections:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. SITUATION ASSESSMENT (integrate all five layers into coherent narrative)
3. RISK SCENARIOS (2-3 specific scenarios that could invalidate this thesis)`;
}

async function buildPredictionTrackRecord(): Promise<string> {
  try {
    const { computePerformanceReport } = require("@/lib/predictions/feedback");
    const report = await computePerformanceReport();
    if (!report || !report.sampleSufficient) return "";

    const lines: string[] = ["PREDICTION TRACK RECORD:"];
    lines.push(`Brier score: ${report.brierScore.toFixed(3)} (${report.brierScore < 0.2 ? "good" : report.brierScore < 0.25 ? "moderate" : "poor"})`);
    lines.push(`Hit rate: ${(report.binaryAccuracy * 100).toFixed(0)}% across ${report.totalResolved} resolved predictions`);

    if (report.failurePatterns.length > 0) {
      lines.push("Known weaknesses: " + report.failurePatterns.map((fp: { pattern: string }) => fp.pattern).join("; "));
    }

    if (report.recentTrend) {
      lines.push(`Trend: ${report.recentTrend.improving ? "improving" : "declining"} (recent Brier ${report.recentTrend.recentBrier.toFixed(3)} vs prior ${report.recentTrend.priorBrier.toFixed(3)})`);
    }

    lines.push("Factor this track record into the confidence and tone of the briefing.");
    return lines.join("\n");
  } catch {
    return "";
  }
}

// ── Narrative Parser ──

function parseNarrativeSections(text: string): {
  executiveSummary: string;
  situationAssessment: string;
  riskScenarios: string;
} {
  // Try to split on section headers
  const sections = text.split(/(?:^|\n)(?:\d+\.\s*)?(?:EXECUTIVE SUMMARY|SITUATION ASSESSMENT|RISK SCENARIOS)[:\s]*/i);

  if (sections.length >= 4) {
    return {
      executiveSummary: sections[1].trim(),
      situationAssessment: sections[2].trim(),
      riskScenarios: sections[3].trim(),
    };
  }

  // Fallback: split into roughly equal parts
  const lines = text.split("\n").filter((l) => l.trim());
  const third = Math.ceil(lines.length / 3);

  return {
    executiveSummary: lines.slice(0, third).join("\n"),
    situationAssessment: lines.slice(third, third * 2).join("\n"),
    riskScenarios: lines.slice(third * 2).join("\n"),
  };
}
