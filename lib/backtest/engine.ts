import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { generateSignals } from "../signals/engine";
import { getHistoricalData } from "../market-data/yahoo";

// Unified bar type matching yahoo output
interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
import { getModel } from "@/lib/ai/model";
import type {
  BacktestConfig,
  BacktestPrediction,
  BacktestRun,
  BacktestResults,
  CalibrationBucket,
} from "./types";

// ── In-memory store for backtest runs (could use DB later) ──
const runs = new Map<string, BacktestRun>();

export function getBacktestRun(id: string): BacktestRun | undefined {
  return runs.get(id);
}

export function getAllBacktestRuns(): BacktestRun[] {
  return Array.from(runs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ── Historical price cache (persists across runs) ──
const priceCache = new Map<string, DailyBar[]>();

async function getHistoricalPrices(symbol: string): Promise<DailyBar[]> {
  if (priceCache.has(symbol)) return priceCache.get(symbol)!;

  try {
    // Yahoo Finance: no API key needed, full history available
    const data = await getHistoricalData(symbol, "5y");
    priceCache.set(symbol, data);
    return data;
  } catch (e) {
    console.error(`Failed to fetch historical data for ${symbol}:`, e);
    return [];
  }
}

function getPriceOnDate(
  bars: DailyBar[],
  targetDate: string
): DailyBar | undefined {
  // Find exact date or nearest prior trading day
  const target = new Date(targetDate).getTime();
  let closest: DailyBar | undefined;
  let closestDiff = Infinity;

  for (const bar of bars) {
    const barTime = new Date(bar.date).getTime();
    if (barTime <= target) {
      const diff = target - barTime;
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = bar;
      }
    }
  }

  // Only return if within 5 trading days
  if (closest && closestDiff <= 5 * 24 * 60 * 60 * 1000) {
    return closest;
  }
  return undefined;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── Main backtest execution ──

export async function startBacktest(config: BacktestConfig): Promise<string> {
  const id = `bt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const run: BacktestRun = {
    id,
    config,
    status: "pending",
    progress: 0,
    progressMessage: "Initialising backtest...",
    predictions: [],
    createdAt: new Date().toISOString(),
  };

  runs.set(id, run);

  // Run async - don't await
  executeBacktest(run).catch((err) => {
    run.status = "failed";
    run.error = err.message;
  });

  return id;
}

async function executeBacktest(run: BacktestRun): Promise<void> {
  const { config } = run;

  // Get Anthropic key — DB settings first, then env fallback
  const anthropicKey =
    (await getSettingValue("anthropic_api_key")) ||
    process.env.ANTHROPIC_API_KEY ||
    null;

  if (!anthropicKey) {
    throw new Error("Missing Anthropic API key (set ANTHROPIC_API_KEY in .env.local or add it in Settings)");
  }

  const client = new Anthropic({ apiKey: anthropicKey });
  const model = await getModel();

  // ── Phase 1: Collect historical market data ──
  run.status = "collecting_data";
  run.progressMessage = "Fetching historical market data...";
  run.progress = 5;

  // Fetch all instruments in parallel — Yahoo Finance has no rate limits
  const priceData: Record<string, DailyBar[]> = {};
  run.progressMessage = `Fetching historical data for ${config.instruments.length} instruments...`;
  const fetches = await Promise.allSettled(
    config.instruments.map((symbol) => getHistoricalPrices(symbol))
  );
  fetches.forEach((result, i) => {
    const symbol = config.instruments[i];
    priceData[symbol] = result.status === "fulfilled" ? result.value : [];
  });

  // ── Phase 2: Generate signals for all years ──
  run.status = "generating_signals";
  run.progress = 15;

  const startYear = new Date(config.startDate).getFullYear();
  const endYear = new Date(config.endDate).getFullYear();
  const allConvergences: Array<{
    date: string;
    intensity: number;
    layers: string[];
    description: string;
    title: string;
    category: string;
  }> = [];

  for (let year = startYear; year <= endYear; year++) {
    run.progressMessage = `Generating signals for ${year}...`;
    const result = generateSignals(year);

    for (const signal of result.signals) {
      if (signal.intensity >= config.convergenceThreshold) {
        const layers = typeof signal.layers === "string"
          ? JSON.parse(signal.layers)
          : signal.layers;

        allConvergences.push({
          date: signal.date,
          intensity: signal.intensity,
          layers,
          description: signal.description,
          title: signal.title,
          category: signal.category,
        });
      }
    }
  }

  // Sort by date
  allConvergences.sort((a, b) => a.date.localeCompare(b.date));

  // Filter to config date range
  const convergencesInRange = allConvergences.filter(
    (c) => c.date >= config.startDate && c.date <= config.endDate
  );

  run.progressMessage = `Found ${convergencesInRange.length} convergence events above threshold...`;

  // ── Phase 3: Simulate - generate predictions at each convergence ──
  run.status = "simulating";
  run.progress = 25;

  const totalSteps = convergencesInRange.length;

  for (let i = 0; i < totalSteps; i++) {
    const convergence = convergencesInRange[i];
    const pct = 25 + Math.round((i / totalSteps) * 45);
    run.progress = pct;
    run.progressMessage = `Generating prediction ${i + 1}/${totalSteps} (${convergence.date})...`;

    // Get market context up to this date only (TIME-GATED)
    const marketContext = buildMarketContext(
      priceData,
      convergence.date,
      config.instruments
    );

    // Get recent convergences before this date for context
    const priorConvergences = allConvergences
      .filter((c) => c.date < convergence.date)
      .slice(-5);

    try {
      const prediction = await generateBacktestPrediction(
        client,
        model,
        convergence,
        marketContext,
        priorConvergences,
        config.instruments,
        config.timeframes
      );

      if (prediction) {
        // Attach price at prediction time
        prediction.priceAtPrediction = {};
        for (const symbol of prediction.instruments) {
          const bars = priceData[symbol];
          if (bars) {
            const bar = getPriceOnDate(bars, convergence.date);
            if (bar) prediction.priceAtPrediction[symbol] = bar.close;
          }
        }

        run.predictions.push(prediction);
      }
    } catch (err) {
      console.error(`Prediction generation failed for ${convergence.date}:`, err);
    }

    // Rate limit Claude API
    await sleep(2000);
  }

  // ── Phase 4: Validate predictions against actual outcomes ──
  run.status = "validating";
  run.progress = 70;

  for (let i = 0; i < run.predictions.length; i++) {
    const pred = run.predictions[i];
    run.progressMessage = `Validating prediction ${i + 1}/${run.predictions.length}...`;
    run.progress = 70 + Math.round((i / run.predictions.length) * 15);

    const validationDate = addDays(pred.predictionDate, pred.timeframeDays);

    // Check we have price data for validation
    pred.priceAtValidation = {};
    pred.actualReturn = {};
    let anyValidated = false;

    for (const symbol of pred.instruments) {
      const bars = priceData[symbol];
      if (!bars) continue;

      const predBar = getPriceOnDate(bars, pred.predictionDate);
      const valBar = getPriceOnDate(bars, validationDate);

      if (predBar && valBar) {
        pred.priceAtValidation[symbol] = valBar.close;
        const ret = (valBar.close - predBar.close) / predBar.close;
        pred.actualReturn[symbol] = ret;
        anyValidated = true;
      }
    }

    if (anyValidated) {
      pred.validationDate = validationDate;

      // Determine if direction was correct
      const avgReturn = Object.values(pred.actualReturn).reduce(
        (sum, r) => sum + r,
        0
      ) / Object.values(pred.actualReturn).length;

      if (pred.direction === "bullish") {
        pred.directionCorrect = avgReturn > 0;
      } else if (pred.direction === "bearish") {
        pred.directionCorrect = avgReturn < 0;
      } else {
        // Neutral: correct if abs return < 1%
        pred.directionCorrect = Math.abs(avgReturn) < 0.01;
      }

      // Brier score: (confidence - outcome)^2
      const outcome = pred.directionCorrect ? 1 : 0;
      pred.brierScore = Math.pow(pred.confidence - outcome, 2);
      pred.outcome = pred.directionCorrect ? "confirmed" : "denied";

      // Partial: direction wrong but magnitude < 2%
      if (
        !pred.directionCorrect &&
        Math.abs(avgReturn) < 0.02
      ) {
        pred.outcome = "partial";
        pred.brierScore = Math.pow(pred.confidence - 0.5, 2);
      }
    }
  }

  // ── Phase 5: Statistical analysis ──
  run.status = "analyzing";
  run.progress = 85;
  run.progressMessage = "Computing statistical analysis...";

  const results = computeResults(run.predictions, config);

  // Generate AI analysis
  run.progressMessage = "Generating AI analysis of results...";
  try {
    results.aiAnalysis = await generateAiAnalysis(
      client,
      model,
      results,
      config
    );
  } catch (err) {
    console.error("AI analysis failed:", err);
  }

  run.results = results;
  run.status = "complete";
  run.progress = 100;
  run.progressMessage = "Backtest complete.";
  run.completedAt = new Date().toISOString();
}

// ── Build market context (time-gated) ──

function buildMarketContext(
  priceData: Record<string, DailyBar[]>,
  asOfDate: string,
  instruments: string[]
): string {
  const lines: string[] = [];

  for (const symbol of instruments) {
    const bars = priceData[symbol];
    if (!bars || bars.length === 0) continue;

    // Filter to only data before asOfDate
    const available = bars
      .filter((b) => b.date <= asOfDate)
      .sort((a, b) => b.date.localeCompare(a.date)); // most recent first

    if (available.length === 0) continue;

    const latest = available[0];
    const d30 = available.find(
      (b) => b.date <= addDays(asOfDate, -30)
    );
    const d90 = available.find(
      (b) => b.date <= addDays(asOfDate, -90)
    );

    let context = `${symbol}: $${latest.close.toFixed(2)} (${latest.date})`;

    if (d30) {
      const ret30 = ((latest.close - d30.close) / d30.close * 100).toFixed(1);
      context += ` | 30d: ${Number(ret30) >= 0 ? "+" : ""}${ret30}%`;
    }
    if (d90) {
      const ret90 = ((latest.close - d90.close) / d90.close * 100).toFixed(1);
      context += ` | 90d: ${Number(ret90) >= 0 ? "+" : ""}${ret90}%`;
    }

    lines.push(context);
  }

  return lines.join("\n");
}

// ── AI Prediction Generation (time-gated) ──

async function generateBacktestPrediction(
  client: Anthropic,
  model: string,
  convergence: {
    date: string;
    intensity: number;
    layers: string[];
    description: string;
    title: string;
    category: string;
  },
  marketContext: string,
  priorConvergences: typeof convergence[],
  instruments: string[],
  timeframes: number[]
): Promise<BacktestPrediction | null> {
  const systemPrompt = `You are a geopolitical-market analyst performing a blind backtest simulation.

CRITICAL CONSTRAINT: You are operating as if the current date is ${convergence.date}. You have ZERO knowledge of any events, prices, or outcomes after this date. You must analyse based solely on the information provided.

You are evaluating a signal convergence event and must make a directional prediction about market impact. Be specific, falsifiable, and calibrate your confidence honestly.

Respond with valid JSON only, no markdown wrapping. Schema:
{
  "claim": "A specific, falsifiable prediction",
  "direction": "bullish" | "bearish" | "neutral",
  "instruments": ["SYMBOL1", "SYMBOL2"],
  "confidence": 0.0-1.0,
  "timeframeDays": ${timeframes[0]},
  "category": "market" | "geopolitical" | "mixed",
  "reasoning": "Brief explanation grounded in the signal data"
}

Rules:
- Pick the most appropriate timeframe from: ${timeframes.join(", ")} days
- Instruments must be from: ${instruments.join(", ")}
- Confidence should reflect genuine uncertainty. 0.5 = coin flip. Use the full range.
- Direction must follow from your analysis of the convergence + market context
- Do NOT reference any events after ${convergence.date}`;

  const userPrompt = `CONVERGENCE EVENT (${convergence.date}):
Intensity: ${convergence.intensity}/5
Layers: ${convergence.layers.join(", ")}
Title: ${convergence.title}
Description: ${convergence.description}

MARKET CONTEXT (as of ${convergence.date}):
${marketContext || "No market data available for this date."}

${priorConvergences.length > 0 ? `RECENT PRIOR CONVERGENCES:
${priorConvergences.map((c) => `- ${c.date} (${c.intensity}/5): ${c.title}`).join("\n")}` : "No recent prior convergences."}

Generate a single prediction based on this convergence event.`;

  const response = await client.messages.create({
    model,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      predictionDate: convergence.date,
      convergenceDate: convergence.date,
      convergenceIntensity: convergence.intensity,
      convergenceLayers: convergence.layers,
      convergenceDescription: convergence.description,
      claim: parsed.claim,
      direction: parsed.direction,
      instruments: parsed.instruments || [instruments[0]],
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      timeframeDays: parsed.timeframeDays || timeframes[0],
      category: parsed.category || "mixed",
      reasoning: parsed.reasoning,
    };
  } catch {
    console.error("Failed to parse AI prediction:", text);
    return null;
  }
}

// ── Statistical analysis ──

function computeResults(
  predictions: BacktestPrediction[],
  config: BacktestConfig
): BacktestResults {
  const validated = predictions.filter((p) => p.outcome !== undefined);
  const n = validated.length;

  if (n === 0) {
    return emptyResults(config);
  }

  // ── Core metrics ──
  const directionalAccuracy =
    validated.filter((p) => p.directionCorrect).length / n;

  const brierScore =
    validated.reduce((sum, p) => sum + (p.brierScore || 0), 0) / n;

  const avgConfidence =
    validated.reduce((sum, p) => sum + p.confidence, 0) / n;

  // Log loss
  const logLoss =
    validated.reduce((sum, p) => {
      const y = p.directionCorrect ? 1 : 0;
      const pClip = Math.max(0.001, Math.min(0.999, p.confidence));
      return sum - (y * Math.log(pClip) + (1 - y) * Math.log(1 - pClip));
    }, 0) / n;

  const calibrationGap = Math.abs(avgConfidence - directionalAccuracy);

  // ── Random baseline (50% directional accuracy) ──
  const randomBrier = 0.25; // (0.5 - outcome)^2 averages to 0.25

  // ── Statistical significance (binomial test) ──
  // H0: true accuracy = 0.5 (random)
  // Use normal approximation to binomial
  const successes = validated.filter((p) => p.directionCorrect).length;
  const zScore = (successes - n * 0.5) / Math.sqrt(n * 0.5 * 0.5);
  const pValue = 1 - normalCDF(Math.abs(zScore)); // one-tailed

  // ── Breakdown by timeframe ──
  const byTimeframe: Record<number, { count: number; correct: number; brierSum: number; confSum: number }> = {};
  for (const p of validated) {
    const tf = p.timeframeDays;
    if (!byTimeframe[tf]) byTimeframe[tf] = { count: 0, correct: 0, brierSum: 0, confSum: 0 };
    byTimeframe[tf].count++;
    if (p.directionCorrect) byTimeframe[tf].correct++;
    byTimeframe[tf].brierSum += p.brierScore || 0;
    byTimeframe[tf].confSum += p.confidence;
  }

  // ── Breakdown by category ──
  const byCategory: Record<string, { count: number; correct: number; brierSum: number; confSum: number }> = {};
  for (const p of validated) {
    const cat = p.category;
    if (!byCategory[cat]) byCategory[cat] = { count: 0, correct: 0, brierSum: 0, confSum: 0 };
    byCategory[cat].count++;
    if (p.directionCorrect) byCategory[cat].correct++;
    byCategory[cat].brierSum += p.brierScore || 0;
    byCategory[cat].confSum += p.confidence;
  }

  // ── Breakdown by year ──
  const byYear: Record<number, { count: number; correct: number; brierSum: number; confSum: number; returnSum: number }> = {};
  for (const p of validated) {
    const year = new Date(p.predictionDate).getFullYear();
    if (!byYear[year]) byYear[year] = { count: 0, correct: 0, brierSum: 0, confSum: 0, returnSum: 0 };
    byYear[year].count++;
    if (p.directionCorrect) byYear[year].correct++;
    byYear[year].brierSum += p.brierScore || 0;
    byYear[year].confSum += p.confidence;
    const avgRet = Object.values(p.actualReturn || {}).reduce((s, r) => s + r, 0) / Math.max(1, Object.values(p.actualReturn || {}).length);
    byYear[year].returnSum += avgRet;
  }

  // ── Breakdown by instrument ──
  const byInstrument: Record<string, { count: number; correct: number; returnSum: number }> = {};
  for (const p of validated) {
    for (const sym of p.instruments) {
      if (!byInstrument[sym]) byInstrument[sym] = { count: 0, correct: 0, returnSum: 0 };
      byInstrument[sym].count++;
      if (p.directionCorrect) byInstrument[sym].correct++;
      byInstrument[sym].returnSum += p.actualReturn?.[sym] || 0;
    }
  }

  // ── Calibration curve ──
  const buckets: { min: number; max: number; label: string }[] = [
    { min: 0, max: 0.3, label: "0-30%" },
    { min: 0.3, max: 0.45, label: "30-45%" },
    { min: 0.45, max: 0.55, label: "45-55%" },
    { min: 0.55, max: 0.7, label: "55-70%" },
    { min: 0.7, max: 0.85, label: "70-85%" },
    { min: 0.85, max: 1.01, label: "85-100%" },
  ];

  const calibrationCurve: CalibrationBucket[] = buckets.map((b) => {
    const inBucket = validated.filter(
      (p) => p.confidence >= b.min && p.confidence < b.max
    );
    const correct = inBucket.filter((p) => p.directionCorrect).length;
    return {
      range: b.label,
      midpoint: (b.min + b.max) / 2,
      count: inBucket.length,
      observedFrequency: inBucket.length > 0 ? correct / inBucket.length : 0,
      expectedFrequency: (b.min + b.max) / 2,
    };
  });

  // ── Time series: cumulative accuracy ──
  const sortedPreds = [...validated].sort(
    (a, b) => a.predictionDate.localeCompare(b.predictionDate)
  );
  let cumCorrect = 0;
  const cumulativeAccuracy = sortedPreds.map((p, i) => {
    if (p.directionCorrect) cumCorrect++;
    return {
      date: p.predictionDate,
      accuracy: cumCorrect / (i + 1),
      n: i + 1,
    };
  });

  // ── Time series: Brier score over time ──
  let brierRunningSum = 0;
  const brierOverTime = sortedPreds.map((p, i) => {
    brierRunningSum += p.brierScore || 0;
    // Rolling 30-prediction Brier
    const window = sortedPreds.slice(Math.max(0, i - 29), i + 1);
    const rolling = window.reduce((s, w) => s + (w.brierScore || 0), 0) / window.length;
    return {
      date: p.predictionDate,
      brier: brierRunningSum / (i + 1),
      rolling30: rolling,
    };
  });

  // ── Hypothetical P&L ──
  // Simple: if prediction correct, gain = abs(avgReturn), else loss = abs(avgReturn)
  let cumulativePnl = 0;
  let tradeCount = 0;
  const hypotheticalPnl = sortedPreds.map((p) => {
    const avgRet = Object.values(p.actualReturn || {}).reduce(
      (s, r) => s + r, 0
    ) / Math.max(1, Object.values(p.actualReturn || {}).length);

    // Scale by confidence (bet sizing)
    const positionSize = p.confidence;
    if (p.directionCorrect) {
      cumulativePnl += Math.abs(avgRet) * positionSize;
    } else {
      cumulativePnl -= Math.abs(avgRet) * positionSize;
    }
    tradeCount++;

    return {
      date: p.predictionDate,
      pnl: cumulativePnl * 100, // as percentage
      trades: tradeCount,
    };
  });

  const startDate = config.startDate;
  const endDate = config.endDate;
  const yearsSpanned =
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  return {
    totalPredictions: predictions.length,
    totalValidated: n,
    dateRange: { start: startDate, end: endDate },
    yearsSpanned: Math.round(yearsSpanned * 10) / 10,

    directionalAccuracy,
    brierScore,
    logLoss,
    avgConfidence,
    calibrationGap,

    randomBaseline: {
      directionalAccuracy: 0.5,
      brierScore: randomBrier,
    },

    pValue,
    significant: pValue < 0.05,

    byTimeframe: Object.fromEntries(
      Object.entries(byTimeframe).map(([k, v]) => [
        k,
        {
          count: v.count,
          directionalAccuracy: v.correct / v.count,
          brierScore: v.brierSum / v.count,
          avgConfidence: v.confSum / v.count,
        },
      ])
    ),

    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [
        k,
        {
          count: v.count,
          directionalAccuracy: v.correct / v.count,
          brierScore: v.brierSum / v.count,
          avgConfidence: v.confSum / v.count,
        },
      ])
    ),

    byYear: Object.fromEntries(
      Object.entries(byYear).map(([k, v]) => [
        k,
        {
          count: v.count,
          directionalAccuracy: v.correct / v.count,
          brierScore: v.brierSum / v.count,
          avgConfidence: v.confSum / v.count,
          hypotheticalReturn: v.returnSum * 100,
        },
      ])
    ),

    byInstrument: Object.fromEntries(
      Object.entries(byInstrument).map(([k, v]) => [
        k,
        {
          count: v.count,
          directionalAccuracy: v.correct / v.count,
          avgReturn: (v.returnSum / v.count) * 100,
          winRate: v.correct / v.count,
        },
      ])
    ),

    calibrationCurve,
    cumulativeAccuracy,
    brierOverTime,
    hypotheticalPnl,
  };
}

function emptyResults(config: BacktestConfig): BacktestResults {
  return {
    totalPredictions: 0,
    totalValidated: 0,
    dateRange: { start: config.startDate, end: config.endDate },
    yearsSpanned: 0,
    directionalAccuracy: 0,
    brierScore: 0,
    logLoss: 0,
    avgConfidence: 0,
    calibrationGap: 0,
    randomBaseline: { directionalAccuracy: 0.5, brierScore: 0.25 },
    pValue: 1,
    significant: false,
    byTimeframe: {},
    byCategory: {},
    byYear: {},
    byInstrument: {},
    calibrationCurve: [],
    cumulativeAccuracy: [],
    brierOverTime: [],
    hypotheticalPnl: [],
  };
}

// ── AI analysis of results ──

async function generateAiAnalysis(
  client: Anthropic,
  model: string,
  results: BacktestResults,
  config: BacktestConfig
): Promise<string> {
  const prompt = `You are writing an academic-quality analysis of a backtesting study for a signal convergence intelligence platform.

BACKTEST CONFIGURATION:
- Date range: ${config.startDate} to ${config.endDate} (${results.yearsSpanned} years)
- Instruments: ${config.instruments.join(", ")}
- Convergence threshold: ${config.convergenceThreshold}/5
- Timeframes: ${config.timeframes.join(", ")} days
- Signal layers: ${config.layers.join(", ")}

RESULTS:
- Total predictions generated: ${results.totalPredictions}
- Total validated: ${results.totalValidated}
- Directional accuracy: ${(results.directionalAccuracy * 100).toFixed(1)}%
- Brier score: ${results.brierScore.toFixed(4)} (random baseline: ${results.randomBaseline.brierScore.toFixed(4)})
- Log loss: ${results.logLoss.toFixed(4)}
- Average confidence: ${(results.avgConfidence * 100).toFixed(1)}%
- Calibration gap: ${(results.calibrationGap * 100).toFixed(1)}pp
- p-value (vs random): ${results.pValue.toFixed(6)}
- Statistically significant: ${results.significant ? "Yes (p < 0.05)" : "No"}

BY TIMEFRAME:
${Object.entries(results.byTimeframe).map(([k, v]) => `  ${k}d: ${(v.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${v.brierScore.toFixed(3)}, n=${v.count}`).join("\n")}

BY CATEGORY:
${Object.entries(results.byCategory).map(([k, v]) => `  ${k}: ${(v.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${v.brierScore.toFixed(3)}, n=${v.count}`).join("\n")}

BY YEAR:
${Object.entries(results.byYear).map(([k, v]) => `  ${k}: ${(v.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${v.brierScore.toFixed(3)}, n=${v.count}`).join("\n")}

CALIBRATION:
${results.calibrationCurve.map((b) => `  ${b.range}: expected ${(b.expectedFrequency * 100).toFixed(0)}%, observed ${(b.observedFrequency * 100).toFixed(0)}% (n=${b.count})`).join("\n")}

Write a structured analysis with these sections:
1. EXECUTIVE SUMMARY - 2-3 sentences on headline findings
2. METHODOLOGY VALIDATION - Assess the scientific rigor (time-gating, sample size, statistical significance)
3. PERFORMANCE ANALYSIS - Interpret the accuracy, Brier score, and calibration metrics in academic context
4. TEMPORAL CONSISTENCY - Comment on year-over-year stability
5. CATEGORY INSIGHTS - Which signal categories perform best/worst
6. LIMITATIONS AND CAVEATS - Honest assessment of methodological limitations
7. CONCLUSIONS - Final assessment of predictive capability

Use precise, academic language. Be honest about both strengths and weaknesses. Reference specific numbers. Do not overstate findings.`;

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ── Helpers ──

function normalCDF(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key));
    return rows.length > 0 ? rows[0].value : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
